using Microsoft.AspNetCore.Mvc;
using Serenity.Data;
using Serenity.Reporting;
using Serenity.Services;
using Serenity.Web;
using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Linq;
using MyRow = DSRFQ.Costing.CostingPartQueueRow;

namespace DSRFQ.Costing.Endpoints;

[Route("Services/Costing/CostingPartQueue/[action]")]
[ConnectionKey(typeof(MyRow)), ServiceAuthorize(typeof(MyRow))]
public class CostingPartQueueEndpoint : ServiceEndpoint
{
    [HttpPost]
    public RetrieveResponse<MyRow> Retrieve(IDbConnection connection, RetrieveRequest request,
        [FromServices] ICostingPartQueueRetrieveHandler handler)
    {
        return handler.Retrieve(connection, request);
    }

    [HttpPost, AuthorizeList(typeof(MyRow))]
    public ListResponse<MyRow> List(IDbConnection connection, ListRequest request,
        [FromServices] ICostingPartQueueListHandler handler)
    {
        return handler.List(connection, request);
    }

    [HttpPost, AuthorizeList(typeof(MyRow))]
    public FileContentResult ListExcel(IDbConnection connection, ListRequest request,
        [FromServices] ICostingPartQueueListHandler handler,
        [FromServices] IExcelExporter exporter)
    {
        var data = List(connection, request, handler).Entities;
        var bytes = exporter.Export(data, typeof(Columns.CostingPartQueueColumns), request.ExportColumns);
        return ExcelContentResult.Create(bytes, "CostingPartQueue_" +
            DateTime.Now.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture) + ".xlsx");
    }

    // MasterCostingStatus ids. Only 1 and 2 mean the work is still outstanding.
    private const int PendingStatusId = 1;
    private const int FailedStatusId = 4;

    /// <summary>
    /// The CostingParts columns each lane owns. Must agree with
    /// LANE_STATUS_COLUMNS in RFQ/queue_store.py: this is what tells the
    /// consumer's dispatcher that a job has finished.
    /// </summary>
    private static readonly Dictionary<string, string[]> LaneStatusColumns = new()
    {
        [CostingQueue.LaneDrawing] = new[] { "DrawingConversionStatusID", "OcrStatusID" },
        [CostingQueue.LaneCosting] = new[] { "CostingStatusID" },
        [CostingQueue.LaneBallooning] = new[] { "BalloonStatusID" }
    };

    /// <summary>
    /// Takes a job out of the queue.
    /// </summary>
    /// <remarks>
    /// A job that has not started yet is simply cancelled and nothing else
    /// changes -- its part is still Pending, because the dispatcher only moves a
    /// part to In Progress when it admits it.
    ///
    /// A job that is already running is a different thing, and the button says
    /// so: the consumer runs it across several daemon threads with no way to
    /// interrupt them, so all this can do is release the lane slot and mark the
    /// part Failed. The work may keep going in the background; what it buys is a
    /// pipeline that is not stuck behind a job nobody expects to finish. The
    /// consumer would do the same by itself after Queue.StaleMinutes.
    /// </remarks>
    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public QueueItemResponse Cancel(IUnitOfWork uow, QueueItemRequest request)
    {
        var item = Load(uow.Connection, request);

        if (item.Status == "queued")
        {
            SetStatus(uow, item.Id.Value, "cancelled", "cancelled from the queue page");
            return new QueueItemResponse
            {
                Message = $"Part {item.CostingPartId} was taken off the {item.Lane} queue."
            };
        }

        if (item.Status == "running")
        {
            FailPart(uow, item, FailedStatusId);
            SetStatus(uow, item.Id.Value, "failed",
                "the slot was released from the queue page");
            return new QueueItemResponse
            {
                Message = $"Released the {item.Lane} slot held by part {item.CostingPartId}. " +
                          "Whatever the consumer had already started may still be running."
            };
        }

        throw new ValidationError("NotCancellable",
            $"This job is already {item.Status}.");
    }

    /// <summary>
    /// Moves a waiting job to the front of its lane.
    /// </summary>
    /// <remarks>
    /// Priority rather than a rewritten QueuedAt, so the queue keeps an honest
    /// record of when the job actually arrived and "elapsed" stays meaningful.
    /// </remarks>
    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public QueueItemResponse Prioritise(IUnitOfWork uow, QueueItemRequest request)
    {
        var item = Load(uow.Connection, request);
        if (item.Status != "queued")
            throw new ValidationError("NotWaiting",
                $"Only a waiting job can be moved up; this one is {item.Status}.");

        // One below whatever is currently at the front, so repeated use keeps
        // working instead of piling everything onto the same priority.
        var top = uow.Connection.Query<int?>(
            "SELECT MIN(Priority) FROM dbo.CostingPartQueue " +
            "WHERE Lane = @lane AND Status = 'queued' AND IsActive = 1",
            new { lane = item.Lane }).FirstOrDefault() ?? 100;

        uow.Connection.Execute(
            "UPDATE dbo.CostingPartQueue SET Priority = @priority, UpdateDate = GETDATE() " +
            "WHERE ID = @id",
            new { priority = top - 1, id = item.Id.Value });

        return new QueueItemResponse
        {
            Message = $"Part {item.CostingPartId} is next in the {item.Lane} queue."
        };
    }

    /// <summary>
    /// Puts a finished job back in line, as a new attempt.
    /// </summary>
    /// <remarks>
    /// A new row rather than resetting this one, so the failure stays on the
    /// page next to the retry instead of being erased by it. The part goes back
    /// to Pending because the consumer's dispatcher reads those columns to
    /// decide when the new run is done.
    /// </remarks>
    [HttpPost, AuthorizeUpdate(typeof(MyRow))]
    public QueueItemResponse Requeue(IUnitOfWork uow, QueueItemRequest request)
    {
        var item = Load(uow.Connection, request);
        if (item.Status == "queued" || item.Status == "running")
            throw new ValidationError("AlreadyQueued",
                $"This job is {item.Status}; there is nothing to retry yet.");

        FailPart(uow, item, PendingStatusId);

        var queued = CostingQueue.Enqueue(uow.Connection, item.CostingPartId.Value,
            item.QueueName);
        if (queued == null)
            throw new ValidationError("NotQueued",
                "The job could not be queued. It may already be waiting under another row.");

        return new QueueItemResponse
        {
            Message = $"Part {item.CostingPartId} is back on the {item.Lane} queue."
        };
    }

    /// <summary>
    /// The lane strip above the grid: what is running, what is behind it, and
    /// whether anything is moving at all.
    /// </summary>
    [HttpPost, AuthorizeList(typeof(MyRow))]
    public QueueSummaryResponse Summary(IDbConnection connection)
    {
        var rows = connection.Query<LaneRow>(
            "SELECT q.Lane, q.Status, COUNT(*) AS Count, " +
            "       MAX(DATEDIFF(second, q.QueuedAt, GETDATE())) AS OldestWait " +
            "FROM dbo.CostingPartQueue q " +
            "WHERE q.IsActive = 1 AND (q.Status IN ('queued', 'running') " +
            "   OR (q.Status = 'failed' AND q.FinishedAt > DATEADD(day, -1, GETDATE()))) " +
            "GROUP BY q.Lane, q.Status").ToList();

        var running = connection.Query<RunningRow>(
            "SELECT q.Lane, p.PartNumber, q.CostingPartID, " +
            "       DATEDIFF(second, q.StartedAt, GETDATE()) AS Seconds " +
            "FROM dbo.CostingPartQueue q " +
            "LEFT JOIN dbo.CostingParts p ON p.ID = q.CostingPartID " +
            "WHERE q.IsActive = 1 AND q.Status = 'running'").ToList();

        var lanes = CostingQueue.Lanes.Select(lane =>
        {
            var mine = rows.Where(r => r.Lane == lane).ToList();
            var first = running.FirstOrDefault(r => r.Lane == lane);
            var waiting = mine.FirstOrDefault(r => r.Status == "queued");

            return new QueueLaneSummary
            {
                Lane = lane,
                Running = mine.Where(r => r.Status == "running").Sum(r => r.Count),
                Queued = waiting?.Count ?? 0,
                Failed = mine.Where(r => r.Status == "failed").Sum(r => r.Count),
                OldestWaitSeconds = waiting?.OldestWait,
                RunningPart = first == null
                    ? null
                    : (string.IsNullOrEmpty(first.PartNumber)
                        ? $"#{first.CostingPartID}"
                        : first.PartNumber),
                RunningSeconds = first?.Seconds
            };
        }).ToList();

        // Work waiting for over two minutes in a lane where nothing is running
        // means the dispatcher is not admitting anything -- in practice, the
        // consumer is down. Worth saying out loud: otherwise the page just looks
        // like a slow queue.
        const int stalledAfterSeconds = 120;
        var stalled = lanes.Any(l => l.Queued > 0 && l.Running == 0 &&
                                     (l.OldestWaitSeconds ?? 0) > stalledAfterSeconds);

        return new QueueSummaryResponse { Lanes = lanes, ConsumerLooksDown = stalled };
    }

    private sealed class LaneRow
    {
        public string Lane { get; set; }
        public string Status { get; set; }
        public int Count { get; set; }
        public int? OldestWait { get; set; }
    }

    private sealed class RunningRow
    {
        public string Lane { get; set; }
        public string PartNumber { get; set; }
        public int CostingPartID { get; set; }
        public int? Seconds { get; set; }
    }

    private static MyRow Load(IDbConnection connection, QueueItemRequest request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));
        if (request.QueueItemId <= 0)
            throw new ArgumentOutOfRangeException(nameof(request.QueueItemId));

        return connection.TryFirst<MyRow>(
                new Criteria(MyRow.Fields.Id) == request.QueueItemId)
            ?? throw new ValidationError("NotFound", "This queue item no longer exists.");
    }

    private static void SetStatus(IUnitOfWork uow, int id, string status, string note)
    {
        uow.Connection.Execute(
            "UPDATE dbo.CostingPartQueue " +
            "SET Status = @status, FinishedAt = GETDATE(), LastError = @note, " +
            "    UpdateDate = GETDATE() " +
            "WHERE ID = @id",
            new { status, note, id });
    }

    /// <summary>
    /// Writes a status onto the part's columns for this lane, so the grid and
    /// the queue agree about whether the part is still busy.
    /// </summary>
    private static void FailPart(IUnitOfWork uow, MyRow item, int statusId)
    {
        if (!LaneStatusColumns.TryGetValue(item.Lane ?? "", out var columns))
            return;

        var sets = string.Join(", ", columns.Select(c => $"{c} = @statusId"));
        uow.Connection.Execute(
            $"UPDATE dbo.CostingParts SET {sets} WHERE ID = @partId",
            new { statusId, partId = item.CostingPartId });
    }
}
