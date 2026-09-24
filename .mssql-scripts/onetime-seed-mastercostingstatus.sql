-- Purpose: Seed dbo.MasterCostingStatus so CostingParts rows can be inserted.
--
-- CostingParts.DrawingConversionStatusID / OcrStatusID / CostingStatusID /
-- BalloonStatusID are all NOT NULL DEFAULT 1 with FKs to MasterCostingStatus.ID.
-- With that table empty, every insert fails on the first FK checked:
--   "The INSERT statement conflicted with the FOREIGN KEY constraint
--    FK_CostingParts_Balloon ... table dbo.MasterCostingStatus, column 'ID'"
-- Nothing is wrong with the Balloon column specifically — it is simply the
-- constraint SQL Server happens to evaluate first.
--
-- The IDs are NOT free to choose. RPA\RFQ\handlers.py writes them literally:
--   1  default on insert                                     -> Pending
--   2  work started, OcrStartTime stamped (handlers.py:723)   -> In Progress
--   3  conversion/upload returned 200 (handlers.py:158)       -> Completed
--   4  exception, or no page images produced (140, 178)       -> Failed
--   5  upload response was not 200 (handlers.py:164)          -> Upload Failed
--   6  part has no Type=1 drawing to convert (handlers.py:718)-> No Drawing
-- Renumbering these would silently desynchronise the pipeline from the UI, so
-- IDENTITY_INSERT is used to pin them.
--
-- Colors feed the grid's status dot (CostingPartsGrid formatters) and the
-- workspace header chips.
--
-- Idempotent: safe to re-run.

USE RFQ;
GO

SET IDENTITY_INSERT dbo.MasterCostingStatus ON;

INSERT INTO dbo.MasterCostingStatus (ID, Name, Color, InsertDate, InsertUserId, IsActive)
SELECT s.ID, s.Name, s.Color, SYSUTCDATETIME(), 1, 1
FROM (VALUES
    (1, N'Pending',       N'#9ca3af'),
    (2, N'In Progress',   N'#2778b9'),
    (3, N'Completed',     N'#27dc3c'),
    (4, N'Failed',        N'#ff0055'),
    (5, N'Upload Failed', N'#f59e0b'),
    (6, N'No Drawing',    N'#6b7280')
) AS s(ID, Name, Color)
WHERE NOT EXISTS (SELECT 1 FROM dbo.MasterCostingStatus m WHERE m.ID = s.ID);

SET IDENTITY_INSERT dbo.MasterCostingStatus OFF;
GO

-- Keep the identity seed above the pinned rows so future UI-created statuses
-- do not collide with 1-6.
DBCC CHECKIDENT ('dbo.MasterCostingStatus', RESEED) WITH NO_INFOMSGS;
GO

SELECT ID, Name, Color, IsActive FROM dbo.MasterCostingStatus ORDER BY ID;
GO
