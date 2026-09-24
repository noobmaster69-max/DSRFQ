using Microsoft.AspNetCore.Mvc;
using Serenity.Data;
using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Linq;

namespace DSRFQ.Common.Pages;

[Route("Dashboard/[action]")]
public class DashboardPage(ISqlConnections sqlConnections) : Controller
{
    private readonly ISqlConnections sqlConnections = sqlConnections
        ?? throw new ArgumentNullException(nameof(sqlConnections));

    // MasterCostingStatus. Pending and In Progress both read as "not finished
    // yet"; Failed and Upload Failed both read as "broken", and the dashboard
    // does not have room to distinguish where the break happened.
    private const int StatusPending = 1;
    private const int StatusInProgress = 2;
    private const int StatusCompleted = 3;
    private const int StatusFailed = 4;
    private const int StatusUploadFailed = 5;
    private const int StatusNoDrawing = 6;

    [PageAuthorize, HttpGet, Route("~/")]
    public ActionResult Index()
    {
        using var connection = sqlConnections.NewByKey("Default");
        return View(MVC.Views.Common.Dashboard.DashboardIndex, BuildModel(connection));
    }

    private DashboardPageModel BuildModel(IDbConnection connection)
    {
        var model = new DashboardPageModel
        {
            PartCount = connection.Query<int>(
                "SELECT COUNT(*) FROM dbo.CostingParts WHERE IsActive = 1").Single(),

            // Only completed runs carry a meaningful duration: a failed stage
            // times how long it took to give up, which would inflate the
            // average of the stage it failed in.
            StageDurations = connection.Query<StageDuration>(
                "SELECT Stage, " +
                "       AVG(CAST(DurationMs AS float)) / 1000.0 AS AvgSeconds, " +
                "       MAX(CAST(DurationMs AS float)) / 1000.0 AS MaxSeconds, " +
                "       COUNT(*) AS Runs " +
                "FROM dbo.CostingPartStageTimings " +
                "WHERE IsActive = 1 AND Status = 'completed' AND DurationMs IS NOT NULL " +
                "GROUP BY Stage " +
                "ORDER BY AVG(CAST(DurationMs AS float)) DESC").ToList(),

            LaneOutcomes = connection.Query<LaneOutcome>(
                "SELECT Lane, " +
                "  SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) AS Completed, " +
                "  SUM(CASE WHEN Status = 'failed' THEN 1 ELSE 0 END) AS Failed, " +
                "  SUM(CASE WHEN Status IN ('queued', 'running') THEN 1 ELSE 0 END) AS [Open] " +
                "FROM dbo.CostingPartQueue WHERE IsActive = 1 " +
                "GROUP BY Lane ORDER BY Lane").ToList(),

            CostBreakdown = connection.Query<CostCategory>(
                "SELECT Name, SUM(Total) AS Total, COUNT(*) AS Lines " +
                "FROM dbo.CostingPartCostingResults " +
                "WHERE IsActive = 1 AND Name IS NOT NULL " +
                "GROUP BY Name HAVING SUM(Total) > 0 " +
                "ORDER BY SUM(Total) DESC").ToList(),

            PipelineSteps = PipelineSteps(connection),
            RecentFailures = RecentFailures(connection)
        };

        var stageOutcomes = connection.Query<StageOutcome>(
            "SELECT Status, COUNT(*) AS Count FROM dbo.CostingPartStageTimings " +
            "WHERE IsActive = 1 GROUP BY Status").ToList();

        var completed = stageOutcomes.Where(s => s.Status == "completed").Sum(s => s.Count);
        var failed = stageOutcomes.Where(s => s.Status == "failed").Sum(s => s.Count);

        model.StageRuns = stageOutcomes.Sum(s => s.Count);
        model.StageSuccessRate = completed + failed == 0
            ? 0 : Math.Round(100.0 * completed / (completed + failed), 1);

        model.QuotedValue = model.CostBreakdown.Sum(c => c.Total);

        var openFailed = connection.Query<LaneOutcome>(
            "SELECT '' AS Lane, 0 AS Completed, " +
            "  SUM(CASE WHEN Status = 'failed' THEN 1 ELSE 0 END) AS Failed, " +
            "  SUM(CASE WHEN Status IN ('queued', 'running') THEN 1 ELSE 0 END) AS [Open] " +
            "FROM dbo.CostingPartQueue WHERE IsActive = 1").Single();
        model.OpenJobs = openFailed.Open;
        model.FailedJobs = openFailed.Failed;

        model.MedianTurnaroundSeconds = MedianTurnaround(connection);
        return model;
    }

    /// <summary>
    /// The four pipeline steps, unpivoted out of their four status columns.
    /// </summary>
    private static List<PipelineStepStatus> PipelineSteps(IDbConnection connection)
    {
        var rows = connection.Query<StepRow>(
            "SELECT 'Drawing' AS Step, DrawingConversionStatusID AS StatusId, COUNT(*) AS Count " +
            "  FROM dbo.CostingParts WHERE IsActive = 1 GROUP BY DrawingConversionStatusID " +
            "UNION ALL SELECT 'OCR', OcrStatusID, COUNT(*) " +
            "  FROM dbo.CostingParts WHERE IsActive = 1 GROUP BY OcrStatusID " +
            "UNION ALL SELECT 'Costing', CostingStatusID, COUNT(*) " +
            "  FROM dbo.CostingParts WHERE IsActive = 1 GROUP BY CostingStatusID " +
            "UNION ALL SELECT 'Ballooning', BalloonStatusID, COUNT(*) " +
            "  FROM dbo.CostingParts WHERE IsActive = 1 GROUP BY BalloonStatusID").ToList();

        // Fixed order so the chart's rows do not reshuffle as data changes --
        // this is the order the pipeline actually runs in.
        return new[] { "Drawing", "OCR", "Costing", "Ballooning" }
            .Select(step =>
            {
                var mine = rows.Where(r => r.Step == step).ToList();
                int sum(params int[] ids) => mine
                    .Where(r => r.StatusId.HasValue && ids.Contains(r.StatusId.Value))
                    .Sum(r => r.Count);

                return new PipelineStepStatus
                {
                    Step = step,
                    Completed = sum(StatusCompleted),
                    Pending = sum(StatusPending, StatusInProgress),
                    Failed = sum(StatusFailed, StatusUploadFailed),
                    NotApplicable = sum(StatusNoDrawing)
                };
            }).ToList();
    }

    /// <summary>
    /// Failed stages and failed queue jobs, newest first.
    /// </summary>
    /// <remarks>
    /// Both are worth showing and neither is a superset of the other: a stage
    /// can fail inside a job that the queue still records as completed, and a
    /// job can fail before any stage starts.
    /// </remarks>
    private static List<PipelineFailure> RecentFailures(IDbConnection connection)
    {
        return connection.Query<FailureRow>(
            "SELECT TOP 8 * FROM ( " +
            "  SELECT t.CostingPartID AS CostingPartId, p.PartNumber, t.Stage, " +
            "         LEFT(ISNULL(t.Detail, ''), 160) AS Detail, t.EndTime AS Occurred " +
            "  FROM dbo.CostingPartStageTimings t " +
            "  LEFT JOIN dbo.CostingParts p ON p.ID = t.CostingPartID " +
            "  WHERE t.IsActive = 1 AND t.Status = 'failed' " +
            "  UNION ALL " +
            "  SELECT q.CostingPartID, p.PartNumber, q.Lane + ' job', " +
            "         LEFT(ISNULL(q.LastError, ''), 160), q.FinishedAt " +
            "  FROM dbo.CostingPartQueue q " +
            "  LEFT JOIN dbo.CostingParts p ON p.ID = q.CostingPartID " +
            "  WHERE q.IsActive = 1 AND q.Status = 'failed' " +
            ") f ORDER BY Occurred DESC")
            .Select(f => new PipelineFailure
            {
                CostingPartId = f.CostingPartId,
                PartNumber = f.PartNumber,
                Stage = f.Stage,
                Detail = f.Detail,
                When = f.Occurred?.ToString("dd MMM HH:mm", CultureInfo.InvariantCulture) ?? ""
            }).ToList();
    }

    /// <summary>
    /// Median rather than mean: two parts (5 and 9) ran the whole pipeline
    /// repeatedly and carry four times the stage count of the rest, so a mean
    /// would describe those two and nothing else.
    /// </summary>
    private static int MedianTurnaround(IDbConnection connection)
    {
        var totals = connection.Query<int>(
            "SELECT SUM(DurationMs) / 1000 FROM dbo.CostingPartStageTimings " +
            "WHERE IsActive = 1 AND DurationMs IS NOT NULL " +
            "GROUP BY CostingPartID ORDER BY 1").ToList();

        if (totals.Count == 0)
            return 0;

        return totals.Count % 2 == 1
            ? totals[totals.Count / 2]
            : (totals[totals.Count / 2 - 1] + totals[totals.Count / 2]) / 2;
    }

    private class StageOutcome
    {
        public string Status { get; set; }
        public int Count { get; set; }
    }

    private class StepRow
    {
        public string Step { get; set; }
        public int? StatusId { get; set; }
        public int Count { get; set; }
    }

    private class FailureRow
    {
        public int CostingPartId { get; set; }
        public string PartNumber { get; set; }
        public string Stage { get; set; }
        public string Detail { get; set; }
        public DateTime? Occurred { get; set; }
    }
}
