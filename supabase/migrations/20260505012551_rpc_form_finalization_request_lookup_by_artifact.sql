-- ODS #113: lookup server-only acotado para form_finalization_requests por artefacto Google.
-- Reemplaza queries admin directas de /api/ods/importar sin cambiar el contrato TS:
-- devuelve solo idempotency_key, external_artifacts y response_payload.

create or replace function public.form_finalization_request_lookup_by_artifact(
  p_artifact_kind text,
  p_artifact_id text,
  p_artifact_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
  v_max_rows constant integer := 16;
begin
  if coalesce(p_artifact_kind, '') not in ('google_sheet', 'google_drive_file') then
    return jsonb_build_object('rows', '[]'::jsonb);
  end if;

  if nullif(p_artifact_id, '') is null and nullif(p_artifact_url, '') is null then
    return jsonb_build_object('rows', '[]'::jsonb);
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'idempotency_key', matched.idempotency_key,
        'external_artifacts', matched.external_artifacts,
        'response_payload', matched.response_payload
      )
    ),
    '[]'::jsonb
  )
  into v_rows
  from (
    select
      requests.idempotency_key,
      requests.external_artifacts,
      requests.response_payload
    from public.form_finalization_requests as requests
    where requests.status = 'succeeded'
      and (
        (
          p_artifact_kind = 'google_sheet'
          and (
            (p_artifact_id is not null and p_artifact_id <> '' and requests.external_artifacts->>'spreadsheetId' = p_artifact_id)
            or (p_artifact_url is not null and p_artifact_url <> '' and requests.external_artifacts->>'sheetLink' = p_artifact_url)
            or (p_artifact_url is not null and p_artifact_url <> '' and requests.response_payload->>'sheetLink' = p_artifact_url)
          )
        )
        or (
          p_artifact_kind = 'google_drive_file'
          and (
            (p_artifact_id is not null and p_artifact_id <> '' and requests.external_artifacts->>'pdfFileId' = p_artifact_id)
            or (p_artifact_id is not null and p_artifact_id <> '' and requests.external_artifacts->>'driveFileId' = p_artifact_id)
            or (p_artifact_id is not null and p_artifact_id <> '' and requests.external_artifacts->>'fileId' = p_artifact_id)
            or (p_artifact_id is not null and p_artifact_id <> '' and requests.response_payload->>'pdfFileId' = p_artifact_id)
            or (p_artifact_id is not null and p_artifact_id <> '' and requests.response_payload->>'driveFileId' = p_artifact_id)
            or (p_artifact_id is not null and p_artifact_id <> '' and requests.response_payload->>'fileId' = p_artifact_id)
            or (p_artifact_url is not null and p_artifact_url <> '' and requests.external_artifacts->>'pdfLink' = p_artifact_url)
            or (p_artifact_url is not null and p_artifact_url <> '' and requests.response_payload->>'pdfLink' = p_artifact_url)
          )
        )
      )
    limit v_max_rows
  ) as matched;

  return jsonb_build_object('rows', v_rows);
end;
$$;

revoke execute on function public.form_finalization_request_lookup_by_artifact(text, text, text)
  from public, anon, authenticated;

grant execute on function public.form_finalization_request_lookup_by_artifact(text, text, text)
  to service_role;
