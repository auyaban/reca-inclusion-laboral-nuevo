-- ODS #61 - Infraestructura de telemetria silenciosa del motor.
--
-- ODS_TELEMETRY_START_AT se documenta aqui, pero el gate runtime se implementa
-- en #62/#64 desde el caller de Next.js. La base de datos no lee variables de
-- entorno de Vercel.
--
-- Estas RPCs usan SECURITY DEFINER con search_path = '' y referencias
-- fully-qualified public.<objeto>. Es mas estricto que RPCs legacy como
-- ods_insert_atomic y reduce el riesgo de shadowing de objetos por search_path.
--
-- Rollback basico: revoke/drop RPCs y helpers, drop table
-- public.ods_motor_telemetria, y retirar ods_telemetria_admin del CHECK/seed.

alter table public.profesional_roles
  drop constraint if exists profesional_roles_role_check;

alter table public.profesional_roles
  add constraint profesional_roles_role_check
  check (role in (
    'inclusion_empresas_admin',
    'inclusion_empresas_profesional',
    'ods_operador',
    'ods_telemetria_admin'
  ));

insert into public.profesional_roles (profesional_id, role)
select p.id, 'ods_telemetria_admin'
from public.profesionales p
where p.usuario_login = 'aaron_vercel'
on conflict (profesional_id, role) do nothing;

create table if not exists public.ods_motor_telemetria (
  id uuid primary key default gen_random_uuid(),
  ods_id uuid null references public.ods(id) on delete set null,
  -- Nullable por contrato: eventos sin llave idempotente pueden duplicarse si
  -- dos callers concurrentes registran el mismo snapshot. El caller de #62
  -- debe enviar llave cuando necesite dedupe.
  idempotency_key text null,
  import_origin text not null,
  motor_suggestion jsonb not null,
  confidence text not null,
  final_value jsonb null,
  mismatch_fields text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  confirmed_at timestamptz null,
  constraint ods_motor_telemetria_import_origin_check
    check (import_origin in ('acta_pdf', 'acta_excel', 'acta_id_directo', 'manual')),
  constraint ods_motor_telemetria_confidence_check
    check (confidence in ('low', 'medium', 'high')),
  constraint ods_motor_telemetria_motor_suggestion_object_check
    check (jsonb_typeof(motor_suggestion) = 'object'),
  constraint ods_motor_telemetria_final_value_object_check
    check (final_value is null or jsonb_typeof(final_value) = 'object')
);

create index if not exists ods_motor_telemetria_ods_id_idx
  on public.ods_motor_telemetria (ods_id)
  where ods_id is not null;

create index if not exists ods_motor_telemetria_created_at_idx
  on public.ods_motor_telemetria (created_at desc);

create unique index if not exists ods_motor_telemetria_idempotency_key_uniq_idx
  on public.ods_motor_telemetria (idempotency_key)
  where idempotency_key is not null;

alter table public.ods_motor_telemetria enable row level security;

drop policy if exists ods_motor_telemetria_select_admin on public.ods_motor_telemetria;

create policy ods_motor_telemetria_select_admin
  on public.ods_motor_telemetria
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

revoke all on table public.ods_motor_telemetria from anon, authenticated;
grant select on table public.ods_motor_telemetria to authenticated;
grant select, insert, update, delete on table public.ods_motor_telemetria to service_role;

comment on table public.ods_motor_telemetria is
  'Snapshots del motor de codigos ODS; escritura server-only via RPCs.';

create or replace function public.ods_motor_telemetria_canonical_text(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    translate(
      lower(btrim(coalesce(p_value, ''))),
      U&'\00E1\00E0\00E4\00E2\00E3\00E9\00E8\00EB\00EA\00ED\00EC\00EF\00EE\00F3\00F2\00F6\00F4\00F5\00FA\00F9\00FC\00FB\00F1\00E7',
      'aaaaaeeeeiiiiooooouuuunc'
    ),
    '\s+',
    ' ',
    'g'
  );
$$;

create or replace function public.ods_motor_telemetria_numeric_value(p_value jsonb)
returns numeric
language sql
immutable
set search_path = ''
as $$
  with raw as (
    select case
      when p_value is null or p_value = 'null'::jsonb then ''
      when jsonb_typeof(p_value) = 'string' then btrim(p_value #>> '{}')
      else btrim(p_value #>> '{}')
    end as value
  )
  select case
    when value ~ '^-?[0-9]+([,.][0-9]+)?$' then replace(value, ',', '.')::numeric
    else null
  end
  from raw;
$$;

create or replace function public.ods_motor_telemetria_normalized_value(p_value jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  with raw as (
    select case
      when p_value is null or p_value = 'null'::jsonb then ''
      when jsonb_typeof(p_value) = 'string' then p_value #>> '{}'
      else p_value #>> '{}'
    end as value
  )
  select case
    when strpos(value, ';') > 0 then coalesce((
      select string_agg(token_norm, ';' order by token_norm)
      from (
        select public.ods_motor_telemetria_canonical_text(token) as token_norm
        from regexp_split_to_table(value, ';') as token
      ) tokens
      where token_norm <> ''
    ), '')
    else public.ods_motor_telemetria_canonical_text(value)
  end
  from raw;
$$;

create or replace function public.ods_motor_telemetria_values_equal(
  p_motor_value jsonb,
  p_final_value jsonb
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  with normalized as (
    select
      public.ods_motor_telemetria_numeric_value(p_motor_value) as motor_numeric,
      public.ods_motor_telemetria_numeric_value(p_final_value) as final_numeric,
      public.ods_motor_telemetria_normalized_value(p_motor_value) as motor_text,
      public.ods_motor_telemetria_normalized_value(p_final_value) as final_text
  )
  select case
    when motor_numeric is not null and final_numeric is not null
      then abs(motor_numeric - final_numeric) <= 0.01
    else motor_text = final_text
  end
  from normalized;
$$;

create or replace function public.ods_motor_telemetria_mismatch_fields(
  p_motor_suggestion jsonb,
  p_final_value jsonb
)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_key text;
  v_mismatches text[] := '{}'::text[];
  v_ignored text[] := array['confidence', 'rationale', 'rank', 'score'];
begin
  if p_motor_suggestion is null or jsonb_typeof(p_motor_suggestion) is distinct from 'object' then
    return v_mismatches;
  end if;

  for v_key in
    select key
    from jsonb_object_keys(p_motor_suggestion) as keys(key)
    where not (key = any(v_ignored))
    order by key
  loop
    if not public.ods_motor_telemetria_values_equal(
      p_motor_suggestion -> v_key,
      coalesce(p_final_value, '{}'::jsonb) -> v_key
    ) then
      v_mismatches := array_append(v_mismatches, v_key);
    end if;
  end loop;

  return v_mismatches;
end;
$$;

create or replace function public.ods_motor_telemetria_record(
  p_ods_id uuid default null,
  p_import_origin text default null,
  p_motor_suggestion jsonb default null,
  p_confidence text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.ods_motor_telemetria%rowtype;
  v_id uuid;
  v_idempotency_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
begin
  if p_import_origin is null
    or p_import_origin not in ('acta_pdf', 'acta_excel', 'acta_id_directo', 'manual') then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_origin',
      'message', 'Origen de importacion invalido.',
      'data', null
    );
  end if;

  if p_confidence is null or p_confidence not in ('low', 'medium', 'high') then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_confidence',
      'message', 'Confianza del motor invalida.',
      'data', null
    );
  end if;

  if p_motor_suggestion is null or jsonb_typeof(p_motor_suggestion) is distinct from 'object' then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_payload',
      'message', 'motor_suggestion debe ser un objeto JSON.',
      'data', null
    );
  end if;

  if p_ods_id is not null
    and not exists (select 1 from public.ods where id = p_ods_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'ods_not_found',
      'message', 'ODS no encontrada.',
      'data', null
    );
  end if;

  if v_idempotency_key is not null then
    select *
    into v_existing
    from public.ods_motor_telemetria
    where idempotency_key = v_idempotency_key
    for update;

    if found then
      if v_existing.confirmed_at is not null then
        return jsonb_build_object(
          'ok', true,
          'code', 'already_finalized',
          'message', 'La telemetria ya fue confirmada.',
          'data', jsonb_build_object('telemetria_id', v_existing.id)
        );
      end if;

      if v_existing.ods_id is not null
        and p_ods_id is not null
        and v_existing.ods_id is distinct from p_ods_id then
        return jsonb_build_object(
          'ok', false,
          'code', 'ods_id_mismatch',
          'message', 'La telemetria ya esta asociada a otra ODS.',
          'data', jsonb_build_object('telemetria_id', v_existing.id)
        );
      end if;

      update public.ods_motor_telemetria
      set
        ods_id = coalesce(p_ods_id, ods_id),
        import_origin = p_import_origin,
        motor_suggestion = p_motor_suggestion,
        confidence = p_confidence
      where id = v_existing.id
      returning id into v_id;

      return jsonb_build_object(
        'ok', true,
        'code', 'deduped',
        'message', 'Snapshot de telemetria actualizado.',
        'data', jsonb_build_object('telemetria_id', v_id)
      );
    end if;
  end if;

  begin
    insert into public.ods_motor_telemetria (
      ods_id,
      idempotency_key,
      import_origin,
      motor_suggestion,
      confidence
    )
    values (
      p_ods_id,
      v_idempotency_key,
      p_import_origin,
      p_motor_suggestion,
      p_confidence
    )
    returning id into v_id;
  exception
    when unique_violation then
      select *
      into v_existing
      from public.ods_motor_telemetria
      where idempotency_key = v_idempotency_key
      for update;

      if not found then
        return jsonb_build_object(
          'ok', false,
          'code', 'dedupe_conflict',
          'message', 'No se pudo resolver la llave idempotente.',
          'data', null
        );
      end if;

      if v_existing.confirmed_at is not null then
        return jsonb_build_object(
          'ok', true,
          'code', 'already_finalized',
          'message', 'La telemetria ya fue confirmada.',
          'data', jsonb_build_object('telemetria_id', v_existing.id)
        );
      end if;

      if v_existing.ods_id is not null
        and p_ods_id is not null
        and v_existing.ods_id is distinct from p_ods_id then
        return jsonb_build_object(
          'ok', false,
          'code', 'ods_id_mismatch',
          'message', 'La telemetria ya esta asociada a otra ODS.',
          'data', jsonb_build_object('telemetria_id', v_existing.id)
        );
      end if;

      update public.ods_motor_telemetria
      set
        ods_id = coalesce(p_ods_id, ods_id),
        import_origin = p_import_origin,
        motor_suggestion = p_motor_suggestion,
        confidence = p_confidence
      where id = v_existing.id
      returning id into v_id;

      return jsonb_build_object(
        'ok', true,
        'code', 'deduped',
        'message', 'Snapshot de telemetria actualizado.',
        'data', jsonb_build_object('telemetria_id', v_id)
      );
  end;

  return jsonb_build_object(
    'ok', true,
    'code', 'created',
    'message', 'Snapshot de telemetria creado.',
    'data', jsonb_build_object('telemetria_id', v_id)
  );
end;
$$;

create or replace function public.ods_motor_telemetria_finalize(
  p_telemetria_id uuid,
  p_ods_id uuid,
  p_final_value jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.ods_motor_telemetria%rowtype;
  v_mismatch_fields text[] := '{}'::text[];
begin
  if p_telemetria_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_payload',
      'message', 'telemetria_id es requerido.',
      'data', null
    );
  end if;

  if p_final_value is null or jsonb_typeof(p_final_value) is distinct from 'object' then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_payload',
      'message', 'final_value debe ser un objeto JSON.',
      'data', null
    );
  end if;

  select *
  into v_existing
  from public.ods_motor_telemetria
  where id = p_telemetria_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_found',
      'message', 'Telemetria no encontrada.',
      'data', null
    );
  end if;

  if p_ods_id is not null
    and not exists (select 1 from public.ods where id = p_ods_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'ods_not_found',
      'message', 'ODS no encontrada.',
      'data', jsonb_build_object('telemetria_id', v_existing.id)
    );
  end if;

  if v_existing.confirmed_at is not null then
    return jsonb_build_object(
      'ok', true,
      'code', 'already_finalized',
      'message', 'La telemetria ya fue confirmada.',
      'data', jsonb_build_object(
        'telemetria_id', v_existing.id,
        'mismatch_fields', to_jsonb(v_existing.mismatch_fields)
      )
    );
  end if;

  if v_existing.ods_id is not null
    and v_existing.ods_id is distinct from p_ods_id then
    return jsonb_build_object(
      'ok', false,
      'code', 'ods_id_mismatch',
      'message', 'La telemetria no pertenece a la ODS indicada.',
      'data', jsonb_build_object('telemetria_id', v_existing.id)
    );
  end if;

  v_mismatch_fields := public.ods_motor_telemetria_mismatch_fields(
    v_existing.motor_suggestion,
    p_final_value
  );

  update public.ods_motor_telemetria
  set
    ods_id = coalesce(ods_id, p_ods_id),
    final_value = p_final_value,
    mismatch_fields = v_mismatch_fields,
    confirmed_at = now()
  where id = p_telemetria_id;

  return jsonb_build_object(
    'ok', true,
    'code', 'finalized',
    'message', 'Telemetria confirmada.',
    'data', jsonb_build_object(
      'telemetria_id', p_telemetria_id,
      'mismatch_fields', to_jsonb(v_mismatch_fields)
    )
  );
end;
$$;

revoke execute on function public.ods_motor_telemetria_canonical_text(text)
  from public, anon, authenticated;
revoke execute on function public.ods_motor_telemetria_numeric_value(jsonb)
  from public, anon, authenticated;
revoke execute on function public.ods_motor_telemetria_normalized_value(jsonb)
  from public, anon, authenticated;
revoke execute on function public.ods_motor_telemetria_values_equal(jsonb, jsonb)
  from public, anon, authenticated;
revoke execute on function public.ods_motor_telemetria_mismatch_fields(jsonb, jsonb)
  from public, anon, authenticated;
revoke execute on function public.ods_motor_telemetria_record(uuid, text, jsonb, text, text)
  from public, anon, authenticated;
revoke execute on function public.ods_motor_telemetria_finalize(uuid, uuid, jsonb)
  from public, anon, authenticated;

grant execute on function public.ods_motor_telemetria_record(uuid, text, jsonb, text, text)
  to service_role;
grant execute on function public.ods_motor_telemetria_finalize(uuid, uuid, jsonb)
  to service_role;
