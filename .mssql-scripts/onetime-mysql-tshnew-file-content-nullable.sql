-- MySQL (tsh_new, localhost:3307) -- not SQL Server, despite living beside the
-- other scripts here.
--
-- Purpose: let the costing file upload succeed.
--
-- /file_upload_local_tsh saves the uploaded file to disk and records file_path;
-- it never writes file_content. new_tsh's api.py says so explicitly at line 163:
--   "[修改] 移除 file_content 字段，新数据库不再存储二进制内容"
--   (removed the file_content field; the new database no longer stores binary
--    content)
-- No endpoint in the service writes that column any more.
--
-- The schema imported from C:\Aizera\RPA\mysql is the older one, where
-- file_content is LONGBLOB NOT NULL with no default. With sql_mode including
-- STRICT_TRANS_TABLES, MySQL rejects every insert rather than defaulting it, so
-- both the 3D and 2D uploads failed with:
--   (1364, "Field 'file_content' doesn't have a default value")
--
-- Widening the column to NULL is the minimal fix: it keeps the column for any
-- historical rows or older client that still writes a blob, while letting the
-- current code insert without one. Dropping it would also work but is not
-- reversible in place.
--
-- Idempotent: safe to re-run.

USE tsh_new;

SET @needs_fix := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'tsh_new'
      AND TABLE_NAME   = 'files'
      AND COLUMN_NAME  = 'file_content'
      AND IS_NULLABLE  = 'NO'
);

SET @stmt := IF(@needs_fix > 0,
    'ALTER TABLE files MODIFY COLUMN file_content LONGBLOB NULL',
    'SELECT ''file_content is already nullable'' AS note');

PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'tsh_new' AND TABLE_NAME = 'files'
  AND COLUMN_NAME = 'file_content';
