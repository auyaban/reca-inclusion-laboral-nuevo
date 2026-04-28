ALTER TABLE form_drafts
  ADD COLUMN IF NOT EXISTS last_checkpoint_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_checkpoint_hash text NULL;

UPDATE form_drafts
SET last_checkpoint_at = COALESCE(updated_at, created_at, now())
WHERE last_checkpoint_at IS NULL
  AND data IS NOT NULL
  AND data <> '{}'::jsonb;
