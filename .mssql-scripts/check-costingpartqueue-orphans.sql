-- Purpose: the one queue statement whose logic is easy to get backwards --
-- reclaiming jobs left 'running' by a consumer that is gone.
--
-- Two cases have to come out differently:
--   * a job owned by a previous pid on this host is dead and must be requeued;
--   * a job owned by THIS pid is alive, and requeuing it would run the same
--     part twice. run_consumer sits in a supervisor loop and calls this after
--     every RabbitMQ reconnect, so that case is not hypothetical.
--
-- Rolls back.

USE RFQ;
GO

SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

BEGIN TRANSACTION;

DECLARE @part INT  = (SELECT TOP 1 ID FROM dbo.CostingParts WHERE IsActive = 1 ORDER BY ID DESC);
DECLARE @part2 INT = (SELECT TOP 1 ID FROM dbo.CostingParts WHERE IsActive = 1 AND ID <> @part ORDER BY ID DESC);
DECLARE @part3 INT = (SELECT TOP 1 ID FROM dbo.CostingParts WHERE IsActive = 1 AND ID NOT IN (@part, @part2) ORDER BY ID DESC);

-- Stand-ins for WORKER_ID = "host:pid".
DECLARE @me   NVARCHAR(64) = N'deskdev:2222';   -- this process
DECLARE @dead NVARCHAR(64) = N'deskdev:1111';   -- a previous one, same host
DECLARE @host NVARCHAR(64) = N'deskdev:%';
DECLARE @other NVARCHAR(64) = N'otherbox:3333'; -- a different machine

INSERT INTO dbo.CostingPartQueue
    (CostingPartID, Lane, QueueName, Status, StartedAt, WorkerId, Priority, QueuedAt, InsertUserId)
VALUES
    (@part,  'drawing',    'NewCostingParts', 'running', GETDATE(), @dead,  100, GETDATE(), 1),
    (@part2, 'costing',    'Costing',         'running', GETDATE(), @me,    100, GETDATE(), 1),
    (@part3, 'ballooning', 'Ballooning',      'running', GETDATE(), @other, 100, GETDATE(), 1);

UPDATE dbo.CostingPartQueue
SET Status = 'queued', StartedAt = NULL, WorkerId = NULL,
    LastError = 'the consumer restarted while this was running',
    UpdateDate = GETDATE()
WHERE Status = 'running' AND IsActive = 1
  AND (WorkerId IS NULL OR (WorkerId LIKE @host AND WorkerId <> @me));

SELECT
    CASE WHEN CostingPartID = @part  THEN 'dead pid, same host  -> want queued'
         WHEN CostingPartID = @part2 THEN 'this pid             -> want running'
         ELSE                             'another host         -> want running'
    END AS Case_,
    Status AS Got,
    CASE WHEN (CostingPartID = @part  AND Status = 'queued')
           OR (CostingPartID = @part2 AND Status = 'running')
           OR (CostingPartID = @part3 AND Status = 'running')
         THEN 'ok' ELSE 'FAIL' END AS Result
FROM dbo.CostingPartQueue
WHERE CostingPartID IN (@part, @part2, @part3) AND IsActive = 1
ORDER BY CostingPartID DESC;

ROLLBACK TRANSACTION;

SELECT 'rolled back; live rows:' AS Step, COUNT(*) AS Rows FROM dbo.CostingPartQueue;
GO
