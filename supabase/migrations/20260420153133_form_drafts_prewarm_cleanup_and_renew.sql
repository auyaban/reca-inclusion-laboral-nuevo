-- NOTE:
-- This migration replaces the claim_form_draft_prewarm_lease definition
-- introduced in 20260420143000_form_drafts_prewarm_lease.sql. The older
-- migration remains part of history; this file is the canonical definition.

ALTER TABLE public.form_drafts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_prewarm_cleanup_status text,
  ADD COLUMN IF NOT EXISTS google_prewarm_cleanup_error text;

CREATE INDEX IF NOT EXISTS form_drafts_visible_user_updated_at_idx
  ON public.form_drafts (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_form_draft_prewarm_lease(
  target_draft_id uuid,
  ttl_seconds integer,
  request_id text
)
RETURNS TABLE (
  claimed boolean,
  lease_owner text,
  lease_expires_at timestamptz,
  google_prewarm_status text,
  google_prewarm_updated_at timestamptz,
  google_prewarm jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_draft public.form_drafts%ROWTYPE;
  next_expiry timestamptz := now() + make_interval(secs => GREATEST(COALESCE(ttl_seconds, 1), 1));
BEGIN
  SELECT *
  INTO current_draft
  FROM public.form_drafts
  WHERE id = target_draft_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF current_draft.google_prewarm_lease_owner IS NULL
     OR current_draft.google_prewarm_lease_expires_at IS NULL
     OR current_draft.google_prewarm_lease_expires_at <= now()
     OR current_draft.google_prewarm_lease_owner = request_id THEN
    RETURN QUERY
    UPDATE public.form_drafts
    SET
      google_prewarm_lease_owner = request_id,
      google_prewarm_lease_expires_at = next_expiry
    WHERE id = current_draft.id
    RETURNING
      true,
      public.form_drafts.google_prewarm_lease_owner,
      public.form_drafts.google_prewarm_lease_expires_at,
      public.form_drafts.google_prewarm_status,
      public.form_drafts.google_prewarm_updated_at,
      public.form_drafts.google_prewarm;

    RETURN;
  END IF;

  claimed := false;
  lease_owner := current_draft.google_prewarm_lease_owner;
  lease_expires_at := current_draft.google_prewarm_lease_expires_at;
  google_prewarm_status := current_draft.google_prewarm_status;
  google_prewarm_updated_at := current_draft.google_prewarm_updated_at;
  google_prewarm := current_draft.google_prewarm;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_form_draft_prewarm_lease(
  target_draft_id uuid,
  ttl_seconds integer,
  request_id text
)
RETURNS TABLE (
  claimed boolean,
  lease_owner text,
  lease_expires_at timestamptz,
  google_prewarm_status text,
  google_prewarm_updated_at timestamptz,
  google_prewarm jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_draft public.form_drafts%ROWTYPE;
  next_expiry timestamptz := now() + make_interval(secs => GREATEST(COALESCE(ttl_seconds, 1), 1));
BEGIN
  SELECT *
  INTO current_draft
  FROM public.form_drafts
  WHERE id = target_draft_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF current_draft.google_prewarm_lease_owner = request_id
     AND current_draft.google_prewarm_lease_expires_at IS NOT NULL
     AND current_draft.google_prewarm_lease_expires_at > now() THEN
    RETURN QUERY
    UPDATE public.form_drafts
    SET google_prewarm_lease_expires_at = next_expiry
    WHERE id = current_draft.id
    RETURNING
      true,
      public.form_drafts.google_prewarm_lease_owner,
      public.form_drafts.google_prewarm_lease_expires_at,
      public.form_drafts.google_prewarm_status,
      public.form_drafts.google_prewarm_updated_at,
      public.form_drafts.google_prewarm;

    RETURN;
  END IF;

  claimed := false;
  lease_owner := current_draft.google_prewarm_lease_owner;
  lease_expires_at := current_draft.google_prewarm_lease_expires_at;
  google_prewarm_status := current_draft.google_prewarm_status;
  google_prewarm_updated_at := current_draft.google_prewarm_updated_at;
  google_prewarm := current_draft.google_prewarm;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_form_draft_prewarm_lease(
  target_draft_id uuid,
  request_id text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.form_drafts
  SET
    google_prewarm_lease_owner = NULL,
    google_prewarm_lease_expires_at = NULL
  WHERE id = target_draft_id
    AND user_id = auth.uid()
    AND google_prewarm_lease_owner = request_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_form_draft_prewarm_lease(uuid, integer, text)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.renew_form_draft_prewarm_lease(uuid, integer, text)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.release_form_draft_prewarm_lease(uuid, text)
  TO authenticated, service_role;
