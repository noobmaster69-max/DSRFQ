-- Purpose: close out queue rows left open after their part already finished.
--
-- Why these exist: DSRFQ writes the CostingPartQueue row itself (CostingQueue
-- .Enqueue) but only the consumer's dispatcher advances it. A job only reaches
-- 'running' via queue_store._claim, and the pipeline is also driven straight
-- off RabbitMQ -- CostingPartsEndpoint.Publish, or any run that happened while
-- the dispatcher was down. Those parts finish with their row still 'queued',
-- and until the _finish_completed fix nothing reconciled them: it filtered on
-- Status = 'running', and _reap_stale still does.
--
-- Two things then go wrong. The grid's ElapsedSeconds expression falls back to
-- COALESCE(FinishedAt, GETDATE()), so a NULL FinishedAt counts up forever; and
-- CostingQueue.Enqueue treats Status IN ('queued','running') as already-queued,
-- so the stranded row silently blocks the next re-run of that part and lane.
--
-- Mirrors queue_store._finish_completed: a lane is done when every status
-- column it owns is an end state (not 1 Pending, not 2 In Progress, not NULL),
-- and the job failed if any of them is 4.
--
-- FinishedAt is stamped GETDATE(), same as _close. For this backfill that
-- overstates the recorded duration -- the work actually ended earlier -- but
-- these rows carry no usable timing anyway (StartedAt was never set), so there
-- is nothing to preserve.

USE RFQ;
GO

-- QUOTED_IDENTIFIER must be ON: CostingPartQueue carries the filtered unique
-- index that stops a part being queued twice per lane, and SQL Server refuses
-- any UPDATE on such a table under sqlcmd's default OFF.
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

-- 1. Preview: what is open, and has its part reached an end state?
SELECT
    q.ID,
    q.Lane,
    q.Status                                    AS QueueStatus,
    q.QueuedAt,
    DATEDIFF(second, q.QueuedAt, GETDATE())     AS ElapsedSec,
    q.CostingPartID,
    p.DrawingConversionStatusID                 AS DrwSt,
    p.OcrStatusID                               AS OcrSt,
    p.CostingStatusID                           AS CostSt,
    p.BalloonStatusID                           AS BalSt,
    CASE WHEN EXISTS (
        SELECT 1 FROM (VALUES
            ('drawing',    p.DrawingConversionStatusID),
            ('drawing',    p.OcrStatusID),
            ('costing',    p.CostingStatusID),
            ('ballooning', p.BalloonStatusID)) AS v(lane, st)
        WHERE v.lane = q.Lane AND (v.st IS NULL OR v.st IN (1, 2))
    ) THEN 'still open' ELSE 'reconcilable' END  AS Verdict
FROM dbo.CostingPartQueue q
JOIN dbo.CostingParts p ON p.ID = q.CostingPartID
WHERE q.Status IN ('queued', 'running')
  AND q.IsActive = 1
ORDER BY q.ID;
GO

-- 2. Close the ones whose lane has no open status column left.
UPDATE q
SET Status = CASE WHEN EXISTS (
                SELECT 1 FROM (VALUES
                    ('drawing',    p.DrawingConversionStatusID),
                    ('drawing',    p.OcrStatusID),
                    ('costing',    p.CostingStatusID),
                    ('ballooning', p.BalloonStatusID)) AS v(lane, st)
                WHERE v.lane = q.Lane AND v.st = 4)
             THEN 'failed' ELSE 'completed' END,
    FinishedAt = GETDATE(),
    LastError  = CASE WHEN EXISTS (
                    SELECT 1 FROM (VALUES
                        ('drawing',    p.DrawingConversionStatusID),
                        ('drawing',    p.OcrStatusID),
                        ('costing',    p.CostingStatusID),
                        ('ballooning', p.BalloonStatusID)) AS v(lane, st)
                    WHERE v.lane = q.Lane AND v.st = 4)
                 THEN 'the pipeline reported a failure' ELSE NULL END,
    UpdateDate = GETDATE()
FROM dbo.CostingPartQueue q
JOIN dbo.CostingParts p ON p.ID = q.CostingPartID
WHERE q.Status IN ('queued', 'running')
  AND q.IsActive = 1
  AND NOT EXISTS (
        SELECT 1 FROM (VALUES
            ('drawing',    p.DrawingConversionStatusID),
            ('drawing',    p.OcrStatusID),
            ('costing',    p.CostingStatusID),
            ('ballooning', p.BalloonStatusID)) AS v(lane, st)
        WHERE v.lane = q.Lane AND (v.st IS NULL OR v.st IN (1, 2)));

SELECT @@ROWCOUNT AS RowsClosed;
GO

-- 3. Result.
SELECT ID, Lane, Status, QueuedAt, StartedAt, FinishedAt, LastError
FROM dbo.CostingPartQueue
ORDER BY ID DESC;
GO
