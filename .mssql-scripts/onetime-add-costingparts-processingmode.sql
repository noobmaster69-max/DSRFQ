-- Purpose: let the person uploading a drawing choose how it gets processed.
--
-- Processing.Mode in RFQ's config.yaml applies to every part, but the right
-- answer differs per drawing: a large multi-page assembly on a busy box wants
-- serial, a small one when nothing else is running is quicker in parallel. The
-- choice belongs with the upload, so it is stored on the part.
--
-- NULL means "use the consumer's configured default", so existing rows and any
-- part created outside the dialog keep working unchanged.
--
-- Idempotent: safe to re-run.

USE RFQ;
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'CostingParts' AND COLUMN_NAME = 'ProcessingMode')
BEGIN
    ALTER TABLE dbo.CostingParts
        ADD ProcessingMode NVARCHAR(20) NULL;
END
GO

SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'CostingParts' AND COLUMN_NAME = 'ProcessingMode';
GO
