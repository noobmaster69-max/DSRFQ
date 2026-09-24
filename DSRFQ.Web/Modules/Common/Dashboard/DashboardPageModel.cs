using System.Collections.Generic;

namespace DSRFQ.Common;

/// <summary>
/// Everything the dashboard draws, computed server-side in one request.
/// </summary>
/// <remarks>
/// The dashboard is a read-only view over the costing pipeline, so the whole
/// model is assembled in <see cref="Pages.DashboardPage"/> and shipped inline
/// with the page rather than fetched by the client afterwards. It is a handful
/// of GROUP BY queries over tables that hold hundreds of rows, not millions;
/// an endpoint per card would cost more round trips than it saves.
/// </remarks>
[ScriptInclude]
public class DashboardPageModel
{
    // --- headline numbers (the KPI row) ---

    public int PartCount { get; set; }
    public int StageRuns { get; set; }

    /// <summary>Percent of stage runs that finished, of those that finished or failed.</summary>
    public double StageSuccessRate { get; set; }

    /// <summary>Median wall-clock seconds a part spends across all its stages.</summary>
    public int MedianTurnaroundSeconds { get; set; }

    public decimal QuotedValue { get; set; }
    public int OpenJobs { get; set; }
    public int FailedJobs { get; set; }

    // --- charts ---

    public List<StageDuration> StageDurations { get; set; } = [];
    public List<PipelineStepStatus> PipelineSteps { get; set; } = [];
    public List<LaneOutcome> LaneOutcomes { get; set; } = [];
    public List<CostCategory> CostBreakdown { get; set; } = [];
    public List<PipelineFailure> RecentFailures { get; set; } = [];
}

/// <summary>Average and worst time for one pipeline stage.</summary>
[ScriptInclude]
public class StageDuration
{
    public string Stage { get; set; }
    public double AvgSeconds { get; set; }
    public double MaxSeconds { get; set; }
    public int Runs { get; set; }
}

/// <summary>
/// How the parts are distributed across one pipeline step's statuses.
/// </summary>
/// <remarks>
/// The four steps live in four columns on CostingParts rather than in a status
/// table, so this is unpivoted in SQL. Counts are of parts, not of job runs --
/// a part retried three times still counts once, under its current status.
/// </remarks>
[ScriptInclude]
public class PipelineStepStatus
{
    public string Step { get; set; }
    public int Completed { get; set; }
    public int Pending { get; set; }
    public int Failed { get; set; }

    /// <summary>Parts the step cannot apply to -- no drawing to work from.</summary>
    public int NotApplicable { get; set; }
}

/// <summary>Queue job outcomes for one lane.</summary>
[ScriptInclude]
public class LaneOutcome
{
    public string Lane { get; set; }
    public int Completed { get; set; }
    public int Failed { get; set; }
    public int Open { get; set; }
}

/// <summary>One line of the quote, summed across every part.</summary>
[ScriptInclude]
public class CostCategory
{
    public string Name { get; set; }
    public decimal Total { get; set; }
    public int Lines { get; set; }
}

/// <summary>A stage or queue job that failed, for the failures table.</summary>
[ScriptInclude]
public class PipelineFailure
{
    public int CostingPartId { get; set; }
    public string PartNumber { get; set; }
    public string Stage { get; set; }
    public string Detail { get; set; }
    public string When { get; set; }
}
