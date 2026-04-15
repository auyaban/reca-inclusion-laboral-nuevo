CREATE TABLE IF NOT EXISTS public.form_finalization_requests (
  idempotency_key text PRIMARY KEY,
  form_slug text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('processing', 'succeeded', 'failed')),
  stage text NOT NULL,
  request_hash text NOT NULL,
  response_payload jsonb,
  last_error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_finalization_requests_user_updated_at_idx
  ON public.form_finalization_requests (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS form_finalization_requests_user_form_updated_at_idx
  ON public.form_finalization_requests (user_id, form_slug, updated_at DESC);

CREATE OR REPLACE FUNCTION public.set_form_finalization_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_form_finalization_requests_updated_at
  ON public.form_finalization_requests;

CREATE TRIGGER trg_form_finalization_requests_updated_at
BEFORE UPDATE ON public.form_finalization_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_form_finalization_requests_updated_at();

ALTER TABLE public.form_finalization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_finalization_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own finalization requests"
  ON public.form_finalization_requests;
CREATE POLICY "Users read own finalization requests"
  ON public.form_finalization_requests
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own finalization requests"
  ON public.form_finalization_requests;
CREATE POLICY "Users insert own finalization requests"
  ON public.form_finalization_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own finalization requests"
  ON public.form_finalization_requests;
CREATE POLICY "Users update own finalization requests"
  ON public.form_finalization_requests
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own finalization requests"
  ON public.form_finalization_requests;
CREATE POLICY "Users delete own finalization requests"
  ON public.form_finalization_requests
  FOR DELETE
  USING (auth.uid() = user_id);
