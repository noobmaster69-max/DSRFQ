-- Purpose: put a part's drawing conversion + title-block recognition back on
-- the admission queue by hand.
--
-- The dispatcher reads dbo.CostingPartQueue directly, so inserting a row here
-- is enough -- no RabbitMQ message needed.
--
-- QUOTED_IDENTIFIER must be ON: UX_CostingPartQueue_Active is a filtered index,
-- and SQL Server refuses inserts against a table carrying one otherwise.
-- sqlcmd -Q leaves it OFF, which is why this is a file rather than a one-liner.
--
-- Lane/QueueName come from CostingQueue.cs: "NewCostingParts" -> lane "drawing".
--
-- NOTE: this does NOT clear the converted page images the way the DSRFQ Rerun
-- button does. That is deliberate -- the consumer replaces Original = 0 rows
-- itself, and Original = 1 (the as-uploaded renders) must never be cleared,
-- because nothing recreates them.
--
-- Set @part below.

USE RFQ;
GO

SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

DECLARE @part INT = 15;

-- Back to Pending; the dispatcher moves it on when it admits the job.
UPDATE dbo.CostingParts
SET DrawingConversionStatusID = 1, OcrStatusID = 1
WHERE ID = @part;

-- The unique filtered index refuses a second active job for the same part and
-- lane, so clear any leftover first rather than colliding with it.
UPDATE dbo.CostingPartQueue
SET Status = 'cancelled', FinishedAt = GETDATE(),
    LastError = 'superseded by a manual re-queue', UpdateDate = GETDATE()
WHERE CostingPartID = @part AND Lane = 'drawing' AND IsActive = 1
  AND Status IN ('queued', 'running');

INSERT INTO dbo.CostingPartQueue
    (CostingPartID, Lane, QueueName, Status, Priority, QueuedAt, InsertUserId)
VALUES (@part, 'drawing', 'NewCostingParts', 'queued', 1, GETDATE(), 1);

SELECT 'queued' AS Step, SCOPE_IDENTITY() AS ItemId, @part AS Part;
GO
