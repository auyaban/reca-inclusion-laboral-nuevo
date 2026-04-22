CREATE TABLE IF NOT EXISTS public.seguimientos_bootstrap_leases (
  cedula text PRIMARY KEY,
  lease_owner text NOT NULL,
  lease_expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.seguimientos_bootstrap_leases ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_seguimientos_bootstrap_lease(
  input_cedula text,
  ttl_seconds integer,
  request_id text
)
RETURNS TABLE (
  claimed boolean,
  lease_owner text,
  lease_expires_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_cedula text := btrim(input_cedula);
  normalized_request_id text := btrim(request_id);
  next_expiry timestamptz := timezone('utc', now()) + make_interval(secs => GREATEST(ttl_seconds, 1));
BEGIN
  IF normalized_cedula = '' THEN
    RAISE EXCEPTION 'La cedula del lease es obligatoria.';
  END IF;

  IF normalized_request_id = '' THEN
    RAISE EXCEPTION 'El request_id del lease es obligatorio.';
  END IF;

  INSERT INTO public.seguimientos_bootstrap_leases AS leases (
    cedula,
    lease_owner,
    lease_expires_at,
    updated_at
  )
  VALUES (
    normalized_cedula,
    normalized_request_id,
    next_expiry,
    timezone('utc', now())
  )
  ON CONFLICT (cedula) DO UPDATE
  SET
    lease_owner = EXCLUDED.lease_owner,
    lease_expires_at = EXCLUDED.lease_expires_at,
    updated_at = timezone('utc', now())
  WHERE leases.lease_expires_at <= timezone('utc', now())
     OR leases.lease_owner = normalized_request_id
  RETURNING true, leases.lease_owner, leases.lease_expires_at
  INTO claimed, lease_owner, lease_expires_at;

  IF claimed THEN
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    false,
    leases.lease_owner,
    leases.lease_expires_at
  FROM public.seguimientos_bootstrap_leases AS leases
  WHERE leases.cedula = normalized_cedula;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_seguimientos_bootstrap_lease(
  input_cedula text,
  request_id text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_cedula text := btrim(input_cedula);
  normalized_request_id text := btrim(request_id);
BEGIN
  IF normalized_cedula = '' OR normalized_request_id = '' THEN
    RETURN false;
  END IF;

  DELETE FROM public.seguimientos_bootstrap_leases
  WHERE cedula = normalized_cedula
    AND lease_owner = normalized_request_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_seguimientos_bootstrap_lease(text, integer, text)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.release_seguimientos_bootstrap_lease(text, text)
  TO service_role;
