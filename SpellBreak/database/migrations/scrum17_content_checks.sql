-- SCRUM-17: let ContentChecks store text and image checks from the AI.
-- Run ONCE in SSMS on your FSDP database (teammates who set up from the new
-- schema.sql don't need this - it already has these changes).
USE FSDP;
GO

-- 1. Allow text and image checks (the old rule only allowed audio/video)
DECLARE @c sysname = (
  SELECT name FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID('ContentChecks') AND definition LIKE '%media_type%'
);
IF @c IS NOT NULL EXEC('ALTER TABLE ContentChecks DROP CONSTRAINT ' + @c);
ALTER TABLE ContentChecks ADD CONSTRAINT CK_ContentChecks_media_type
  CHECK (media_type IN ('text', 'image', 'audio', 'video'));
GO

-- 2. New columns for the AI result
IF COL_LENGTH('ContentChecks', 'scam_type') IS NULL
  ALTER TABLE ContentChecks ADD scam_type VARCHAR(50) NULL;
IF COL_LENGTH('ContentChecks', 'source') IS NULL
  ALTER TABLE ContentChecks ADD source VARCHAR(30) NULL;
GO

-- 3. Check it worked: should list scam_type and source
SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ContentChecks' AND COLUMN_NAME IN ('scam_type', 'source');
