using Serenity.Services;
using System.Collections.Generic;

namespace DSRFQ.Costing;

/// <summary>Acts on one row of the processing queue.</summary>
public class QueueItemRequest : ServiceRequest
{
    public int QueueItemId { get; set; }
}

public class QueueItemResponse : ServiceResponse
{
    /// <summary>What happened, phrased for a toast.</summary>
    public string Message { get; set; }
}

/// <summary>
/// One lane's headline numbers, for the strip above the grid.
/// </summary>
public class QueueLaneSummary
{
    public string Lane { get; set; }
    public int Running { get; set; }
    public int Queued { get; set; }
    /// <summary>Failed jobs still inside the consumer's history window.</summary>
    public int Failed { get; set; }
    /// <summary>
    /// How long the job at the front of this lane has been waiting, in seconds.
    /// The number that says whether the queue is moving.
    /// </summary>
    public int? OldestWaitSeconds { get; set; }
    /// <summary>Part number of what is running now, if anything is.</summary>
    public string RunningPart { get; set; }
    /// <summary>How long the running job has been going, in seconds.</summary>
    public int? RunningSeconds { get; set; }
}

public class QueueSummaryResponse : ServiceResponse
{
    public List<QueueLaneSummary> Lanes { get; set; }
    /// <summary>
    /// True when nothing has been admitted for a while but work is waiting --
    /// which almost always means the RFQ consumer is not running.
    /// </summary>
    public bool ConsumerLooksDown { get; set; }
}
