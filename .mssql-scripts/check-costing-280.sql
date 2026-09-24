-- Purpose: is every part really costing the same, and if so, which inputs are
-- identical? Read-only.

USE RFQ;
GO
SET NOCOUNT ON;
GO

SELECT '0. CostingParts columns' AS Step, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'CostingParts'
  AND (COLUMN_NAME LIKE '%Weight%' OR COLUMN_NAME LIKE '%Volume%'
    OR COLUMN_NAME LIKE '%Length%' OR COLUMN_NAME LIKE '%Width%'
    OR COLUMN_NAME LIKE '%Height%' OR COLUMN_NAME LIKE '%Surface%'
    OR COLUMN_NAME LIKE '%Material%')
ORDER BY COLUMN_NAME;
GO

-- The geometry the costing was calculated from, per part.
SELECT '1. geometry' AS Step, p.ID, p.PartNumber, p.Length, p.Width, p.Height,
       p.Material, p.MaterialID, p.DimensionUnitID,
       (SELECT SUM(r.Total) FROM dbo.CostingPartCostingResults r
        WHERE r.CostingPartID = p.ID AND r.IsActive = 1) AS Total
FROM dbo.CostingParts p
WHERE p.IsActive = 1
  AND EXISTS (SELECT 1 FROM dbo.CostingPartCostingResults r
              WHERE r.CostingPartID = p.ID AND r.IsActive = 1)
ORDER BY p.ID DESC;
GO

-- Every line of every costed part, to see whether the hours are identical too.
SELECT '2. all lines' AS Step, r.CostingPartID, r.Name, r.Quantity,
       r.UnitPrice, r.Total
FROM dbo.CostingPartCostingResults r
WHERE r.IsActive = 1 AND r.Total > 0
ORDER BY r.CostingPartID DESC, r.ID;
GO
