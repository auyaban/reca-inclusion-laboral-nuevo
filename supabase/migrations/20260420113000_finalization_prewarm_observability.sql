ALTER TABLE public.form_drafts
  ADD COLUMN IF NOT EXISTS google_prewarm_status text,
  ADD COLUMN IF NOT EXISTS google_prewarm_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_prewarm jsonb;

ALTER TABLE public.form_drafts
  DROP CONSTRAINT IF EXISTS form_drafts_schema_version_check;

UPDATE public.form_drafts
SET schema_version = 3
WHERE schema_version IS NULL OR schema_version < 3;

ALTER TABLE public.form_drafts
  ALTER COLUMN schema_version SET DEFAULT 3,
  ALTER COLUMN schema_version SET NOT NULL;

ALTER TABLE public.form_drafts
  ADD CONSTRAINT form_drafts_schema_version_check
  CHECK (schema_version IN (1, 2, 3));

ALTER TABLE public.form_finalization_requests
  ADD COLUMN IF NOT EXISTS identity_key text,
  ADD COLUMN IF NOT EXISTS stage_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_duration_ms integer,
  ADD COLUMN IF NOT EXISTS profiling_steps jsonb,
  ADD COLUMN IF NOT EXISTS prewarm_status text,
  ADD COLUMN IF NOT EXISTS prewarm_reused boolean,
  ADD COLUMN IF NOT EXISTS prewarm_structure_signature text;

UPDATE public.form_finalization_requests
SET stage_started_at = COALESCE(stage_started_at, updated_at, started_at)
WHERE stage_started_at IS NULL;

CREATE INDEX IF NOT EXISTS form_finalization_requests_user_identity_updated_at_idx
  ON public.form_finalization_requests (user_id, form_slug, identity_key, updated_at DESC);
