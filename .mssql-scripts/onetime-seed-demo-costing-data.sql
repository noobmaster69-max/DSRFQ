-- Purpose: Sample data so the workspace's Part Detail and Costing panels have
-- something to show. Development only — this is invented, not real costing.
--
-- Targets the newest costing part that has no costing lines yet, so it fills in
-- whatever drawing was uploaded most recently rather than hardcoding an id.
--
-- To undo:
--   DELETE FROM dbo.CostingPartCostingResults        WHERE IsManual = 0 AND Name LIKE 'DEMO %';
--   DELETE FROM dbo.CostingPartBomResults            WHERE Description LIKE 'DEMO %';
--   DELETE FROM dbo.CostingPartSpecialProcessResults WHERE SpecialProcessName LIKE 'DEMO %';
--
-- Idempotent: re-running adds nothing while the demo lines are present.

USE RFQ;
GO

DECLARE @part INT = (
    SELECT TOP 1 p.ID
    FROM dbo.CostingParts p
    WHERE p.IsActive = 1
    ORDER BY p.ID DESC);

IF @part IS NULL
BEGIN
    RAISERROR('No costing part to attach demo data to. Upload a drawing first.', 16, 1);
    RETURN;
END

-- ── Part detail ────────────────────────────────────────────────────────────
-- Only fills blanks, so a real part number or material is never overwritten.
UPDATE dbo.CostingParts
SET PartNumber   = ISNULL(PartNumber,   N'0023-48968'),
    Revision     = ISNULL(Revision,     N'02'),
    Description  = ISNULL(Description,  N'Green standard vacuum chamber lid, machined from plate'),
    CustomerName = ISNULL(CustomerName, N'Applied Materials'),
    Material     = ISNULL(Material,     N'AL 6061-T6'),
    Uom          = ISNULL(Uom,          N'mm'),
    Length       = ISNULL(Length,       340.00),
    Width        = ISNULL(Width,        285.50),
    Height       = ISNULL(Height,        42.00),
    GrossVolume  = ISNULL(GrossVolume,  4078530.00),
    NetVolume    = ISNULL(NetVolume,    2596410.00),
    GrossWeight  = ISNULL(GrossWeight,       11.01),
    NetWeight     = ISNULL(NetWeight,         7.01),
    NumberOfFace = ISNULL(NumberOfFace,      6),
    NumberOfHole = ISNULL(NumberOfHole,     24),
    -- VolumeUnitCode/WeightUnitCode on the row are join expressions onto the
    -- Master*Units tables, not stored columns; these plain-text ones are.
    VolumeUnit   = ISNULL(VolumeUnit,   N'mm3'),
    WeightUnit   = ISNULL(WeightUnit,   N'kg')
WHERE ID = @part;

-- ── Currency lookup ────────────────────────────────────────────────────────
-- CostingPartCostingResults.CurrencyID has an FK to MasterCurrencies, which is
-- empty, and CurrencyCode on the row is a join onto it rather than a stored
-- column. Seed USD so the costing lines can reference it and the UI can resolve
-- the code.
IF NOT EXISTS (SELECT 1 FROM dbo.MasterCurrencies WHERE Code = N'USD')
    INSERT INTO dbo.MasterCurrencies (Code, Name, InsertDate, InsertUserId, IsActive)
    VALUES (N'USD', N'US Dollar', SYSUTCDATETIME(), 1, 1);

DECLARE @usd INT = (SELECT TOP 1 ID FROM dbo.MasterCurrencies WHERE Code = N'USD');

-- ── Costing lines ──────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM dbo.CostingPartCostingResults
               WHERE CostingPartID = @part AND Name LIKE 'DEMO %')
INSERT INTO dbo.CostingPartCostingResults
    (CostingPartID, CostingCategoryID, Name, Description, Quantity, DimensionUnit,
     UnitPrice, Total, CurrencyID, IsTimeUnit, IsManual,
     InsertDate, InsertUserId, IsActive)
VALUES
    (@part, 1, N'DEMO Raw material', N'AL 6061-T6 plate, 350 x 300 x 50', 1, N'pcs', 186.4000, 186.40, @usd, 0, 0, SYSUTCDATETIME(), 1, 1),
    (@part, 2, N'DEMO CNC milling', N'3-axis roughing and finishing', 4.50, N'hr', 68.0000, 306.00, @usd, 1, 0, SYSUTCDATETIME(), 1, 1),
    (@part, 2, N'DEMO CNC drilling', N'24 holes, incl. 8 tapped M6', 1.25, N'hr', 68.0000, 85.00, @usd, 1, 0, SYSUTCDATETIME(), 1, 1),
    (@part, 3, N'DEMO Deburr', N'Manual edge break and clean', 0.75, N'hr', 42.0000, 31.50, @usd, 1, 0, SYSUTCDATETIME(), 1, 1),
    (@part, 4, N'DEMO Anodise', N'Type II clear, per surface area', 1, N'pcs', 54.2500, 54.25, @usd, 0, 0, SYSUTCDATETIME(), 1, 1),
    (@part, 5, N'DEMO Inspection', N'CMM first article, 24 characteristics', 1.50, N'hr', 55.0000, 82.50, @usd, 1, 0, SYSUTCDATETIME(), 1, 1),
    (@part, 6, N'DEMO Packaging', N'Foam-lined crate', 1, N'pcs', 18.0000, 18.00, @usd, 0, 0, SYSUTCDATETIME(), 1, 1);

-- ── BOM ────────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM dbo.CostingPartBomResults
               WHERE CostingPartID = @part AND Description LIKE 'DEMO %')
INSERT INTO dbo.CostingPartBomResults
    (CostingPartID, PartNumber, Description, Quantity, InternalEngineeringNumber,
     IsManual, InsertDate, InsertUserId, IsActive)
VALUES
    (@part, N'0023-48968-1', N'DEMO Lid body, machined',       1, N'TC-114872', 0, SYSUTCDATETIME(), 1, 1),
    (@part, N'3020-01188',   N'DEMO O-ring, Viton, 250mm ID',  1, N'TC-114873', 0, SYSUTCDATETIME(), 1, 1),
    (@part, N'3570-00042',   N'DEMO SHCS M6 x 20, A4-70',     24, N'TC-114874', 0, SYSUTCDATETIME(), 1, 1),
    (@part, N'0190-22214',   N'DEMO Dowel pin, 6h6 x 16',      4, N'TC-114875', 0, SYSUTCDATETIME(), 1, 1);

-- ── Special processes ──────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM dbo.CostingPartSpecialProcessResults
               WHERE CostingPartID = @part AND SpecialProcessName LIKE 'DEMO %')
INSERT INTO dbo.CostingPartSpecialProcessResults
    (CostingPartID, SpecialProcessName, IsManual, InsertDate, InsertUserId, IsActive)
VALUES
    (@part, N'DEMO Anodising, Type II clear',   0, SYSUTCDATETIME(), 1, 1),
    (@part, N'DEMO Passivation per AMS 2700',   0, SYSUTCDATETIME(), 1, 1),
    (@part, N'DEMO Helium leak test, 1e-9',     0, SYSUTCDATETIME(), 1, 1);

-- The demo part is fully costed, so move the statuses off Pending to match.
UPDATE dbo.CostingParts
SET DrawingConversionStatusID = 3,   -- Completed
    OcrStatusID               = 3,
    CostingStatusID           = 3,
    BalloonStatusID           = 2    -- In Progress
WHERE ID = @part;

SELECT CONCAT('seeded part ', @part,
              ' | costing lines = ', (SELECT COUNT(*) FROM dbo.CostingPartCostingResults WHERE CostingPartID = @part),
              ' | bom = ',           (SELECT COUNT(*) FROM dbo.CostingPartBomResults      WHERE CostingPartID = @part),
              ' | processes = ',     (SELECT COUNT(*) FROM dbo.CostingPartSpecialProcessResults WHERE CostingPartID = @part)) AS Result;
GO
