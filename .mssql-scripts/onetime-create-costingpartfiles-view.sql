-- Purpose: one searchable row per uploaded file, carrying everything the
-- pipeline has learned about it.
--
-- The files are already in the system; what was missing is a way to find one.
-- Today the only route is the Drawing Library, which lists PARTS -- so finding
-- "the drawing with the silver plating spec" or "whatever had 0250-32053 in its
-- BOM" means opening parts one at a time.
--
-- A view rather than a table: every column here is already stored somewhere, and
-- a second copy would need maintaining by the consumer and would go stale the
-- moment anyone edited a part in the workspace.
--
-- SearchText is the one piece of denormalisation, and it exists because the
-- interesting metadata lives in CHILD tables. A BOM line's part number and a
-- special process's name are what people actually search for, and neither is on
-- CostingParts. Flattening them here lets a single quick-search box reach them
-- without the grid issuing a correlated query per keystroke.
--
-- Idempotent: safe to re-run.

USE RFQ;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

CREATE OR ALTER VIEW dbo.CostingPartFiles
AS
SELECT
    d.ID                                AS ID,
    d.CostingPartID                     AS CostingPartID,
    d.Type                              AS DocumentType,
    d.FileName                          AS FileName,
    d.FileDirectory                     AS FileDirectory,
    d.ConvertedFileDirectory            AS ConvertedFileDirectory,
    d.InsertDate                        AS UploadedAt,

    p.PartNumber                        AS PartNumber,
    p.Revision                          AS Revision,
    p.Description                       AS Description,
    p.Material                          AS Material,
    p.MaterialID                        AS MaterialID,
    p.CustomerName                      AS CustomerName,
    p.Uom                               AS Uom,
    p.PartPicture                       AS PartPicture,
    p.CostingMachineName                AS CostingMachineName,

    p.Length                            AS Length,
    p.Width                             AS Width,
    p.Height                            AS Height,
    p.GrossWeight                       AS GrossWeight,
    p.NetWeight                         AS NetWeight,
    p.NumberOfFace                      AS NumberOfFace,
    p.NumberOfHole                      AS NumberOfHole,

    p.DrawingConversionStatusID         AS DrawingConversionStatusID,
    p.OcrStatusID                       AS OcrStatusID,
    p.CostingStatusID                   AS CostingStatusID,
    p.BalloonStatusID                   AS BalloonStatusID,

    -- What the pipeline actually managed to extract. These are the columns
    -- that answer "is this file worth opening".
    (SELECT COUNT(*) FROM dbo.CostingPartBomResults b
      WHERE b.CostingPartID = p.ID AND b.IsActive = 1)          AS BomLineCount,
    (SELECT COUNT(*) FROM dbo.CostingPartSpecialProcessResults s
      WHERE s.CostingPartID = p.ID AND s.IsActive = 1)          AS SpecialProcessCount,
    (SELECT COUNT(*) FROM dbo.CostingPartBalloons bl
      WHERE bl.CostingPartID = p.ID AND bl.IsActive = 1)        AS BalloonCount,
    (SELECT SUM(r.Total) FROM dbo.CostingPartCostingResults r
      WHERE r.CostingPartID = p.ID AND r.IsActive = 1)          AS CostingTotal,

    -- The same drawing gets uploaded again and again -- 0023-48968_02 is parts
    -- 3, 6 and 7. Counting siblings lets the page say so instead of showing
    -- three rows that look like three different files.
    (SELECT COUNT(*) FROM dbo.CostingPartDocuments d2
      WHERE d2.IsActive = 1 AND d2.FileName = d.FileName
        AND d2.ID <> d.ID)                                      AS DuplicateCount,

    -- Everything a person might type, in one column. Child-table values are
    -- capped: a part with 400 balloons must not produce a megabyte of text.
    CONCAT_WS(' ',
        d.FileName, p.PartNumber, p.Revision, p.Description,
        p.Material, p.CustomerName, p.CostingMachineName,
        (SELECT TOP 40 STRING_AGG(CONVERT(nvarchar(max),
                CONCAT_WS(' ', b.PartNumber, b.Description,
                          b.InternalEngineeringNumber)), ' ')
           FROM dbo.CostingPartBomResults b
          WHERE b.CostingPartID = p.ID AND b.IsActive = 1),
        (SELECT TOP 40 STRING_AGG(CONVERT(nvarchar(max),
                s.SpecialProcessName), ' ')
           FROM dbo.CostingPartSpecialProcessResults s
          WHERE s.CostingPartID = p.ID AND s.IsActive = 1)
    )                                                           AS SearchText

FROM dbo.CostingPartDocuments d
INNER JOIN dbo.CostingParts p ON p.ID = d.CostingPartID
WHERE d.IsActive = 1 AND p.IsActive = 1;
GO

SELECT TOP 5 ID, CostingPartID, DocumentType, FileName, PartNumber,
       BomLineCount, DuplicateCount, LEN(SearchText) AS SearchLen
FROM dbo.CostingPartFiles ORDER BY ID;
GO
