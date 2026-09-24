/*  CostingPartBalloonAreas - areas that control balloon numbering.

    This is the hand-applied equivalent of

        DSRFQ.Web/Migrations/DefaultDB/
            DefaultDB_20260825_1400_CostingPartBalloonAreas.cs

    applied directly because the running app holds bin\Debug\net8.0\DSRFQ.Web.dll
    open, so the project cannot be rebuilt to let FluentMigrator run it on
    startup. Every column below mirrors that migration exactly; the VersionInfo
    row at the end records it as applied so the migration does not run twice and
    produce a duplicate-object error on the next restart.

    A fresh environment gets this table from the migration, not from here.

    Version number: Serenity turns MigrationKey(20260825_1400) into
    20260825140000 - the key with two zero seconds appended, matching the rows
    already in VersionInfo.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.CostingPartBalloonAreas', 'U') IS NOT NULL
BEGIN
    RAISERROR('CostingPartBalloonAreas already exists - nothing to do.', 10, 1);
    ROLLBACK TRANSACTION;
    RETURN;
END

CREATE TABLE dbo.CostingPartBalloonAreas
(
    ID              int             IDENTITY(1,1) NOT NULL,
    CostingPartID   int             NOT NULL,
    -- 1-based, as in CostingPartBalloons and CostingPartBalloonMaskZones.
    PageNumber      int             NOT NULL,
    -- Which area is numbered first. 1-based and dense per page.
    OrderIndex      int             NOT NULL,
    -- Percent of page (0-100), same convention as the balloon tables.
    AreaX1          decimal(18, 6)  NOT NULL,
    AreaY1          decimal(18, 6)  NOT NULL,
    AreaX2          decimal(18, 6)  NOT NULL,
    AreaY2          decimal(18, 6)  NOT NULL,
    -- partition | left_to_right | right_to_left | top_to_bottom |
    -- bottom_to_top | reading_order | clockwise | counterclockwise |
    -- polar_sweep. Text, not an enum, so a new mode needs no migration and a
    -- retired one still loads.
    SortMode        nvarchar(40)    NOT NULL CONSTRAINT DF_CostingPartBalloonAreas_SortMode DEFAULT ('partition'),
    -- Degrees clockwise from 12 o'clock. Only polar_sweep reads it.
    StartAngle      int             NOT NULL CONSTRAINT DF_CostingPartBalloonAreas_StartAngle DEFAULT (0),
    -- Null falls back to 'Area {OrderIndex}' on the client.
    Label           nvarchar(100)   NULL,
    InsertDate      datetime        NOT NULL,
    InsertUserId    int             NOT NULL,
    UpdateDate      datetime        NULL,
    UpdateUserId    int             NULL,
    DeleteDate      datetime        NULL,
    DeleteUserId    int             NULL,
    IsActive        smallint        NOT NULL CONSTRAINT DF_CostingPartBalloonAreas_IsActive DEFAULT (1),

    CONSTRAINT PK_CostingPartBalloonAreas PRIMARY KEY CLUSTERED (ID)
);

ALTER TABLE dbo.CostingPartBalloonAreas
    ADD CONSTRAINT FK_CostingPartBalloonAreas_CostingPartID
    FOREIGN KEY (CostingPartID) REFERENCES dbo.CostingParts (ID);

-- Every read is "the areas on this page of this part, in order".
CREATE INDEX IX_CostingPartBalloonAreas_Part_Page
    ON dbo.CostingPartBalloonAreas (CostingPartID, PageNumber, OrderIndex);

INSERT INTO dbo.VersionInfo (Version, AppliedOn, Description)
VALUES (20260825140000, GETUTCDATE(),
        'DefaultDB_20260825_1400_CostingPartBalloonAreas');

COMMIT TRANSACTION;

PRINT 'CostingPartBalloonAreas created and recorded in VersionInfo.';
