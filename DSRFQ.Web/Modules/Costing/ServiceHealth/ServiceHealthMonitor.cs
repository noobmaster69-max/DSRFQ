using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Text.Json;
using System.Threading;

namespace DSRFQ.Costing;

/// <summary>
/// Watches the services the upload pipeline depends on, from the server.
/// </summary>
/// <remarks>
/// An upload can tick Drawing, Costing and Ballooning, but nothing told the
/// operator that the service a stage needs was down - the part simply sat
/// "Pending" in the queue. This probes each dependency every
/// <see cref="Interval"/> and keeps an hour of results, so the upload dialog can
/// say which stage is ready and the Service Status page can chart it.
///
/// Probed from the web server rather than the browser: every service listens on
/// the server's localhost, which a remote browser cannot reach, and one set of
/// probes serves every user instead of one per open page.
///
/// The list is configurable (appsettings "ServiceHealth:Services"); the defaults
/// are the single-box install this deploys as.
/// </remarks>
public sealed class ServiceHealthMonitor(IConfiguration config, ILogger<ServiceHealthMonitor> log) : BackgroundService
{
    public static readonly TimeSpan Interval = TimeSpan.FromSeconds(10);
    /// <summary>One hour at the default interval.</summary>
    public const int HistoryLength = 360;
    /// <summary>A probe slower than this still counts as up, but is reported slow.</summary>
    public const int SlowMs = 2000;

    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(5) };

    private readonly ConcurrentDictionary<string, ServiceState> states = new();

    public sealed class ServiceDefinition
    {
        public string Key { get; set; }
        public string Name { get; set; }
        /// <summary>What it does, in the operator's terms.</summary>
        public string Purpose { get; set; }
        /// <summary>"http" (any answer below 500), "tcp" (port open), "rabbit-consumers" or "ollama-model".</summary>
        public string Kind { get; set; }
        /// <summary>
        /// URL for http, host:port for tcp, comma-separated queue names for
        /// rabbit-consumers, "url|model" for ollama-model.
        /// </summary>
        public string Target { get; set; }
        /// <summary>Stages that cannot run without it: drawing, costing, ballooning.</summary>
        public string[] RequiredBy { get; set; } = [];
        /// <summary>Stages that run without it, but lose part of their result.</summary>
        public string[] ImprovesStages { get; set; } = [];
    }

    public sealed class Sample
    {
        public DateTime At { get; set; }
        /// <summary>up, slow, down</summary>
        public string State { get; set; }
        public int? Ms { get; set; }
    }

    public sealed class ServiceState
    {
        public ServiceDefinition Definition { get; set; }
        public string State { get; set; } = "unknown";
        public int? LatencyMs { get; set; }
        public string Detail { get; set; }
        public DateTime? CheckedAt { get; set; }
        public DateTime? LastUpAt { get; set; }
        public List<Sample> History { get; } = [];
    }

    public IReadOnlyList<ServiceDefinition> Definitions => LoadDefinitions();

    /// <summary>A consistent copy of every service's state and history.</summary>
    public List<ServiceState> Snapshot()
    {
        var result = new List<ServiceState>();
        foreach (var def in Definitions)
        {
            if (!states.TryGetValue(def.Key, out var s))
            {
                result.Add(new ServiceState { Definition = def });
                continue;
            }
            lock (s)
            {
                var copy = new ServiceState
                {
                    Definition = s.Definition, State = s.State, LatencyMs = s.LatencyMs,
                    Detail = s.Detail, CheckedAt = s.CheckedAt, LastUpAt = s.LastUpAt,
                };
                copy.History.AddRange(s.History);
                result.Add(copy);
            }
        }
        return result;
    }

    /// <summary>Probe everything now, for a caller that cannot wait for the next tick.</summary>
    public Task ProbeAllAsync(CancellationToken ct = default) =>
        Task.WhenAll(Definitions.Select(d => ProbeAsync(d, ct)));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProbeAllAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogWarning(ex, "Service health probe round failed");
            }
            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task ProbeAsync(ServiceDefinition def, CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        string state, detail = null;
        try
        {
            detail = def.Kind switch
            {
                "tcp" => await ProbeTcpAsync(def.Target, ct),
                "amqp" => await ProbeAmqpAsync(def.Target, ct),
                "rabbit-consumers" => await ProbeRabbitConsumersAsync(def.Target, ct),
                "ollama-model" => await ProbeOllamaModelAsync(def.Target, ct),
                "http-expect" => await ProbeHttpExpectAsync(def.Target, ct),
                _ => await ProbeHttpAsync(def.Target, ct),
            };
            sw.Stop();
            state = sw.ElapsedMilliseconds > SlowMs ? "slow" : "up";
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            sw.Stop();
            state = "down";
            detail = ex is TaskCanceledException or OperationCanceledException
                ? "no answer within 5 seconds"
                : ex.InnerException?.Message ?? ex.Message;
        }

        var now = DateTime.UtcNow;
        var s = states.GetOrAdd(def.Key, _ => new ServiceState());
        lock (s)
        {
            s.Definition = def;
            s.State = state;
            s.LatencyMs = state == "down" ? null : (int)sw.ElapsedMilliseconds;
            s.Detail = detail;
            s.CheckedAt = now;
            if (state != "down") s.LastUpAt = now;
            s.History.Add(new Sample { At = now, State = state, Ms = s.LatencyMs });
            if (s.History.Count > HistoryLength)
                s.History.RemoveRange(0, s.History.Count - HistoryLength);
        }
    }

    private static async Task<string> ProbeHttpAsync(string url, CancellationToken ct)
    {
        using var res = await Http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        if ((int)res.StatusCode >= 500)
            throw new InvalidOperationException($"answered HTTP {(int)res.StatusCode}");
        return null;
    }

    /// <summary>
    /// The broker answers the AMQP 0-9-1 protocol header with connection.start.
    /// </summary>
    /// <remarks>
    /// A port that accepts connections is not a broker. Sends the eight-byte
    /// protocol header and waits for the first frame back: a method frame
    /// (type 1) means RabbitMQ is really there and talking. Closes without
    /// completing the handshake, which the broker logs as a client that went
    /// away - harmless, and far cheaper than opening a real connection every
    /// ten seconds.
    /// </remarks>
    private static async Task<string> ProbeAmqpAsync(string target, CancellationToken ct)
    {
        var parts = target.Split(':');
        using var client = new TcpClient();
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(5));
        await client.ConnectAsync(parts[0], int.Parse(parts[1], CultureInfo.InvariantCulture), timeout.Token);
        var stream = client.GetStream();
        await stream.WriteAsync("AMQP\0\0\u0009\u0001"u8.ToArray(), timeout.Token);
        var first = new byte[1];
        int read;
        try
        {
            read = await stream.ReadAsync(first, timeout.Token);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            throw new InvalidOperationException(
                "accepts connections but never answers - not the broker (another program on this port?)");
        }
        if (read == 1 && first[0] == 1)
            return null;
        throw new InvalidOperationException(read == 0
            ? "closed the connection without answering"
            : $"answered, but not as AMQP (first byte {first[0]})");
    }

    private static async Task<string> ProbeTcpAsync(string target, CancellationToken ct)
    {
        var parts = target.Split(':');
        using var client = new TcpClient();
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(5));
        await client.ConnectAsync(parts[0], int.Parse(parts[1], CultureInfo.InvariantCulture), timeout.Token);
        return null;
    }

    /// <summary>
    /// The URL answers AND the answer is from the service we expect.
    /// </summary>
    /// <remarks>
    /// Target is "url|text". A plain "http" probe only proves something is
    /// listening. On 21 Sep 2026 another project started a web app on 8000,
    /// whose front end answers every GET - /health included - with its
    /// index.html. The RPA API was not running at all, this page showed it
    /// green, and every ballooning job failed with HTTP 405.
    /// </remarks>
    private static async Task<string> ProbeHttpExpectAsync(string target, CancellationToken ct)
    {
        var parts = target.Split('|', 2);
        using var res = await Http.GetAsync(parts[0], ct);
        if ((int)res.StatusCode >= 500)
            throw new InvalidOperationException($"answered HTTP {(int)res.StatusCode}");
        if (parts.Length < 2 || string.IsNullOrEmpty(parts[1]))
            return null;
        var body = await res.Content.ReadAsStringAsync(ct);
        if (body.Contains(parts[1], StringComparison.Ordinal))
            return null;
        var title = System.Text.RegularExpressions.Regex.Match(body, "<title>([^<]{1,80})</title>",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase).Groups[1].Value.Trim();
        throw new InvalidOperationException(
            "something else is answering on this port" +
            (title.Length > 0 ? $" (\"{title}\")" : "") +
            " - stop it or move it to another port, then start this service");
    }

    /// <summary>
    /// Ollama is up AND the model we need is actually pulled.
    /// </summary>
    /// <remarks>
    /// Checking only that the port answers is how this went wrong: Ollama was
    /// running with no models at all, /api/tags returned 200 with an empty list,
    /// the page showed green, and every drawing came back with a blank title
    /// block. A server with none of the weights it is asked for is down for our
    /// purposes.
    ///
    /// Target is "url|model". The tag is matched loosely, so "qwen2.5vl:7b"
    /// accepts "qwen2.5vl:7b-q4_K_M" - a re-quantised pull of the same model is
    /// still the model.
    /// </remarks>
    private static async Task<string> ProbeOllamaModelAsync(string target, CancellationToken ct)
    {
        var parts = target.Split('|', 2);
        var url = parts[0];
        var wanted = parts.Length > 1 ? parts[1].Trim() : null;

        using var res = await Http.GetAsync(url, ct);
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"answered HTTP {(int)res.StatusCode}");
        if (string.IsNullOrEmpty(wanted))
            return null;

        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
        var names = doc.RootElement.TryGetProperty("models", out var models) && models.ValueKind == JsonValueKind.Array
            ? models.EnumerateArray()
                .Select(m => m.TryGetProperty("name", out var n) ? n.GetString() : null)
                .Where(n => !string.IsNullOrEmpty(n)).ToList()
            : [];

        var stem = wanted.Split(':')[0];
        if (names.Any(n => n == wanted || n.StartsWith(wanted, StringComparison.OrdinalIgnoreCase)
                                       || n.StartsWith(stem + ":", StringComparison.OrdinalIgnoreCase)))
            return names.Count == 1 ? null : $"{names.Count} model(s) installed";

        throw new InvalidOperationException(
            names.Count == 0
                ? $"running, but no models are installed - run: ollama pull {wanted}"
                : $"running, but {wanted} is not installed (has {string.Join(", ", names.Take(4))}) " +
                  $"- run: ollama pull {wanted}");
    }

    /// <summary>
    /// The RFQ consumer has no port of its own; it is running when RabbitMQ has a
    /// consumer attached to the queues it serves. Read from the management API.
    /// </summary>
    private async Task<string> ProbeRabbitConsumersAsync(string queues, CancellationToken ct)
    {
        // 127.0.0.1 for the same reason as the broker itself: ::1:15672 is
        // wslrelay's too, and would make the consumer look down.
        var api = (config["ServiceHealth:RabbitManagementUrl"] ?? "http://127.0.0.1:15672").TrimEnd('/');
        var user = config["ServiceHealth:RabbitUser"] ?? "guest";
        var pass = config["ServiceHealth:RabbitPassword"] ?? "guest";
        var missing = new List<string>();
        foreach (var queue in queues.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{api}/api/queues/%2F/{Uri.EscapeDataString(queue)}");
            req.Headers.Authorization = new AuthenticationHeaderValue("Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{user}:{pass}")));
            using var res = await Http.SendAsync(req, ct);
            if (res.StatusCode == System.Net.HttpStatusCode.NotFound) { missing.Add(queue); continue; }
            res.EnsureSuccessStatusCode();
            using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
            var consumers = doc.RootElement.TryGetProperty("consumers", out var c) && c.ValueKind == JsonValueKind.Number
                ? c.GetInt32() : 0;
            if (consumers == 0) missing.Add(queue);
        }
        if (missing.Count > 0)
            throw new InvalidOperationException("nothing is listening on " + string.Join(", ", missing));
        return null;
    }

    private List<ServiceDefinition> LoadDefinitions()
    {
        var configured = config.GetSection("ServiceHealth:Services").Get<List<ServiceDefinition>>();
        return configured is { Count: > 0 } ? configured : DefaultDefinitions;
    }

    /// <summary>The single-box install: every service on this machine's localhost.</summary>
    private static readonly List<ServiceDefinition> DefaultDefinitions =
    [
        // An AMQP handshake, not just a TCP connect, and to 127.0.0.1 - the
        // same address the upload publishes to (RabbitMqConnection). A TCP
        // probe of localhost:5672 stayed green while every upload failed: ::1
        // was answered by wslrelay, which accepts connections and never speaks.
        new() { Key = "rabbitmq", Name = "Message queue (RabbitMQ)", Kind = "amqp", Target = "127.0.0.1:5672",
                Purpose = "Hands each uploaded part to the processing service",
                RequiredBy = ["drawing", "costing", "ballooning"] },
        new() { Key = "consumer", Name = "RFQ Consumer", Kind = "rabbit-consumers",
                Target = "NewCostingParts,Costing,Ballooning",
                Purpose = "Runs every stage: conversion, costing, ballooning",
                RequiredBy = ["drawing", "costing", "ballooning"] },
        new() { Key = "title-block", Name = "Title block reader (3600)", Kind = "tcp", Target = "localhost:3600",
                Purpose = "Reads the title block and notes, converts the drawing",
                RequiredBy = ["drawing"] },
        new() { Key = "costing-engine", Name = "Costing engine (8888)", Kind = "http", Target = "http://localhost:8888/health",
                Purpose = "Analyses the 3D model and prices the part",
                RequiredBy = ["costing"] },
        new() { Key = "rpa-api", Name = "RPA API (8000)", Kind = "http-expect",
                Target = "http://localhost:8000/health|registered_endpoints",
                Purpose = "Sends drawings to the ballooning model",
                RequiredBy = ["ballooning"] },
        new() { Key = "ballooning-model", Name = "Ballooning model (5999)", Kind = "tcp", Target = "localhost:5999",
                Purpose = "Finds dimensions, tolerances and notes on the drawing",
                RequiredBy = ["ballooning"] },
        // Required by drawing, not merely an improvement to it, since the title
        // block reader moved off the hosted vision model on 18 Sep 2026. It now
        // reads the title block AND the parts list, so with this down a drawing
        // comes back with no part number, revision, description or material -
        // the whole point of the stage.
        new() { Key = "vision-model", Name = "Vision model (Ollama)", Kind = "ollama-model",
                Target = "http://localhost:11434/api/tags|qwen2.5vl:7b",
                Purpose = "Reads the title block and the parts list (BOM) off the drawing",
                RequiredBy = ["drawing"] },
    ];
}
