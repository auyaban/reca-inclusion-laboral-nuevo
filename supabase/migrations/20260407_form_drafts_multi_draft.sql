ALTER TABLE form_drafts
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS empresa_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP INDEX IF EXISTS form_drafts_unique;

CREATE INDEX IF NOT EXISTS form_drafts_user_updated_at_idx
  ON form_drafts (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS form_drafts_user_form_empresa_updated_at_idx
  ON form_drafts (user_id, form_slug, empresa_nit, updated_at DESC);
