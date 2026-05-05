-- ODS #75 - Persistencia auditada de fallos best-effort del importador ODS.
--
-- La tabla es append-only para la app: service_role solo recibe SELECT + INSERT.
-- Cualquier limpieza/retencion futura debe pasar por migracion explicita.
--
-- La RPC usa SECURITY DEFINER con search_path = '' y referencias fully-qualified
-- para mantener el patron server-only endurecido de #61/#73.

create table if not exists public.ods_import_failures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  stage text not null,
  error_message text null,
  error_kind text null,
  input_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ods_import_failures_stage_non_empty
    check (btrim(stage) <> ''),
  constraint ods_import_failures_input_summary_object
    check (jsonb_typeof(input_summary) = 'object'),
  constraint ods_import_failures_error_kind_check
    check (error_kind is null or error_kind in ('network', 'permission', 'parser', 'unknown'))
);

create index if not exists ods_import_failures_created_at_idx
  on public.ods_import_failures (created_at desc);

alter table public.ods_import_failures enable row level security;

drop policy if exists ods_import_failures_select_admin on public.ods_import_failures;

create policy ods_import_failures_select_admin
  on public.ods_import_failures
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profesional_roles pr
      join public.profesionales p on p.id = pr.profesional_id
      where p.auth_user_id = auth.uid()
        and pr.role = 'ods_telemetria_admin'
    )
  );

revoke all on table public.ods_import_failures from anon, authenticated;
grant select on table public.ods_import_failures to authenticated;
grant select, insert on table public.ods_import_failures to service_role;

comment on table public.ods_import_failures is
  'Fallos no-sensibles del importador ODS; escritura server-only append-only via RPC.';

create or replace function public.ods_record_import_failure(
  p_stage text,
  p_error_message text,
  p_error_kind text default null,
  p_input_summary jsonb default '{}'::jsonb,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage text := nullif(btrim(coalesce(p_stage, '')), '');
  v_error_kind text := coalesce(nullif(btrim(coalesce(p_error_kind, '')), ''), 'unknown');
  v_input_summary jsonb := coalesce(p_input_summary, '{}'::jsonb);
  v_id uuid;
  v_created_at timestamptz;
begin
  if v_stage is null then
    v_stage := 'unknown';
  end if;

  if v_error_kind not in ('network', 'permission', 'parser', 'unknown') then
    v_error_kind := 'unknown';
  end if;

  if jsonb_typeof(v_input_summary) is distinct from 'object' then
    v_input_summary := '{}'::jsonb;
  end if;

  insert into public.ods_import_failures (
    user_id,
    stage,
    error_message,
    error_kind,
    input_summary
  )
  values (
    coalesce(p_user_id, auth.uid()),
    v_stage,
    nullif(left(coalesce(p_error_message, ''), 500), ''),
    v_error_kind,
    v_input_summary
  )
  returning id, created_at into v_id, v_created_at;

  return jsonb_build_object(
    'id', v_id,
    'created_at', v_created_at
  );
end;
$$;

revoke execute on function public.ods_record_import_failure(text, text, text, jsonb, uuid)
  from public, anon, authenticated;

grant execute on function public.ods_record_import_failure(text, text, text, jsonb, uuid)
  to service_role;
