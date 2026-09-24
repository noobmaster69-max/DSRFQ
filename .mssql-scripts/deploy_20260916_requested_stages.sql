/*
    DSRFQ - "run only the stages I ticked" (upload dialog), database part
    ==========================================================================
    Target : SQL Server, database RFQ
    Source : DSRFQ.Web/Migrations/DefaultDB/DefaultDB_20260916_1000_RequestedStages.cs

    Run before the new DSRFQ.Web build starts, or let the app apply the
    migration itself - this script does the same work and records it, so
    whichever happens first, the other does nothing.

      * CostingParts.RequestedStages - what the uploader ticked
        ("drawing,costing,ballooning"). NULL = all three, so every existing
        part behaves exactly as before.
      * MasterCostingStatus 7 'Skipped' - a stage nobody asked for, so the grid
        does not show work that will never start.

    Safe to run more than once. The RFQ consumer reads the same column
    (handlers.py: requested_stages).
*/

SET XACT_ABORT ON;
SET NOCOUNT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.CostingParts', 'RequestedStages') IS NULL
    ALTER TABLE dbo.CostingParts ADD RequestedStages nvarchar(100) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.MasterCostingStatus WHERE ID = 7)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.MasterCostingStatus'))
        SET IDENTITY_INSERT dbo.MasterCostingStatus ON;

    INSERT INTO dbo.MasterCostingStatus (ID, Name, Color, InsertDate, InsertUserId, IsActive)
    VALUES (7, 'Skipped', '#8b5cf6', GETDATE(), 1, 1);

    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.MasterCostingStatus'))
        SET IDENTITY_INSERT dbo.MasterCostingStatus OFF;
END
GO

IF OBJECT_ID('dbo.VersionInfo') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.VersionInfo WHERE Version = 20260916100000)
    INSERT INTO dbo.VersionInfo (Version, AppliedOn, Description)
    VALUES (20260916100000, GETUTCDATE(), 'DefaultDB_20260916_1000_RequestedStages');
GO

IF @@TRANCOUNT > 0 COMMIT TRANSACTION;
GO

-- Check: expect 100 (column size), 'Skipped', 1
SELECT COL_LENGTH('dbo.CostingParts', 'RequestedStages') AS RequestedStagesColumn,
       (SELECT Name FROM dbo.MasterCostingStatus WHERE ID = 7) AS Status7,
       (SELECT COUNT(*) FROM dbo.VersionInfo WHERE Version = 20260916100000) AS MigrationRecorded;
