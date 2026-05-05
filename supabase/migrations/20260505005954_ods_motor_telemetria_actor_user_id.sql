-- Mitigacion #82: persistir actor_user_id en snapshots nuevos de
-- ods_motor_telemetria para impedir que un operador finalice snapshots
-- pre-ODS creados por otro operador. Filas legacy con actor_user_id null
-- siguen siendo aceptadas por compatibilidad; no hay backfill en este PR.

alter table public.ods_motor_telemetria
  add column if not exists actor_user_id uuid null;

create index if not exists ods_motor_telemetria_actor_user_id_idx
  on public.ods_motor_telemetria(actor_user_id);

create or replace function public.ods_motor_telemetria_record(
  p_ods_id uuid default null,
  p_import_origin text default null,
  p_motor_suggestion jsonb default null,
  p_confidence text default null,
  p_idempotency_key text default null,
  p_actor_user_id uuid default null
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

      if v_existing.actor_user_id is not null
        and p_actor_user_id is not null
        and v_existing.actor_user_id is distinct from p_actor_user_id then
        return jsonb_build_object(
          'ok', false,
          'code', 'actor_mismatch',
          'message', 'La telemetria pertenece a otro actor.',
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
        actor_user_id = coalesce(actor_user_id, p_actor_user_id),
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
      actor_user_id,
      idempotency_key,
      import_origin,
      motor_suggestion,
      confidence
    )
    values (
      p_ods_id,
      p_actor_user_id,
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

      if v_existing.actor_user_id is not null
        and p_actor_user_id is not null
        and v_existing.actor_user_id is distinct from p_actor_user_id then
        return jsonb_build_object(
          'ok', false,
          'code', 'actor_mismatch',
          'message', 'La telemetria pertenece a otro actor.',
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
        actor_user_id = coalesce(actor_user_id, p_actor_user_id),
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
  p_final_value jsonb,
  p_actor_user_id uuid default null
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

  if v_existing.actor_user_id is not null
    and p_actor_user_id is not null
    and v_existing.actor_user_id is distinct from p_actor_user_id then
    return jsonb_build_object(
      'ok', false,
      'code', 'actor_mismatch',
      'message', 'La telemetria pertenece a otro actor.',
      'data', jsonb_build_object('telemetria_id', v_existing.id)
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

drop function if exists public.ods_motor_telemetria_record(uuid, text, jsonb, text, text);
drop function if exists public.ods_motor_telemetria_finalize(uuid, uuid, jsonb);

revoke execute on function public.ods_motor_telemetria_record(uuid, text, jsonb, text, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.ods_motor_telemetria_finalize(uuid, uuid, jsonb, uuid)
  from public, anon, authenticated;

grant execute on function public.ods_motor_telemetria_record(uuid, text, jsonb, text, text, uuid)
  to service_role;
grant execute on function public.ods_motor_telemetria_finalize(uuid, uuid, jsonb, uuid)
  to service_role;
