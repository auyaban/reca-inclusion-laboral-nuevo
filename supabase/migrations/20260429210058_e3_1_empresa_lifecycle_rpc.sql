-- E3.1 - Eventos profesionales y mutaciones transaccionales de Empresas.
-- Las funciones quedan disponibles solo para service_role y deben llamarse
-- desde API routes server-side. Clientes anon/authenticated no tienen EXECUTE.

alter table public.empresa_eventos
  drop constraint if exists empresa_eventos_tipo_check;

alter table public.empresa_eventos
  add constraint empresa_eventos_tipo_check
  check (
    tipo in (
      'creacion',
      'edicion',
      'asignacion_gerente',
      'desasignacion_gerente',
      'cambio_estado',
      'eliminacion',
      'reclamada',
      'soltada',
      'quitada',
      'nota'
    )
  );

create index if not exists empresa_eventos_empresa_tipo_created_idx
  on public.empresa_eventos (empresa_id, tipo, created_at desc);

create or replace function public.empresa_reclamar(
  p_empresa_id uuid,
  p_actor_user_id uuid,
  p_actor_profesional_id bigint,
  p_comentario text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor record;
  v_actor_nombre text;
  v_actor_is_admin boolean;
  v_actor_is_profesional boolean;
  v_empresa record;
  v_previous_nombre text;
  v_comment text := nullif(btrim(coalesce(p_comentario, '')), '');
  v_now timestamptz := now();
  v_event jsonb;
  v_events jsonb := '[]'::jsonb;
begin
  select
    p.id,
    p.nombre_profesional,
    p.usuario_login,
    p.correo_profesional
  into v_actor
  from public.profesionales p
  where p.id = p_actor_profesional_id
    and p.auth_user_id = p_actor_user_id
    and p.deleted_at is null;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'No tienes permiso para realizar esta acción.',
      'data', null
    );
  end if;

  v_actor_nombre := coalesce(
    nullif(btrim(v_actor.nombre_profesional), ''),
    nullif(btrim(v_actor.usuario_login), ''),
    nullif(btrim(v_actor.correo_profesional), ''),
    'Profesional'
  );

  select exists (
    select 1
    from public.profesional_roles pr
    where pr.profesional_id = v_actor.id
      and pr.role = 'inclusion_empresas_admin'
  ) into v_actor_is_admin;

  select exists (
    select 1
    from public.profesional_roles pr
    where pr.profesional_id = v_actor.id
      and pr.role = 'inclusion_empresas_profesional'
  ) into v_actor_is_profesional;

  if not (v_actor_is_admin or v_actor_is_profesional) then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'No tienes permiso para realizar esta acción.',
      'data', null
    );
  end if;

  select
    e.id,
    e.estado,
    e.profesional_asignado_id,
    e.profesional_asignado,
    e.correo_profesional
  into v_empresa
  from public.empresas e
  where e.id = p_empresa_id
    and e.deleted_at is null
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_found',
      'message', 'Empresa no encontrada.',
      'data', null
    );
  end if;

  if v_empresa.profesional_asignado_id = v_actor.id then
    return jsonb_build_object(
      'ok', true,
      'code', 'unchanged',
      'message', 'La empresa ya está asignada a este profesional.',
      'data', jsonb_build_object(
        'empresaId', v_empresa.id,
        'estado', v_empresa.estado,
        'profesionalAsignadoId', v_empresa.profesional_asignado_id,
        'profesionalAsignado', v_empresa.profesional_asignado,
        'updatedAt', null,
        'events', v_events,
        'unchanged', true
      )
    );
  end if;

  if v_empresa.profesional_asignado_id is not null and v_comment is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'comment_required',
      'message', 'Agrega un comentario para continuar.',
      'data', null
    );
  end if;

  if v_empresa.profesional_asignado_id is not null then
    select coalesce(
      nullif(btrim(p.nombre_profesional), ''),
      nullif(btrim(p.usuario_login), ''),
      nullif(btrim(p.correo_profesional), ''),
      v_empresa.profesional_asignado,
      'profesional anterior'
    )
    into v_previous_nombre
    from public.profesionales p
    where p.id = v_empresa.profesional_asignado_id;

    v_previous_nombre := coalesce(v_previous_nombre, v_empresa.profesional_asignado, 'profesional anterior');
  end if;

  update public.empresas
  set
    profesional_asignado_id = v_actor.id,
    profesional_asignado = v_actor_nombre,
    correo_profesional = v_actor.correo_profesional,
    updated_at = v_now
  where id = v_empresa.id;

  if v_empresa.profesional_asignado_id is not null then
    insert into public.empresa_eventos (
      empresa_id,
      tipo,
      actor_user_id,
      actor_profesional_id,
      actor_nombre,
      payload
    )
    values (
      v_empresa.id,
      'quitada',
      p_actor_user_id,
      v_actor.id,
      v_actor_nombre,
      jsonb_build_object(
        'anterior_profesional_id', v_empresa.profesional_asignado_id,
        'anterior_nombre', v_previous_nombre,
        'tomada_por_profesional_id', v_actor.id,
        'tomada_por_nombre', v_actor_nombre,
        'comentario', v_comment
      )
    )
    returning jsonb_build_object('id', id, 'tipo', tipo, 'createdAt', created_at)
    into v_event;

    v_events := v_events || jsonb_build_array(v_event);
  end if;

  insert into public.empresa_eventos (
    empresa_id,
    tipo,
    actor_user_id,
    actor_profesional_id,
    actor_nombre,
    payload
  )
  values (
    v_empresa.id,
    'reclamada',
    p_actor_user_id,
    v_actor.id,
    v_actor_nombre,
    jsonb_build_object(
      'desde_libre', v_empresa.profesional_asignado_id is null,
      'profesional_id', v_actor.id,
      'profesional_nombre', v_actor_nombre,
      'desplazo_a_profesional_id', v_empresa.profesional_asignado_id,
      'desplazo_a_nombre', v_previous_nombre,
      'comentario', v_comment
    )
  )
  returning jsonb_build_object('id', id, 'tipo', tipo, 'createdAt', created_at)
  into v_event;

  v_events := v_events || jsonb_build_array(v_event);

  return jsonb_build_object(
    'ok', true,
    'code', 'claimed',
    'message', 'Empresa reclamada.',
    'data', jsonb_build_object(
      'empresaId', v_empresa.id,
      'estado', v_empresa.estado,
      'profesionalAsignadoId', v_actor.id,
      'profesionalAsignado', v_actor_nombre,
      'updatedAt', v_now,
      'events', v_events
    )
  );
end;
$$;

create or replace function public.empresa_soltar(
  p_empresa_id uuid,
  p_actor_user_id uuid,
  p_actor_profesional_id bigint,
  p_comentario text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor record;
  v_actor_nombre text;
  v_actor_is_admin boolean;
  v_actor_is_profesional boolean;
  v_empresa record;
  v_comment text := nullif(btrim(coalesce(p_comentario, '')), '');
  v_now timestamptz := now();
  v_event jsonb;
  v_events jsonb := '[]'::jsonb;
begin
  if v_comment is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'comment_required',
      'message', 'Agrega un comentario para continuar.',
      'data', null
    );
  end if;

  select
    p.id,
    p.nombre_profesional,
    p.usuario_login,
    p.correo_profesional
  into v_actor
  from public.profesionales p
  where p.id = p_actor_profesional_id
    and p.auth_user_id = p_actor_user_id
    and p.deleted_at is null;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'No tienes permiso para realizar esta acción.',
      'data', null
    );
  end if;

  v_actor_nombre := coalesce(
    nullif(btrim(v_actor.nombre_profesional), ''),
    nullif(btrim(v_actor.usuario_login), ''),
    nullif(btrim(v_actor.correo_profesional), ''),
    'Profesional'
  );

  select exists (
    select 1 from public.profesional_roles pr
    where pr.profesional_id = v_actor.id
      and pr.role = 'inclusion_empresas_admin'
  ) into v_actor_is_admin;

  select exists (
    select 1 from public.profesional_roles pr
    where pr.profesional_id = v_actor.id
      and pr.role = 'inclusion_empresas_profesional'
  ) into v_actor_is_profesional;

  if not (v_actor_is_admin or v_actor_is_profesional) then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'No tienes permiso para realizar esta acción.',
      'data', null
    );
  end if;

  select
    e.id,
    e.estado,
    e.profesional_asignado_id,
    e.profesional_asignado
  into v_empresa
  from public.empresas e
  where e.id = p_empresa_id
    and e.deleted_at is null
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_found',
      'message', 'Empresa no encontrada.',
      'data', null
    );
  end if;

  if v_empresa.profesional_asignado_id is null then
    return jsonb_build_object(
      'ok', true,
      'code', 'unchanged',
      'message', 'La empresa ya está libre.',
      'data', jsonb_build_object(
        'empresaId', v_empresa.id,
        'estado', v_empresa.estado,
        'profesionalAsignadoId', null,
        'profesionalAsignado', null,
        'updatedAt', null,
        'events', v_events,
        'unchanged', true
      )
    );
  end if;

  if not v_actor_is_admin and v_empresa.profesional_asignado_id is distinct from v_actor.id then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'No tienes permiso para realizar esta acción.',
      'data', null
    );
  end if;

  update public.empresas
  set
    profesional_asignado_id = null,
    profesional_asignado = null,
    correo_profesional = null,
    updated_at = v_now
  where id = v_empresa.id;

  insert into public.empresa_eventos (
    empresa_id,
    tipo,
    actor_user_id,
    actor_profesional_id,
    actor_nombre,
    payload
  )
  values (
    v_empresa.id,
    'soltada',
    p_actor_user_id,
    v_actor.id,
    v_actor_nombre,
    jsonb_build_object(
      'profesional_id', v_empresa.profesional_asignado_id,
      'profesional_nombre', coalesce(v_empresa.profesional_asignado, v_actor_nombre),
      'comentario', v_comment
    )
  )
  returning jsonb_build_object('id', id, 'tipo', tipo, 'createdAt', created_at)
  into v_event;

  v_events := v_events || jsonb_build_array(v_event);

  return jsonb_build_object(
    'ok', true,
    'code', 'released',
    'message', 'Empresa soltada.',
    'data', jsonb_build_object(
      'empresaId', v_empresa.id,
      'estado', v_empresa.estado,
      'profesionalAsignadoId', null,
      'profesionalAsignado', null,
      'updatedAt', v_now,
      'events', v_events
    )
  );
end;
$$;

create or replace function public.empresa_cambiar_estado_operativo(
  p_empresa_id uuid,
  p_actor_user_id uuid,
  p_actor_profesional_id bigint,
  p_estado text,
  p_comentario text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor record;
  v_actor_nombre text;
  v_actor_is_admin boolean;
  v_actor_is_profesional boolean;
  v_empresa record;
  v_estado text := nullif(btrim(coalesce(p_estado, '')), '');
  v_comment text := nullif(btrim(coalesce(p_comentario, '')), '');
  v_now timestamptz := now();
  v_event jsonb;
  v_events jsonb := '[]'::jsonb;
begin
  if v_estado is null or v_estado not in ('Activa', 'En Proceso', 'Pausada', 'Cerrada', 'Inactiva') then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_state',
      'message', 'Selecciona un estado válido.',
      'data', null
    );
  end if;

  if v_comment is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'comment_required',
      'message', 'Agrega un comentario para continuar.',
      'data', null
    );
  end if;

  select
    p.id,
    p.nombre_profesional,
    p.usuario_login,
    p.correo_profesional
  into v_actor
  from public.profesionales p
  where p.id = p_actor_profesional_id
    and p.auth_user_id = p_actor_user_id
    and p.deleted_at is null;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'No tienes permiso para realizar esta acción.',
      'data', null
    );
  end if;

  v_actor_nombre := coalesce(
    nullif(btrim(v_actor.nombre_profesional), ''),
    nullif(btrim(v_actor.usuario_login), ''),
    nullif(btrim(v_actor.correo_profesional), ''),
    'Profesional'
  );

  select exists (
    select 1 from public.profesional_roles pr
    where pr.profesional_id = v_actor.id
      and pr.role = 'inclusion_empresas_admin'
  ) into v_actor_is_admin;

  select exists (
    select 1 from public.profesional_roles pr
    where pr.profesional_id = v_actor.id
      and pr.role = 'inclusion_empresas_profesional'
  ) into v_actor_is_profesional;

  if not (v_actor_is_admin or v_actor_is_profesional) then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'No tienes permiso para realizar esta acción.',
      'data', null
    );
  end if;

  select
    e.id,
    e.estado,
    e.profesional_asignado_id,
    e.profesional_asignado
  into v_empresa
  from public.empresas e
  where e.id = p_empresa_id
    and e.deleted_at is null
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_found',
      'message', 'Empresa no encontrada.',
      'data', null
    );
  end if;

  if not v_actor_is_admin and v_empresa.profesional_asignado_id is distinct from v_actor.id then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'No tienes permiso para realizar esta acción.',
      'data', null
    );
  end if;

  if v_empresa.estado is not distinct from v_estado then
    return jsonb_build_object(
      'ok', true,
      'code', 'unchanged',
      'message', 'La empresa ya tiene este estado.',
      'data', jsonb_build_object(
        'empresaId', v_empresa.id,
        'estado', v_empresa.estado,
        'profesionalAsignadoId', v_empresa.profesional_asignado_id,
        'profesionalAsignado', v_empresa.profesional_asignado,
        'updatedAt', null,
        'events', v_events,
        'unchanged', true
      )
    );
  end if;

  update public.empresas
  set
    estado = v_estado,
    updated_at = v_now
  where id = v_empresa.id;

  insert into public.empresa_eventos (
    empresa_id,
    tipo,
    actor_user_id,
    actor_profesional_id,
    actor_nombre,
    payload
  )
  values (
    v_empresa.id,
    'cambio_estado',
    p_actor_user_id,
    v_actor.id,
    v_actor_nombre,
    jsonb_build_object(
      'desde', v_empresa.estado,
      'hacia', v_estado,
      'comentario', v_comment
    )
  )
  returning jsonb_build_object('id', id, 'tipo', tipo, 'createdAt', created_at)
  into v_event;

  v_events := v_events || jsonb_build_array(v_event);

  return jsonb_build_object(
    'ok', true,
    'code', 'state_changed',
    'message', 'Estado actualizado.',
    'data', jsonb_build_object(
      'empresaId', v_empresa.id,
      'estado', v_estado,
      'profesionalAsignadoId', v_empresa.profesional_asignado_id,
      'profesionalAsignado', v_empresa.profesional_asignado,
      'updatedAt', v_now,
      'events', v_events
    )
  );
end;
$$;

create or replace function public.empresa_agregar_nota(
  p_empresa_id uuid,
  p_actor_user_id uuid,
  p_actor_profesional_id bigint,
  p_contenido text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor record;
  v_actor_nombre text;
  v_actor_is_admin boolean;
  v_actor_is_profesional boolean;
  v_empresa record;
  v_content text := nullif(btrim(coalesce(p_contenido, '')), '');
  v_event jsonb;
  v_events jsonb := '[]'::jsonb;
begin
  if v_content is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'empty_note',
      'message', 'Escribe una nota antes de guardarla.',
      'data', null
    );
  end if;

  select
    p.id,
    p.nombre_profesional,
    p.usuario_login,
    p.correo_profesional
  into v_actor
  from public.profesionales p
  where p.id = p_actor_profesional_id
    and p.auth_user_id = p_actor_user_id
    and p.deleted_at is null;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'No tienes permiso para realizar esta acción.',
      'data', null
    );
  end if;

  v_actor_nombre := coalesce(
    nullif(btrim(v_actor.nombre_profesional), ''),
    nullif(btrim(v_actor.usuario_login), ''),
    nullif(btrim(v_actor.correo_profesional), ''),
    'Profesional'
  );

  select exists (
    select 1 from public.profesional_roles pr
    where pr.profesional_id = v_actor.id
      and pr.role = 'inclusion_empresas_admin'
  ) into v_actor_is_admin;

  select exists (
    select 1 from public.profesional_roles pr
    where pr.profesional_id = v_actor.id
      and pr.role = 'inclusion_empresas_profesional'
  ) into v_actor_is_profesional;

  if not (v_actor_is_admin or v_actor_is_profesional) then
    return jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'No tienes permiso para realizar esta acción.',
      'data', null
    );
  end if;

  select
    e.id,
    e.estado,
    e.profesional_asignado_id,
    e.profesional_asignado
  into v_empresa
  from public.empresas e
  where e.id = p_empresa_id
    and e.deleted_at is null;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_found',
      'message', 'Empresa no encontrada.',
      'data', null
    );
  end if;

  insert into public.empresa_eventos (
    empresa_id,
    tipo,
    actor_user_id,
    actor_profesional_id,
    actor_nombre,
    payload
  )
  values (
    v_empresa.id,
    'nota',
    p_actor_user_id,
    v_actor.id,
    v_actor_nombre,
    jsonb_build_object('contenido', v_content)
  )
  returning jsonb_build_object('id', id, 'tipo', tipo, 'createdAt', created_at)
  into v_event;

  v_events := v_events || jsonb_build_array(v_event);

  return jsonb_build_object(
    'ok', true,
    'code', 'note_added',
    'message', 'Nota guardada.',
    'data', jsonb_build_object(
      'empresaId', v_empresa.id,
      'estado', v_empresa.estado,
      'profesionalAsignadoId', v_empresa.profesional_asignado_id,
      'profesionalAsignado', v_empresa.profesional_asignado,
      'updatedAt', null,
      'events', v_events
    )
  );
end;
$$;

revoke execute on function public.empresa_reclamar(uuid, uuid, bigint, text) from public, anon, authenticated;
revoke execute on function public.empresa_soltar(uuid, uuid, bigint, text) from public, anon, authenticated;
revoke execute on function public.empresa_cambiar_estado_operativo(uuid, uuid, bigint, text, text) from public, anon, authenticated;
revoke execute on function public.empresa_agregar_nota(uuid, uuid, bigint, text) from public, anon, authenticated;

grant execute on function public.empresa_reclamar(uuid, uuid, bigint, text) to service_role;
grant execute on function public.empresa_soltar(uuid, uuid, bigint, text) to service_role;
grant execute on function public.empresa_cambiar_estado_operativo(uuid, uuid, bigint, text, text) to service_role;
grant execute on function public.empresa_agregar_nota(uuid, uuid, bigint, text) to service_role;

comment on function public.empresa_reclamar(uuid, uuid, bigint, text) is
  'E3.1: reclama empresas y registra eventos quitada/reclamada de forma transaccional; server-only via service_role.';
comment on function public.empresa_soltar(uuid, uuid, bigint, text) is
  'E3.1: suelta empresas asignadas y registra evento soltada de forma transaccional; server-only via service_role.';
comment on function public.empresa_cambiar_estado_operativo(uuid, uuid, bigint, text, text) is
  'E3.1: cambia estado operativo con comentario obligatorio y evento atómico; server-only via service_role.';
comment on function public.empresa_agregar_nota(uuid, uuid, bigint, text) is
  'E3.1: agrega nota inmutable a empresa_eventos sin mutar la empresa; server-only via service_role.';
