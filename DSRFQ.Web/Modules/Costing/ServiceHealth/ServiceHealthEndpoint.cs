using Microsoft.AspNetCore.Mvc;

namespace DSRFQ.Costing.Endpoints;

public class ServiceHealthServiceItem
{
    public string Key { get; set; }
    public string Name { get; set; }
    public string Purpose { get; set; }
    /// <summary>up, slow, down, unknown (not probed yet)</summary>
    public string State { get; set; }
    public int? LatencyMs { get; set; }
    public string Detail { get; set; }
    public DateTime? CheckedAt { get; set; }
    public DateTime? LastUpAt { get; set; }
    public string[] RequiredBy { get; set; }
    public string[] ImprovesStages { get; set; }
    /// <summary>Share of the samples in the history window that were up or slow, 0-100.</summary>
    public double? UptimePercent { get; set; }
    public List<ServiceHealthMonitor.Sample> History { get; set; }
}

public class ServiceHealthStageItem
{
    /// <summary>drawing, costing, ballooning</summary>
    public string Stage { get; set; }
    /// <summary>ready, degraded (runs, loses part of its result), blocked (a required service is down), unknown</summary>
    public string State { get; set; }
    public List<string> Blocking { get; set; } = [];
    public List<string> Degrading { get; set; } = [];
}

public class ServiceHealthResponse : ServiceResponse
{
    public DateTime Now { get; set; }
    public int IntervalSeconds { get; set; }
    public List<ServiceHealthServiceItem> Services { get; set; }
    public List<ServiceHealthStageItem> Stages { get; set; }
}

public class ServiceHealthRequest : ServiceRequest
{
    /// <summary>Leave out the hour of samples - enough for the upload dialog.</summary>
    public bool WithoutHistory { get; set; }
}

/// <summary>
/// Is each pipeline stage able to run right now, and the history behind that.
/// </summary>
[Route("Services/Costing/ServiceHealth/[action]")]
[ConnectionKey("Default"), ServiceAuthorize]
public class ServiceHealthEndpoint : ServiceEndpoint
{
    private static readonly string[] StageOrder = ["drawing", "costing", "ballooning"];

    [HttpPost]
    public async Task<ServiceHealthResponse> Current(ServiceHealthRequest request,
        [FromServices] ServiceHealthMonitor monitor)
    {
        var snapshot = monitor.Snapshot();
        // Straight after start-up nothing has been probed; answer with a real
        // reading rather than "unknown" for the first ten seconds.
        if (snapshot.All(s => s.CheckedAt is null))
        {
            await monitor.ProbeAllAsync(HttpContext.RequestAborted);
            snapshot = monitor.Snapshot();
        }

        var services = snapshot.Select(s => new ServiceHealthServiceItem
        {
            Key = s.Definition.Key,
            Name = s.Definition.Name,
            Purpose = s.Definition.Purpose,
            State = s.State,
            LatencyMs = s.LatencyMs,
            Detail = s.Detail,
            CheckedAt = s.CheckedAt,
            LastUpAt = s.LastUpAt,
            RequiredBy = s.Definition.RequiredBy ?? [],
            ImprovesStages = s.Definition.ImprovesStages ?? [],
            UptimePercent = s.History.Count == 0 ? null
                : Math.Round(100.0 * s.History.Count(h => h.State != "down") / s.History.Count, 1),
            History = request?.WithoutHistory == true ? null : s.History,
        }).ToList();

        var stages = StageOrder.Select(stage =>
        {
            var item = new ServiceHealthStageItem { Stage = stage };
            var required = services.Where(s => s.RequiredBy.Contains(stage)).ToList();
            var optional = services.Where(s => s.ImprovesStages.Contains(stage)).ToList();
            item.Blocking = required.Where(s => s.State == "down").Select(s => s.Name).ToList();
            item.Degrading = optional.Where(s => s.State == "down").Select(s => s.Name).ToList();
            item.State = required.Any(s => s.State == "unknown") ? "unknown"
                : item.Blocking.Count > 0 ? "blocked"
                : item.Degrading.Count > 0 ? "degraded"
                : "ready";
            return item;
        }).ToList();

        return new ServiceHealthResponse
        {
            Now = DateTime.UtcNow,
            IntervalSeconds = (int)ServiceHealthMonitor.Interval.TotalSeconds,
            Services = services,
            Stages = stages,
        };
    }
}
