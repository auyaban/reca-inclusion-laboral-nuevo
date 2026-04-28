DO $$
DECLARE
  duplicate_row record;
BEGIN
  SELECT
    form_slug,
    user_id,
    identity_key,
    count(*) AS duplicate_count
  INTO duplicate_row
  FROM public.form_finalization_requests
  WHERE identity_key IS NOT NULL
    AND status IN ('processing', 'succeeded')
  GROUP BY form_slug, user_id, identity_key
  HAVING count(*) > 1
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'Cannot create form_finalization_requests identity uniqueness; duplicate active identity found: form_slug=%, user_id=%, identity_key=%, count=%',
      duplicate_row.form_slug,
      duplicate_row.user_id,
      duplicate_row.identity_key,
      duplicate_row.duplicate_count;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS form_finalization_requests_active_identity_uniq
  ON public.form_finalization_requests (form_slug, user_id, identity_key)
  WHERE identity_key IS NOT NULL
    AND status IN ('processing', 'succeeded');

CREATE OR REPLACE FUNCTION public.claim_form_finalization_request(
  target_idempotency_key text,
  target_form_slug text,
  target_user_id uuid,
  target_identity_key text,
  target_request_hash text,
  target_initial_stage text,
  target_now timestamptz DEFAULT timezone('utc', now()),
  processing_ttl_ms integer DEFAULT 90000
)
RETURNS TABLE (
  claim_decision text,
  request_row jsonb,
  stale_reclaimed boolean,
  previous_stage text,
  previous_external_stage text,
  previous_updated_at timestamptz,
  previous_external_artifacts jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  active_row public.form_finalization_requests%ROWTYPE;
  exact_row public.form_finalization_requests%ROWTYPE;
  previous_row public.form_finalization_requests%ROWTYPE;
  result_row public.form_finalization_requests%ROWTYPE;
  stale_cutoff timestamptz;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'Cannot claim finalization for another user.'
      USING ERRCODE = '42501';
  END IF;

  IF target_identity_key IS NULL OR btrim(target_identity_key) = '' THEN
    RAISE EXCEPTION 'target_identity_key is required.'
      USING ERRCODE = '23502';
  END IF;

  stale_cutoff :=
    target_now - ((GREATEST(processing_ttl_ms, 1)::text || ' milliseconds')::interval);

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      target_form_slug || ':' || target_user_id::text || ':' || target_identity_key,
      0
    )
  );

  SELECT *
  INTO active_row
  FROM public.form_finalization_requests
  WHERE form_slug = target_form_slug
    AND user_id = target_user_id
    AND identity_key = target_identity_key
    AND status IN ('processing', 'succeeded')
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF active_row.status = 'succeeded' THEN
      claim_decision :=
        CASE
          WHEN active_row.response_payload IS NULL THEN 'in_progress'
          ELSE 'replay'
        END;
      request_row := to_jsonb(active_row);
      stale_reclaimed := false;
      previous_stage := NULL;
      previous_external_stage := NULL;
      previous_updated_at := NULL;
      previous_external_artifacts := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    IF active_row.updated_at > stale_cutoff THEN
      claim_decision := 'in_progress';
      request_row := to_jsonb(active_row);
      stale_reclaimed := false;
      previous_stage := NULL;
      previous_external_stage := NULL;
      previous_updated_at := NULL;
      previous_external_artifacts := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    previous_row := active_row;

    IF active_row.idempotency_key = target_idempotency_key THEN
      UPDATE public.form_finalization_requests
      SET
        status = 'processing',
        stage = target_initial_stage,
        stage_started_at = target_now,
        request_hash = target_request_hash,
        response_payload = NULL,
        last_error = NULL,
        identity_key = target_identity_key,
        total_duration_ms = NULL,
        profiling_steps = NULL,
        prewarm_status = NULL,
        prewarm_reused = NULL,
        prewarm_structure_signature = NULL,
        started_at = target_now,
        completed_at = NULL
      WHERE idempotency_key = target_idempotency_key
        AND user_id = target_user_id
      RETURNING *
      INTO result_row;
    ELSE
      UPDATE public.form_finalization_requests
      SET
        status = 'failed',
        stage = 'request.reclaimed_by_identity',
        stage_started_at = target_now,
        last_error = 'Finalizacion stale reemplazada por una nueva solicitud para la misma identidad.',
        completed_at = NULL
      WHERE idempotency_key = active_row.idempotency_key
        AND user_id = target_user_id;

      INSERT INTO public.form_finalization_requests (
        idempotency_key,
        form_slug,
        user_id,
        identity_key,
        status,
        stage,
        stage_started_at,
        request_hash,
        response_payload,
        last_error,
        total_duration_ms,
        profiling_steps,
        prewarm_status,
        prewarm_reused,
        prewarm_structure_signature,
        external_artifacts,
        external_stage,
        externalized_at,
        started_at,
        completed_at
      )
      VALUES (
        target_idempotency_key,
        target_form_slug,
        target_user_id,
        target_identity_key,
        'processing',
        target_initial_stage,
        target_now,
        target_request_hash,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        target_now,
        NULL
      )
      RETURNING *
      INTO result_row;
    END IF;

    claim_decision := 'claimed';
    request_row := to_jsonb(result_row);
    stale_reclaimed := true;
    previous_stage := previous_row.stage;
    previous_external_stage := previous_row.external_stage;
    previous_updated_at := previous_row.updated_at;
    previous_external_artifacts := previous_row.external_artifacts;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT *
  INTO exact_row
  FROM public.form_finalization_requests
  WHERE idempotency_key = target_idempotency_key
    AND user_id = target_user_id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF exact_row.status = 'succeeded' THEN
      claim_decision :=
        CASE
          WHEN exact_row.response_payload IS NULL THEN 'in_progress'
          ELSE 'replay'
        END;
      request_row := to_jsonb(exact_row);
      stale_reclaimed := false;
      previous_stage := NULL;
      previous_external_stage := NULL;
      previous_updated_at := NULL;
      previous_external_artifacts := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    IF exact_row.status = 'processing' AND exact_row.updated_at > stale_cutoff THEN
      claim_decision := 'in_progress';
      request_row := to_jsonb(exact_row);
      stale_reclaimed := false;
      previous_stage := NULL;
      previous_external_stage := NULL;
      previous_updated_at := NULL;
      previous_external_artifacts := NULL;
      RETURN NEXT;
      RETURN;
    END IF;

    previous_row := exact_row;

    UPDATE public.form_finalization_requests
    SET
      status = 'processing',
      stage = target_initial_stage,
      stage_started_at = target_now,
      request_hash = target_request_hash,
      response_payload = NULL,
      last_error = NULL,
      identity_key = target_identity_key,
      total_duration_ms = NULL,
      profiling_steps = NULL,
      prewarm_status = NULL,
      prewarm_reused = NULL,
      prewarm_structure_signature = NULL,
      started_at = target_now,
      completed_at = NULL
    WHERE idempotency_key = target_idempotency_key
      AND user_id = target_user_id
    RETURNING *
    INTO result_row;

    claim_decision := 'claimed';
    request_row := to_jsonb(result_row);
    stale_reclaimed := exact_row.status = 'processing';
    previous_stage := CASE WHEN stale_reclaimed THEN previous_row.stage ELSE NULL END;
    previous_external_stage :=
      CASE WHEN stale_reclaimed THEN previous_row.external_stage ELSE NULL END;
    previous_updated_at := CASE WHEN stale_reclaimed THEN previous_row.updated_at ELSE NULL END;
    previous_external_artifacts :=
      CASE WHEN stale_reclaimed THEN previous_row.external_artifacts ELSE NULL END;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.form_finalization_requests (
    idempotency_key,
    form_slug,
    user_id,
    identity_key,
    status,
    stage,
    stage_started_at,
    request_hash,
    response_payload,
    last_error,
    total_duration_ms,
    profiling_steps,
    prewarm_status,
    prewarm_reused,
    prewarm_structure_signature,
    external_artifacts,
    external_stage,
    externalized_at,
    started_at,
    completed_at
  )
  VALUES (
    target_idempotency_key,
    target_form_slug,
    target_user_id,
    target_identity_key,
    'processing',
    target_initial_stage,
    target_now,
    target_request_hash,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    target_now,
    NULL
  )
  RETURNING *
  INTO result_row;

  claim_decision := 'claimed';
  request_row := to_jsonb(result_row);
  stale_reclaimed := false;
  previous_stage := NULL;
  previous_external_stage := NULL;
  previous_updated_at := NULL;
  previous_external_artifacts := NULL;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_form_finalization_request(
  text,
  text,
  uuid,
  text,
  text,
  text,
  timestamptz,
  integer
) TO authenticated;

CREATE OR REPLACE FUNCTION public.find_draft_prewarm_cleanup_blocker(
  target_form_slug text,
  target_user_id uuid,
  target_identity_key text,
  target_spreadsheet_id text
)
RETURNS TABLE (
  blocker text,
  idempotency_key text,
  status text,
  stage text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  matched_row public.form_finalization_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'Cannot inspect cleanup blockers for another user.'
      USING ERRCODE = '42501';
  END IF;

  IF target_identity_key IS NOT NULL AND btrim(target_identity_key) <> '' THEN
    SELECT *
    INTO matched_row
    FROM public.form_finalization_requests AS requests
    WHERE requests.form_slug = target_form_slug
      AND requests.user_id = target_user_id
      AND requests.identity_key = target_identity_key
      AND requests.status IN ('processing', 'succeeded')
    ORDER BY requests.updated_at DESC
    LIMIT 1;

    IF FOUND THEN
      blocker := 'active_finalization_identity';
      idempotency_key := matched_row.idempotency_key;
      status := matched_row.status;
      stage := matched_row.stage;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  IF target_spreadsheet_id IS NOT NULL AND btrim(target_spreadsheet_id) <> '' THEN
    SELECT *
    INTO matched_row
    FROM public.form_finalization_requests AS requests
    WHERE requests.user_id = target_user_id
      AND requests.status IN ('processing', 'succeeded')
      AND requests.external_artifacts->>'spreadsheetId' = target_spreadsheet_id
    ORDER BY requests.updated_at DESC
    LIMIT 1;

    IF FOUND THEN
      blocker := 'active_finalization_spreadsheet';
      idempotency_key := matched_row.idempotency_key;
      status := matched_row.status;
      stage := matched_row.stage;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_draft_prewarm_cleanup_blocker(
  text,
  uuid,
  text,
  text
) TO authenticated;
