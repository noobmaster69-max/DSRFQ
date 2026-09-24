-- Purpose: put a part's costing back on the admission queue by hand.
--
-- The dispatcher reads dbo.CostingPartQueue directly, so inserting a row here
-- is enough to make it run -- no RabbitMQ message needed. Useful for testing
-- without going through the DSRFQ UI.
--
-- QUOTED_IDENTIFIER must be ON: UX_CostingPartQueue_Active is a filtered index,
-- and SQL Server refuses inserts against a table carrying one otherwise.
-- sqlcmd -Q leaves it OFF, which is why this is a file rather than a one-liner.
--
-- Set @part below.

USE RFQ;
GO

SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

DECLARE @part INT = 10;

-- Back to Pending; the dispatcher moves it to In Progress when it admits it.
UPDATE dbo.CostingParts SET CostingStatusID = 1 WHERE ID = @part;

-- The unique filtered index refuses a second active job for the same part and
-- lane, so clear any leftover first rather than colliding with it.
UPDATE dbo.CostingPartQueue
SET Status = 'cancelled', FinishedAt = GETDATE(),
    LastError = 'superseded by a manual re-queue', UpdateDate = GETDATE()
WHERE CostingPartID = @part AND Lane = 'costing' AND IsActive = 1
  AND Status IN ('queued', 'running');

INSERT INTO dbo.CostingPartQueue
    (CostingPartID, Lane, QueueName, Status, Priority, QueuedAt, InsertUserId)
VALUES (@part, 'costing', 'Costing', 'queued', 1, GETDATE(), 1);

SELECT 'queued' AS Step, SCOPE_IDENTITY() AS ItemId, @part AS Part;
GO

