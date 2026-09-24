-- Purpose: Drawing-conversion template - upload artwork, drag the field boxes,
-- and mark one as Default.
--
-- Mirrors DS_ERP's dbo.ToolTemplateConversion column for column, because this
-- table IS the database form of the constants currently hardcoded in
-- RFQ/function.py::drawing_conversion:
--
--     TABLE_PATH        -> TablePicture
--     ICON_PATH         -> LogoPicture
--     TEMPLATE_COORDS   -> the <Field>X1/Y1/X2/Y2 quads below
--                          "REVISION": [RevisionX1, RevisionY1, RevisionX2, RevisionY2]
--                          "PART NUMBER": [PartNumberX1, ...] and so on
--
-- RPA\API's drawing_conversion() already accepts template_coords/table_path/
-- icon_path as parameters, so once these rows exist the pipeline can be driven
-- from the UI instead of from source constants.
--
-- Idempotent: safe to re-run.

USE RFQ;
GO

-- Filtered indexes require this; sqlcmd defaults it OFF.
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.ToolTemplateConversion') IS NULL
BEGIN
    CREATE TABLE dbo.ToolTemplateConversion (
    ID                    INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_ToolTemplateConversion PRIMARY KEY,
    Name                  NVARCHAR(MAX) NULL,
    -- Uploaded artwork: the title-block table and the logo stamped with it.
    LogoPicture           NVARCHAR(MAX) NULL,
    TablePicture          NVARCHAR(MAX) NULL,
    RevisionX1             DECIMAL(20,2) NULL,
    RevisionY1             DECIMAL(20,2) NULL,
    RevisionX2             DECIMAL(20,2) NULL,
    RevisionY2             DECIMAL(20,2) NULL,
    PartNumberX1           DECIMAL(20,2) NULL,
    PartNumberY1           DECIMAL(20,2) NULL,
    PartNumberX2           DECIMAL(20,2) NULL,
    PartNumberY2           DECIMAL(20,2) NULL,
    DescriptionX1          DECIMAL(20,2) NULL,
    DescriptionY1          DECIMAL(20,2) NULL,
    DescriptionX2          DECIMAL(20,2) NULL,
    DescriptionY2          DECIMAL(20,2) NULL,
    MaterialX1             DECIMAL(20,2) NULL,
    MaterialY1             DECIMAL(20,2) NULL,
    MaterialX2             DECIMAL(20,2) NULL,
    MaterialY2             DECIMAL(20,2) NULL,
    WeightX1               DECIMAL(20,2) NULL,
    WeightY1               DECIMAL(20,2) NULL,
    WeightX2               DECIMAL(20,2) NULL,
    WeightY2               DECIMAL(20,2) NULL,
    AngularToleranceX1     DECIMAL(20,2) NULL,
    AngularToleranceY1     DECIMAL(20,2) NULL,
    AngularToleranceX2     DECIMAL(20,2) NULL,
    AngularToleranceY2     DECIMAL(20,2) NULL,
    SurfaceX1              DECIMAL(20,2) NULL,
    SurfaceY1              DECIMAL(20,2) NULL,
    SurfaceX2              DECIMAL(20,2) NULL,
    SurfaceY2              DECIMAL(20,2) NULL,
    Tolerance1X1           DECIMAL(20,2) NULL,
    Tolerance1Y1           DECIMAL(20,2) NULL,
    Tolerance1X2           DECIMAL(20,2) NULL,
    Tolerance1Y2           DECIMAL(20,2) NULL,
    Tolerance2X1           DECIMAL(20,2) NULL,
    Tolerance2Y1           DECIMAL(20,2) NULL,
    Tolerance2X2           DECIMAL(20,2) NULL,
    Tolerance2Y2           DECIMAL(20,2) NULL,
    Tolerance3X1           DECIMAL(20,2) NULL,
    Tolerance3Y1           DECIMAL(20,2) NULL,
    Tolerance3X2           DECIMAL(20,2) NULL,
    Tolerance3Y2           DECIMAL(20,2) NULL,
    Tolerance4X1           DECIMAL(20,2) NULL,
    Tolerance4Y1           DECIMAL(20,2) NULL,
    Tolerance4X2           DECIMAL(20,2) NULL,
    Tolerance4Y2           DECIMAL(20,2) NULL,
    -- Which template the pipeline picks when nothing else is specified.
    -- int rather than bit to match DS_ERP exactly.
    [Default]             INT      NOT NULL CONSTRAINT DF_TTC_Default DEFAULT (0),
    InsertDate            DATETIME NOT NULL CONSTRAINT DF_TTC_InsertDate   DEFAULT (GETDATE()),
    InsertUserId          INT      NOT NULL CONSTRAINT DF_TTC_InsertUserId DEFAULT (1),
    UpdateDate            DATETIME NULL,
    UpdateUserId          INT      NULL,
    DeleteDate            DATETIME NULL,
    DeleteUserId          INT      NULL,
    IsActive              SMALLINT NOT NULL CONSTRAINT DF_TTC_IsActive DEFAULT (1)
    );

    -- Only one default at a time. Enforced here rather than in app code so a
    -- direct SQL edit cannot create a second one.
END
GO

SET QUOTED_IDENTIFIER ON;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_ToolTemplateConversion_Default')
    CREATE UNIQUE INDEX UX_ToolTemplateConversion_Default
        ON dbo.ToolTemplateConversion ([Default])
        WHERE [Default] = 1 AND IsActive = 1;
GO

SELECT COUNT(*) AS ColumnCount FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ToolTemplateConversion';
GO
