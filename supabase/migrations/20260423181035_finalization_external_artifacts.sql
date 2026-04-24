ALTER TABLE public.form_finalization_requests
  ADD COLUMN IF NOT EXISTS external_artifacts jsonb,
  ADD COLUMN IF NOT EXISTS external_stage text,
  ADD COLUMN IF NOT EXISTS externalized_at timestamptz;
