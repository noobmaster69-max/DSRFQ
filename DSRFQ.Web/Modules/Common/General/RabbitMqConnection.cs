using Microsoft.Extensions.Configuration;
using RabbitMQ.Client;

namespace DSRFQ.Modules.Common.General;

/// <summary>
/// Where DSRFQ publishes to RabbitMQ. One place, so the host is not repeated
/// as a literal in every endpoint that queues work.
/// </summary>
/// <remarks>
/// 127.0.0.1, NOT "localhost". On Windows "localhost" resolves to ::1 first,
/// and on this machine ::1:5672 is held by wslrelay (WSL's localhost
/// forwarder), not by the broker. It accepts the TCP connection and then never
/// answers, so the client waits for the broker's connection.start, times out,
/// and every upload failed with "None of the specified endpoints were
/// reachable" while the broker itself was running and healthy on IPv4 the
/// whole time (21 Sep 2026). Docker publishes the broker on 0.0.0.0, so the
/// IPv4 loopback always reaches it.
///
/// Override with "RabbitMQ:HostName" in appsettings for a broker elsewhere.
/// </remarks>
public static class RabbitMqConnection
{
    public const string DefaultHost = "127.0.0.1";

    public static string HostName { get; private set; } = DefaultHost;

    /// <summary>Called once at startup.</summary>
    public static void Configure(IConfiguration config)
    {
        var host = config?["RabbitMQ:HostName"];
        HostName = string.IsNullOrWhiteSpace(host) ? DefaultHost : host.Trim();
    }

    public static ConnectionFactory Factory() => new()
    {
        HostName = HostName,
        // Fail fast rather than hold the upload request for the client's
        // default 30 s when the broker is down.
        RequestedConnectionTimeout = TimeSpan.FromSeconds(5),
        SocketReadTimeout = TimeSpan.FromSeconds(10),
        SocketWriteTimeout = TimeSpan.FromSeconds(10),
        HandshakeContinuationTimeout = TimeSpan.FromSeconds(10),
    };
}
