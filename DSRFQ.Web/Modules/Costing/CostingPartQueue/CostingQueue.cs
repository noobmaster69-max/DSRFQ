using Serenity.Data;
using System;
using System.Data;

namespace DSRFQ.Costing;

/// <summary>
/// Puts work on the pipeline's admission queue.
/// </summary>
/// <remarks>
/// DSRFQ writes the queue row itself, rather than leaving it to the consumer,
/// so the Processing Queue page shows an uploaded part immediately -- including
/// when the consumer is down, which is exactly when someone goes looking for
/// the page. The consumer's queue_store.enqueue reuses whatever row it finds
/// for the same part and lane, so the two never double up.
/// </remarks>
public static class CostingQueue
{
    public const string LaneDrawing = "drawing";
    public const string LaneCosting = "costing";
    public const string LaneBallooning = "ballooning";

    /// <summary>The lanes in pipeline order, as the page lists them.</summary>
    public static readonly string[] Lanes = { LaneDrawing, LaneCosting, LaneBallooning };

    /// <summary>
    /// Which lane a RabbitMQ queue is admitted through. Must agree with
    /// LANE_OF_QUEUE in RFQ/queue_store.py -- a name missing here would be
    /// enqueued by the consumer but invisible to the page until then.
    /// </summary>
    public static string LaneForQueue(string queueName) => queueName switch
    {
        "NewCostingParts" => LaneDrawing,
        "RetryOcr" => LaneDrawing,
        "Costing" => LaneCosting,
        "Ballooning" => LaneBallooning,
        _ => null
    };

    /// <summary>
    /// Queues a part, or returns the id of the job already waiting for it.
    /// </summary>
    /// <remarks>
    /// One active job per part per lane. A second one would be handed to the
    /// consumer as a separate run against the same part, and two runs writing
    /// the same results is how a part ends up with duplicated cost lines.
    ///
    /// Never throws: a queue row that could not be written is a page that is
    /// missing a line, not an upload that should fail. The consumer enqueues
    /// the same job again when the RabbitMQ message reaches it.
    /// </remarks>
    /// <param name="payload">
    /// The message body the consumer should run this job with, where it is more
    /// than the bare part id - today that means {"Id":n,"Page":p} for a
    /// single-page ballooning run.
    ///
    /// This row is written BEFORE the message is published, and the consumer's
    /// own enqueue keeps whichever row it finds rather than adding a second. So
    /// a row written without the payload silently discards the scope: the
    /// consumer would find this row, drop its own {"Id","Page"} message on the
    /// floor, and the dispatcher would start a whole-document run from a bare
    /// part id. "This Page" then cleared one page and rebuilt them all.
    /// </param>
    public static int? Enqueue(IDbConnection connection, int costingPartId,
        string queueName, int priority = 100, string payload = null)
    {
        var lane = LaneForQueue(queueName);
        if (lane == null || costingPartId <= 0)
            return null;

        try
        {
            var existing = connection.Query<int>(
                "SELECT TOP 1 ID FROM dbo.CostingPartQueue " +
                "WHERE CostingPartID = @partId AND Lane = @lane AND IsActive = 1 " +
                "  AND Status IN ('queued', 'running')",
                new { partId = costingPartId, lane });

            foreach (var id in existing)
                return id;

            foreach (var id in connection.Query<int>(
                "INSERT INTO dbo.CostingPartQueue " +
                "(CostingPartID, Lane, QueueName, Payload, Status, Priority, " +
                " QueuedAt, InsertUserId) " +
                "OUTPUT INSERTED.ID " +
                "VALUES (@partId, @lane, @queueName, @payload, 'queued', @priority, " +
                "        GETDATE(), 1)",
                new { partId = costingPartId, lane, queueName, priority, payload }))
                return id;
        }
        catch (Exception)
        {
            // Deliberately swallowed -- see the remarks above.
        }

        return null;
    }
}
