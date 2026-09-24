-- Purpose: Persistence for the ballooning widget ported from DS_ERP.
--
-- Mirrors DS_ERP's BallooningDrawingItems / BallooningDrawingMaskZones column
-- for column, so the annotation<->row mapping ports across unchanged. What
-- differs is the parent: DS_ERP hangs these off BallooningDrawings, whereas
-- here the drawing IS the costing part, so they hang off CostingParts.
--
-- CostingParts.BalloonStatusID already exists and needs nothing.
--
-- Idempotent: safe to re-run.

USE RFQ;
GO

IF OBJECT_ID('dbo.CostingPartBalloons') IS NULL
BEGIN
    CREATE TABLE dbo.CostingPartBalloons (
        ID                 INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_CostingPartBalloons PRIMARY KEY,
        CostingPartID      INT             NOT NULL,

        -- Identity on the sheet. BalloonNo is text, not a number: notes are
        -- numbered separately from dimensions and DS_ERP allows values like
        -- "12.1" for a split callout.
        BalloonNo          NVARCHAR(20)    NOT NULL,
        PageNumber         INT             NOT NULL CONSTRAINT DF_CPB_PageNumber DEFAULT (1),

        -- Balloon marker position, percent of page (0-100), matching Rect in
        -- BallooningTypes.ts. Percent rather than pixels so a re-render at a
        -- different resolution keeps balloons on their geometry.
        CenterX            DECIMAL(18,6)   NOT NULL,
        CenterY            DECIMAL(18,6)   NOT NULL,
        BalloonColor       NVARCHAR(100)   NULL,
        BalloonSize        DECIMAL(18,6)   NULL,

        -- Bounding box of the annotated text, also percent of page.
        BBoxX1             DECIMAL(18,6)   NOT NULL,
        BBoxY1             DECIMAL(18,6)   NOT NULL,
        BBoxX2             DECIMAL(18,6)   NOT NULL,
        BBoxY2             DECIMAL(18,6)   NOT NULL,

        Symbol             NVARCHAR(MAX)   NULL,
        OriginalSymbol     NVARCHAR(MAX)   NULL,
        UpperTol           NVARCHAR(100)   NULL,
        LowerTol           NVARCHAR(100)   NULL,
        Multiplier         NVARCHAR(100)   NULL,
        Section            NVARCHAR(100)   NULL,
        GridStart          NVARCHAR(50)    NULL,
        GridEnd            NVARCHAR(50)    NULL,

        IsNote             BIT             NULL,
        -- Manual = drawn by a person rather than produced by recognition.
        Manual             BIT             NULL,
        -- Soft delete. DS_ERP keeps balloons the user removed so a re-run of
        -- recognition does not resurrect them; same reasoning here.
        RemovedByUser      BIT             NULL CONSTRAINT DF_CPB_RemovedByUser DEFAULT (0),

        InsertDate         DATETIME        NOT NULL CONSTRAINT DF_CPB_InsertDate DEFAULT (GETDATE()),
        InsertUserId       INT             NOT NULL CONSTRAINT DF_CPB_InsertUserId DEFAULT (1),
        UpdateDate         DATETIME        NULL,
        UpdateUserId       INT             NULL,
        DeleteDate         DATETIME        NULL,
        DeleteUserId       INT             NULL,
        IsActive           SMALLINT        NOT NULL CONSTRAINT DF_CPB_IsActive DEFAULT (1),

        CONSTRAINT FK_CostingPartBalloons_CostingPart
            FOREIGN KEY (CostingPartID) REFERENCES dbo.CostingParts(ID)
    );

    CREATE INDEX IX_CostingPartBalloons_Part
        ON dbo.CostingPartBalloons (CostingPartID, IsActive, PageNumber);
END
GO

IF OBJECT_ID('dbo.CostingPartBalloonMaskZones') IS NULL
BEGIN
    CREATE TABLE dbo.CostingPartBalloonMaskZones (
        ID                 INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_CostingPartBalloonMaskZones PRIMARY KEY,
        CostingPartID      INT             NOT NULL,
        PageNumber         INT             NOT NULL CONSTRAINT DF_CPBMZ_PageNumber DEFAULT (1),

        -- Rectangles blanked out before recognition runs, percent of page.
        MaskX1             DECIMAL(18,6)   NOT NULL,
        MaskY1             DECIMAL(18,6)   NOT NULL,
        MaskX2             DECIMAL(18,6)   NOT NULL,
        MaskY2             DECIMAL(18,6)   NOT NULL,

        InsertDate         DATETIME        NOT NULL CONSTRAINT DF_CPBMZ_InsertDate DEFAULT (GETDATE()),
        InsertUserId       INT             NOT NULL CONSTRAINT DF_CPBMZ_InsertUserId DEFAULT (1),
        UpdateDate         DATETIME        NULL,
        UpdateUserId       INT             NULL,
        DeleteDate         DATETIME        NULL,
        DeleteUserId       INT             NULL,
        IsActive           SMALLINT        NOT NULL CONSTRAINT DF_CPBMZ_IsActive DEFAULT (1),

        CONSTRAINT FK_CostingPartBalloonMaskZones_CostingPart
            FOREIGN KEY (CostingPartID) REFERENCES dbo.CostingParts(ID)
    );

    CREATE INDEX IX_CostingPartBalloonMaskZones_Part
        ON dbo.CostingPartBalloonMaskZones (CostingPartID, IsActive, PageNumber);
END
GO

SELECT t.name AS TableName, COUNT(c.column_id) AS Columns
FROM sys.tables t JOIN sys.columns c ON c.object_id = t.object_id
WHERE t.name IN ('CostingPartBalloons', 'CostingPartBalloonMaskZones')
GROUP BY t.name;
GO
