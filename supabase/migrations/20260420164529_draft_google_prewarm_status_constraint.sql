BEGIN;

UPDATE public.form_drafts
SET google_prewarm_status = NULL
WHERE google_prewarm_status IS NOT NULL
  AND google_prewarm_status NOT IN (
    'idle',
    'preparing',
    'ready',
    'failed',
    'stale',
    'finalized'
  );

ALTER TABLE public.form_drafts
  DROP CONSTRAINT IF EXISTS form_drafts_google_prewarm_status_check;

ALTER TABLE public.form_drafts
  ADD CONSTRAINT form_drafts_google_prewarm_status_check
  CHECK (
    google_prewarm_status IN (
      'idle',
      'preparing',
      'ready',
      'failed',
      'stale',
      'finalized'
    )
    OR google_prewarm_status IS NULL
  );

COMMIT;
