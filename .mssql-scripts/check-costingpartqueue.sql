-- Purpose: exercise every statement the queue relies on, against the real
-- table, then roll back.
--
-- Worth doing as one script because the risky parts are not the CREATE TABLE:
-- they are the CTE dequeue the dispatcher uses (UPDATE over a TOP..ORDER BY
-- with READPAST), the filtered unique index that stops a part being queued
-- twice, and the correlated Position expression the grid renders. All three
-- fail at runtime rather than at compile time.

USE RFQ;
GO

SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

BEGIN TRANSACTION;

DECLARE @part INT = (SELECT TOP 1 ID FROM dbo.CostingParts WHERE IsActive = 1 ORDER BY ID DESC);
DECLARE @part2 INT = (SELECT TOP 1 ID FROM dbo.CostingParts WHERE IsActive = 1 AND ID <> @part ORDER BY ID DESC);
SELECT '0. parts used' AS Step, @part AS Part1, @part2 AS Part2;

-- 1. Enqueue, the way DSRFQ and queue_store both do it.
INSERT INTO dbo.CostingPartQueue
    (CostingPartID, Lane, QueueName, Status, Priority, QueuedAt, InsertUserId)
OUTPUT INSERTED.ID AS InsertedId
VALUES (@part, 'drawing', 'NewCostingParts', 'queued', 100, DATEADD(minute, -5, GETDATE()), 1);

INSERT INTO dbo.CostingPartQueue
    (CostingPartID, Lane, QueueName, Status, Priority, QueuedAt, InsertUserId)
VALUES (@part2, 'drawing', 'NewCostingParts', 'queued', 100, DATEADD(minute, -2, GETDATE()), 1);

-- 2. The filtered unique index must reject a second active job for the same
--    part and lane. Two runs against one part duplicate everything they write.
BEGIN TRY
    INSERT INTO dbo.CostingPartQueue
        (CostingPartID, Lane, QueueName, Status, Priority, QueuedAt, InsertUserId)
    VALUES (@part, 'drawing', 'NewCostingParts', 'queued', 100, GETDATE(), 1);
    SELECT '2. duplicate guard' AS Step, 'FAIL - the duplicate was accepted' AS Result;
END TRY
BEGIN CATCH
    SELECT '2. duplicate guard' AS Step, 'ok - rejected' AS Result, ERROR_NUMBER() AS ErrNo;
END CATCH;

-- 3. The same part in a different lane is a different job and must be allowed.
INSERT INTO dbo.CostingPartQueue
    (CostingPartID, Lane, QueueName, Status, Priority, QueuedAt, InsertUserId)
VALUES (@part, 'costing', 'Costing', 'queued', 100, GETDATE(), 1);
SELECT '3. other lane' AS Step, 'ok - accepted' AS Result;

-- 4. The grid's expressions, exactly as the row declares them.
SELECT '4. grid columns' AS Step, T0.[ID], T0.[CostingPartID], T0.[Lane], T0.[Status],
    DATEDIFF(second,
      CASE WHEN T0.[Status] = 'queued' THEN T0.[QueuedAt] ELSE T0.[StartedAt] END,
      COALESCE(T0.[FinishedAt], GETDATE())) AS ElapsedSeconds,
    CASE WHEN T0.[Status] = 'queued' THEN (
      SELECT COUNT(*) FROM dbo.CostingPartQueue q2
      WHERE q2.Lane = T0.[Lane] AND q2.Status = 'queued' AND q2.IsActive = 1
        AND (q2.Priority < T0.[Priority]
          OR (q2.Priority = T0.[Priority] AND q2.QueuedAt < T0.[QueuedAt])
          OR (q2.Priority = T0.[Priority] AND q2.QueuedAt = T0.[QueuedAt] AND q2.ID <= T0.[ID]))
    ) END AS Position
FROM dbo.CostingPartQueue T0
WHERE T0.CostingPartID IN (@part, @part2) AND T0.IsActive = 1
ORDER BY T0.Lane, Position;

-- 5. The dispatcher's dequeue. Must return the oldest drawing job (part1, five
--    minutes old) and nothing else.
WITH nxt AS (
  SELECT TOP (1) * FROM dbo.CostingPartQueue WITH (ROWLOCK, UPDLOCK, READPAST)
  WHERE Lane = 'drawing' AND Status = 'queued' AND IsActive = 1
  ORDER BY Priority, QueuedAt, ID
)
UPDATE nxt SET Status = 'running', StartedAt = GETDATE(),
               Attempt = Attempt + 1, WorkerId = 'test:0',
               LastError = NULL, UpdateDate = GETDATE()
OUTPUT '5. claim' AS Step, INSERTED.ID, INSERTED.CostingPartID,
       INSERTED.QueueName, INSERTED.Lane, INSERTED.Payload;

-- 6. Prioritise: one below the current front of the lane.
DECLARE @top INT = (SELECT MIN(Priority) FROM dbo.CostingPartQueue
                    WHERE Lane = 'drawing' AND Status = 'queued' AND IsActive = 1);
UPDATE dbo.CostingPartQueue SET Priority = @top - 1, UpdateDate = GETDATE()
WHERE CostingPartID = @part2 AND Lane = 'drawing' AND Status = 'queued';
SELECT '6. prioritise' AS Step, @top AS WasTop, @top - 1 AS NowTop;

-- 7. The stale reaper's part update, with its guard against clobbering a part
--    that has already finished.
UPDATE dbo.CostingParts SET DrawingConversionStatusID = 4, OcrStatusID = 4
WHERE ID = @part
  AND (DrawingConversionStatusID IN (1, 2) OR OcrStatusID IN (1, 2));
SELECT '7. reap part' AS Step, @@ROWCOUNT AS RowsTouched;

-- 8. The Summary endpoint's two queries.
SELECT '8a. lane counts' AS Step, q.Lane, q.Status, COUNT(*) AS Count,
       MAX(DATEDIFF(second, q.QueuedAt, GETDATE())) AS OldestWait
FROM dbo.CostingPartQueue q
WHERE q.IsActive = 1 AND (q.Status IN ('queued', 'running')
   OR (q.Status = 'failed' AND q.FinishedAt > DATEADD(day, -1, GETDATE())))
GROUP BY q.Lane, q.Status;

SELECT '8b. running now' AS Step, q.Lane, p.PartNumber, q.CostingPartID,
       DATEDIFF(second, q.StartedAt, GETDATE()) AS Seconds
FROM dbo.CostingPartQueue q
LEFT JOIN dbo.CostingParts p ON p.ID = q.CostingPartID
WHERE q.IsActive = 1 AND q.Status = 'running';

-- 9. Orphan recovery at consumer startup.
UPDATE dbo.CostingPartQueue
SET Status = 'queued', StartedAt = NULL, WorkerId = NULL,
    LastError = 'the consumer restarted while this was running',
    UpdateDate = GETDATE()
WHERE Status = 'running' AND IsActive = 1
  AND (WorkerId IS NULL OR WorkerId LIKE 'test:%');
SELECT '9. requeue orphans' AS Step, @@ROWCOUNT AS Requeued;

ROLLBACK TRANSACTION;

SELECT 'rolled back; live rows:' AS Step, COUNT(*) AS Rows FROM dbo.CostingPartQueue;
GO
