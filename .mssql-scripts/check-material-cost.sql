-- Purpose: why no "Material Cost" line appears on costed parts.
--
-- handlers.py:2165 only inserts one when CostingParts.MaterialID is set AND a
-- MaterialRawMaterialCosts row exists for it. Both are separate ways to end up
-- with a quote that has machining hours but no material. Read-only.

USE RFQ;
GO
SET NOCOUNT ON;
GO

-- 1. What each costed part has to work with.
SELECT '1. per part' AS Step, p.ID, p.PartNumber, p.Material, p.MaterialID,
       p.GrossWeight, p.NetWeight, p.WeightUnit,
       CASE WHEN p.MaterialID IS NULL THEN 'no MaterialID -> skipped'
            WHEN NOT EXISTS (SELECT 1 FROM dbo.MaterialRawMaterialCosts c
                             WHERE c.MaterialID = p.MaterialID AND c.IsActive = 1)
                 THEN 'MaterialID set but no raw-material cost row'
            ELSE 'should have produced a Material Cost line' END AS Verdict,
       (SELECT COUNT(*) FROM dbo.CostingPartCostingResults r
        WHERE r.CostingPartID = p.ID AND r.IsActive = 1 AND r.Name = 'Material Cost') AS MaterialLines
FROM dbo.CostingParts p
WHERE p.IsActive = 1 AND p.CostingStatusID = 3
ORDER BY p.ID DESC;
GO

-- 2. Is the raw-material price table populated at all?
SELECT '2. raw material costs' AS Step, COUNT(*) AS Rows FROM dbo.MaterialRawMaterialCosts WHERE IsActive = 1;
GO

SELECT TOP 20 '2b. rows' AS Step, c.MaterialID, m.Name AS MaterialName, c.UnitPrice,
       cur.Code AS Currency, w.Code AS WeightUnit
FROM dbo.MaterialRawMaterialCosts c
LEFT JOIN dbo.MasterMaterials m ON m.ID = c.MaterialID
LEFT JOIN dbo.MasterCurrencies cur ON cur.ID = c.CurrencyID
LEFT JOIN dbo.MasterWeightUnits w ON w.ID = c.WeightDimensionUnitID
WHERE c.IsActive = 1
ORDER BY c.MaterialID;
GO

-- 3. How many parts have a material NAME but no MaterialID -- i.e. the OCR read
--    something the material master could not be matched to.
SELECT '3. unmatched material text' AS Step, p.Material, COUNT(*) AS Parts
FROM dbo.CostingParts p
WHERE p.IsActive = 1 AND p.MaterialID IS NULL
  AND p.Material IS NOT NULL AND p.Material <> ''
GROUP BY p.Material
ORDER BY Parts DESC;
GO

-- 4. What the material master actually offers to match against.
SELECT '4. master materials' AS Step, COUNT(*) AS Rows FROM dbo.MasterMaterials WHERE IsActive = 1;
GO
SELECT TOP 20 '4b. names' AS Step, ID, Name FROM dbo.MasterMaterials WHERE IsActive = 1 ORDER BY ID;
GO
