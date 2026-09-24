/*
    DSRFQ - database changes since the 2026-09-10 deployment (RFQ.bak, 12:13)
    ==========================================================================
    Target : SQL Server, database RFQ
    Source : DSRFQ.Web/Migrations/DefaultDB/DefaultDB_20260915_1000_BalloonEditorFields.cs
             (the only migration added since the deployment)

    Safe to run more than once: every column is added only if missing, and the
    migration is recorded in dbo.VersionInfo so DSRFQ.Web does not try to apply
    it again on start-up (FluentMigrator would fail on the existing columns).

    No new tables, views, procedures or triggers. MySQL tsh_new (new_tsh) is
    unchanged since Dump20260910.sql.

    Not SQL, but ships alongside (RPA\RFQ\handlers.py): the consumer now
      * inserts CostingPartBalloons.BalloonColor as NULL (was '#27dc3c')
      * sets CostingStatusID / BalloonStatusID back to 1 (Pending) before it
        queues costing / ballooning automatically
*/

SET XACT_ABORT ON;
SET NOCOUNT ON;
BEGIN TRANSACTION;

------------------------------------------------------------------------------
-- 1. CostingPartBalloons: review mark, per-balloon style, One Supply fields
------------------------------------------------------------------------------
IF COL_LENGTH('dbo.CostingPartBalloons', 'Audited') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD Audited bit NOT NULL
        CONSTRAINT DF_CostingPartBalloons_Audited DEFAULT (0);
IF COL_LENGTH('dbo.CostingPartBalloons', 'AuditedOn') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD AuditedOn datetime NULL;
IF COL_LENGTH('dbo.CostingPartBalloons', 'AuditedBy') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD AuditedBy nvarchar(100) NULL;
IF COL_LENGTH('dbo.CostingPartBalloons', 'BalloonShape') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD BalloonShape nvarchar(20) NULL;
IF COL_LENGTH('dbo.CostingPartBalloons', 'BalloonLineWidth') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD BalloonLineWidth int NULL;
IF COL_LENGTH('dbo.CostingPartBalloons', 'BalloonStyle') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD BalloonStyle nvarchar(20) NULL;
IF COL_LENGTH('dbo.CostingPartBalloons', 'TextColor') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD TextColor nvarchar(20) NULL;
IF COL_LENGTH('dbo.CostingPartBalloons', 'ShowArrow') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD ShowArrow bit NULL;
IF COL_LENGTH('dbo.CostingPartBalloons', 'BalloonScale') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD BalloonScale decimal(8, 3) NULL;
IF COL_LENGTH('dbo.CostingPartBalloons', 'BoxHidden') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD BoxHidden bit NOT NULL
        CONSTRAINT DF_CostingPartBalloons_BoxHidden DEFAULT (0);
IF COL_LENGTH('dbo.CostingPartBalloons', 'DimensionFeature') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD DimensionFeature nvarchar(20) NULL;
IF COL_LENGTH('dbo.CostingPartBalloons', 'NumberCategory') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD NumberCategory nvarchar(40) NULL;
IF COL_LENGTH('dbo.CostingPartBalloons', 'ExportMode') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD ExportMode nvarchar(20) NULL;
IF COL_LENGTH('dbo.CostingPartBalloons', 'CropRotation') IS NULL
    ALTER TABLE dbo.CostingPartBalloons ADD CropRotation int NULL;
GO

------------------------------------------------------------------------------
-- 2. Data: the old stamped green means "shop default", not a chosen colour
------------------------------------------------------------------------------
UPDATE dbo.CostingPartBalloons SET BalloonColor = NULL WHERE BalloonColor = '#27dc3c';
PRINT CONCAT('Balloons reset to the shop default colour: ', @@ROWCOUNT);
GO

------------------------------------------------------------------------------
-- 3. CostingPartBalloonGrids: page rotation and drawing frame (page percent)
------------------------------------------------------------------------------
IF COL_LENGTH('dbo.CostingPartBalloonGrids', 'Rotation') IS NULL
    ALTER TABLE dbo.CostingPartBalloonGrids ADD Rotation int NULL;
IF COL_LENGTH('dbo.CostingPartBalloonGrids', 'FrameX1') IS NULL
    ALTER TABLE dbo.CostingPartBalloonGrids ADD FrameX1 decimal(9, 4) NULL;
IF COL_LENGTH('dbo.CostingPartBalloonGrids', 'FrameY1') IS NULL
    ALTER TABLE dbo.CostingPartBalloonGrids ADD FrameY1 decimal(9, 4) NULL;
IF COL_LENGTH('dbo.CostingPartBalloonGrids', 'FrameX2') IS NULL
    ALTER TABLE dbo.CostingPartBalloonGrids ADD FrameX2 decimal(9, 4) NULL;
IF COL_LENGTH('dbo.CostingPartBalloonGrids', 'FrameY2') IS NULL
    ALTER TABLE dbo.CostingPartBalloonGrids ADD FrameY2 decimal(9, 4) NULL;
GO

------------------------------------------------------------------------------
-- 4. MasterSettings: shop-wide ballooning settings (JSON owned by the widget)
------------------------------------------------------------------------------
IF COL_LENGTH('dbo.MasterSettings', 'BubbleStyleJson') IS NULL
    ALTER TABLE dbo.MasterSettings ADD BubbleStyleJson nvarchar(max) NULL;
IF COL_LENGTH('dbo.MasterSettings', 'PartitionOrderJson') IS NULL
    ALTER TABLE dbo.MasterSettings ADD PartitionOrderJson nvarchar(max) NULL;
IF COL_LENGTH('dbo.MasterSettings', 'SymbolFilterJson') IS NULL
    ALTER TABLE dbo.MasterSettings ADD SymbolFilterJson nvarchar(max) NULL;
IF COL_LENGTH('dbo.MasterSettings', 'PdfExportJson') IS NULL
    ALTER TABLE dbo.MasterSettings ADD PdfExportJson nvarchar(max) NULL;
IF COL_LENGTH('dbo.MasterSettings', 'EditorDefaultsJson') IS NULL
    ALTER TABLE dbo.MasterSettings ADD EditorDefaultsJson nvarchar(max) NULL;
GO

------------------------------------------------------------------------------
-- 5. Tell FluentMigrator this migration is done
------------------------------------------------------------------------------
IF OBJECT_ID('dbo.VersionInfo') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.VersionInfo WHERE Version = 20260915100000)
    INSERT INTO dbo.VersionInfo (Version, AppliedOn, Description)
    VALUES (20260915100000, GETUTCDATE(), 'DefaultDB_20260915_1000_BalloonEditorFields');
GO

IF @@TRANCOUNT > 0 COMMIT TRANSACTION;
GO

------------------------------------------------------------------------------
-- Check: expect 14 / 5 / 5 and one VersionInfo row
------------------------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID('dbo.CostingPartBalloons')
        AND name IN ('Audited','AuditedOn','AuditedBy','BalloonShape','BalloonLineWidth','BalloonStyle','TextColor',
                     'ShowArrow','BalloonScale','BoxHidden','DimensionFeature','NumberCategory','ExportMode','CropRotation')) AS BalloonColumns,
    (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID('dbo.CostingPartBalloonGrids')
        AND name IN ('Rotation','FrameX1','FrameY1','FrameX2','FrameY2')) AS GridColumns,
    (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MasterSettings')
        AND name IN ('BubbleStyleJson','PartitionOrderJson','SymbolFilterJson','PdfExportJson','EditorDefaultsJson')) AS SettingsColumns,
    (SELECT COUNT(*) FROM dbo.VersionInfo WHERE Version = 20260915100000) AS MigrationRecorded;
