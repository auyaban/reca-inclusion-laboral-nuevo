ALTER TABLE form_drafts
  ADD COLUMN IF NOT EXISTS schema_version integer;

UPDATE form_drafts
SET schema_version = 2
WHERE schema_version IS NULL;

ALTER TABLE form_drafts
  ALTER COLUMN schema_version SET DEFAULT 2,
  ALTER COLUMN schema_version SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'form_drafts_schema_version_check'
  ) THEN
    ALTER TABLE form_drafts
      ADD CONSTRAINT form_drafts_schema_version_check
      CHECK (schema_version IN (1, 2));
  END IF;
END
$$;
