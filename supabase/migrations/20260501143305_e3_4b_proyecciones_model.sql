-- E3.4b - Modelo server-side de proyecciones.
-- Crea catalogo versionado de servicios proyectables y proyecciones
-- con linea vinculada transaccional para servicios de interprete.

create table if not exists public.proyeccion_servicios (
  service_key text primary key,
  nombre text not null,
  descripcion text,
  proyectable boolean not null default true,
  requiere_cantidad_personas boolean not null default false,
  requiere_numero_seguimiento boolean not null default false,
  requiere_tamano_empresa boolean not null default false,
  sugerir_interprete boolean not null default false,
  modalidad_permitidas text[] not null default array['presencial', 'virtual']::text[],
  orden integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proyeccion_servicios_modalidad_permitidas_check
    check (modalidad_permitidas <@ array['presencial', 'virtual', 'todas_las_modalidades']::text[])
);

create table if not exists public.proyecciones (
  id uuid primary key default gen_random_uuid(),
  parent_projection_id uuid references public.proyecciones(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  profesional_id bigint not null references public.profesionales(id) on delete restrict,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  service_key text not null references public.proyeccion_servicios(service_key),
  estado text not null default 'programada',
  inicio_at timestamptz not null,
  fin_at timestamptz not null,
  duracion_minutos integer not null,
  modalidad text not null,
  cantidad_personas integer,
  numero_seguimiento integer,
  tamano_empresa_bucket text,
  notes text,
  requires_interpreter boolean not null default false,
  interpreter_count integer,
  interpreter_projected_hours numeric(6, 2),
  interpreter_exception_reason text,
  cancel_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proyecciones_estado_check
    check (estado in ('programada', 'cancelada')),
  constraint proyecciones_duracion_minutos_check
    check (duracion_minutos between 1 and 1440),
  constraint proyecciones_fin_after_inicio_check
    check (fin_at > inicio_at),
  constraint proyecciones_modalidad_check
    check (modalidad in ('presencial', 'virtual', 'todas_las_modalidades')),
  constraint proyecciones_cantidad_personas_check
    check (cantidad_personas is null or cantidad_personas > 0),
  constraint proyecciones_numero_seguimiento_check
    check (numero_seguimiento is null or numero_seguimiento between 1 and 6),
  constraint proyecciones_interpreter_count_check
    check (interpreter_count is null or interpreter_count > 0),
  constraint proyecciones_interpreter_hours_check
    check (interpreter_projected_hours is null or interpreter_projected_hours > 0),
  constraint proyecciones_tamano_empresa_bucket_check
    check (
      tamano_empresa_bucket is null
      or tamano_empresa_bucket in ('hasta_50', 'desde_51', 'unknown')
    ),
  constraint proyecciones_interpreter_parent_check
    check (
      (service_key = 'interpreter_service' and parent_projection_id is not null)
      or (service_key <> 'interpreter_service' and parent_projection_id is null)
    ),
  constraint proyecciones_interpreter_modalidad_check
    check (
      (service_key = 'interpreter_service' and modalidad = 'todas_las_modalidades')
      or (service_key <> 'interpreter_service' and modalidad <> 'todas_las_modalidades')
    )
);

alter table public.proyeccion_servicios enable row level security;
alter table public.proyecciones enable row level security;

revoke all on public.proyeccion_servicios from anon, authenticated;
revoke all on public.proyecciones from anon, authenticated;
grant select, insert, update, delete on public.proyeccion_servicios to service_role;
grant select, insert, update, delete on public.proyecciones to service_role;

create index if not exists proyecciones_inicio_idx
  on public.proyecciones (inicio_at, id);

create index if not exists proyecciones_profesional_inicio_idx
  on public.proyecciones (profesional_id, inicio_at desc);

create index if not exists proyecciones_empresa_inicio_idx
  on public.proyecciones (empresa_id, inicio_at desc);

create index if not exists proyecciones_parent_idx
  on public.proyecciones (parent_projection_id)
  where parent_projection_id is not null;

create index if not exists proyecciones_service_inicio_idx
  on public.proyecciones (service_key, inicio_at desc);

insert into public.proyeccion_servicios (
  service_key,
  nombre,
  descripcion,
  proyectable,
  requiere_cantidad_personas,
  requiere_numero_seguimiento,
  requiere_tamano_empresa,
  sugerir_interprete,
  modalidad_permitidas,
  orden
)
values
  ('program_presentation', 'Presentacion del programa', 'Presentacion inicial del programa a la empresa.', true, false, false, false, false, array['presencial', 'virtual']::text[], 10),
  ('program_reactivation', 'Reactivacion', 'Reactivacion o mantenimiento de relacion con la empresa.', true, false, false, false, false, array['presencial', 'virtual']::text[], 20),
  ('accessibility_assessment', 'Evaluacion de accesibilidad', 'Evaluacion de accesibilidad para empresas Compensar.', true, false, false, true, false, array['presencial', 'virtual']::text[], 30),
  ('vacancy_review', 'Condiciones de la vacante', 'Levantamiento de condiciones de la vacante o perfil.', true, false, false, false, false, array['presencial', 'virtual']::text[], 40),
  ('inclusive_selection', 'Seleccion incluyente', 'Proceso de seleccion incluyente.', true, true, false, false, true, array['presencial', 'virtual']::text[], 50),
  ('inclusive_hiring', 'Contratacion incluyente', 'Proceso de contratacion incluyente.', true, true, false, false, true, array['presencial', 'virtual']::text[], 60),
  ('sensibilizacion', 'Sensibilizacion', 'Sensibilizacion a equipos de la empresa.', true, false, false, false, false, array['presencial', 'virtual']::text[], 70),
  ('organizational_induction', 'Induccion organizacional', 'Induccion organizacional.', true, false, false, false, true, array['presencial', 'virtual']::text[], 80),
  ('operational_induction', 'Induccion operativa', 'Induccion operativa asociada a personas contratadas.', true, false, false, false, true, array['presencial', 'virtual']::text[], 90),
  ('follow_up', 'Seguimiento', 'Seguimiento a persona contratada.', true, false, true, false, true, array['presencial', 'virtual']::text[], 100),
  ('interpreter_service', 'Servicio de interpretacion LSC', 'Linea vinculada para servicio de interprete.', true, false, false, false, false, array['todas_las_modalidades']::text[], 110),
  ('failed_visit', 'Visita fallida', 'Resultado operativo diferido, no proyectable en calendario inicial.', false, false, false, false, false, array['presencial', 'virtual']::text[], 900),
  ('special_visit', 'Visita adicional / caso especial', 'Caso especial pendiente de validacion con gerencia.', false, false, false, false, false, array['presencial', 'virtual']::text[], 910)
on conflict (service_key) do update
set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  proyectable = excluded.proyectable,
  requiere_cantidad_personas = excluded.requiere_cantidad_personas,
  requiere_numero_seguimiento = excluded.requiere_numero_seguimiento,
  requiere_tamano_empresa = excluded.requiere_tamano_empresa,
  sugerir_interprete = excluded.sugerir_interprete,
  modalidad_permitidas = excluded.modalidad_permitidas,
  orden = excluded.orden,
  updated_at = now();

create or replace function public.proyeccion_validate_actor(
  p_actor_user_id uuid,
  p_actor_profesional_id bigint
)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profesionales p
    where p.id = p_actor_profesional_id
      and p.auth_user_id = p_actor_user_id
      and p.deleted_at is null
      and exists (
        select 1
        from public.profesional_roles r
        where r.profesional_id = p.id
          and r.role in ('inclusion_empresas_admin', 'inclusion_empresas_profesional')
      )
  );
$$;

create or replace function public.proyeccion_crear(
  p_actor_user_id uuid,
  p_actor_profesional_id bigint,
  p_empresa_id uuid,
  p_service_key text,
  p_inicio_at timestamptz,
  p_duracion_minutos integer,
  p_modalidad text,
  p_cantidad_personas integer default null,
  p_numero_seguimiento integer default null,
  p_tamano_empresa_bucket text default null,
  p_notes text default null,
  p_requires_interpreter boolean default false,
  p_interpreter_count integer default null,
  p_interpreter_projected_hours numeric default null,
  p_interpreter_exception_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_service public.proyeccion_servicios%rowtype;
  v_projection_id uuid;
  v_interpreter_projection_id uuid;
  v_fin_at timestamptz := p_inicio_at + make_interval(mins => p_duracion_minutos);
begin
  if not public.proyeccion_validate_actor(p_actor_user_id, p_actor_profesional_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden', 'message', 'No tienes permiso para realizar esta accion.');
  end if;

  select *
  into v_service
  from public.proyeccion_servicios
  where service_key = p_service_key
    and proyectable is true;

  if not found or p_service_key = 'interpreter_service' then
    return jsonb_build_object('ok', false, 'code', 'invalid_service', 'message', 'Selecciona un servicio valido.');
  end if;

  if not exists (
    select 1 from public.empresas e where e.id = p_empresa_id and e.deleted_at is null
  ) then
    return jsonb_build_object('ok', false, 'code', 'empresa_not_found', 'message', 'Empresa no encontrada.');
  end if;

  if not (p_modalidad = any(v_service.modalidad_permitidas)) then
    return jsonb_build_object('ok', false, 'code', 'invalid_modalidad', 'message', 'Selecciona una modalidad valida.');
  end if;

  if p_requires_interpreter then
    if p_interpreter_count is null or p_interpreter_count <= 0 or p_interpreter_projected_hours is null or p_interpreter_projected_hours <= 0 then
      return jsonb_build_object('ok', false, 'code', 'interpreter_data_required', 'message', 'Indica cuantos interpretes y cuantas horas proyectadas necesitas.');
    end if;

    if not v_service.sugerir_interprete and nullif(btrim(coalesce(p_interpreter_exception_reason, '')), '') is null then
      return jsonb_build_object('ok', false, 'code', 'interpreter_exception_required', 'message', 'Explica por que este servicio requiere interprete.');
    end if;
  end if;

  insert into public.proyecciones (
    empresa_id,
    profesional_id,
    created_by_user_id,
    service_key,
    inicio_at,
    fin_at,
    duracion_minutos,
    modalidad,
    cantidad_personas,
    numero_seguimiento,
    tamano_empresa_bucket,
    notes,
    requires_interpreter,
    interpreter_count,
    interpreter_projected_hours,
    interpreter_exception_reason
  )
  values (
    p_empresa_id,
    p_actor_profesional_id,
    p_actor_user_id,
    p_service_key,
    p_inicio_at,
    v_fin_at,
    p_duracion_minutos,
    p_modalidad,
    p_cantidad_personas,
    p_numero_seguimiento,
    p_tamano_empresa_bucket,
    nullif(btrim(coalesce(p_notes, '')), ''),
    coalesce(p_requires_interpreter, false),
    p_interpreter_count,
    p_interpreter_projected_hours,
    nullif(btrim(coalesce(p_interpreter_exception_reason, '')), '')
  )
  returning id into v_projection_id;

  if p_requires_interpreter then
    insert into public.proyecciones (
      parent_projection_id,
      empresa_id,
      profesional_id,
      created_by_user_id,
      service_key,
      inicio_at,
      fin_at,
      duracion_minutos,
      modalidad,
      interpreter_count,
      interpreter_projected_hours,
      notes
    )
    values (
      v_projection_id,
      p_empresa_id,
      p_actor_profesional_id,
      p_actor_user_id,
      'interpreter_service',
      p_inicio_at,
      v_fin_at,
      p_duracion_minutos,
      'todas_las_modalidades',
      p_interpreter_count,
      p_interpreter_projected_hours,
      'Linea de interprete vinculada a proyeccion principal.'
    )
    returning id into v_interpreter_projection_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', 'created',
    'message', 'Proyeccion creada.',
    'data', jsonb_build_object(
      'id', v_projection_id,
      'interpreterProjectionId', v_interpreter_projection_id
    )
  );
end;
$$;

create or replace function public.proyeccion_actualizar(
  p_projection_id uuid,
  p_actor_user_id uuid,
  p_actor_profesional_id bigint,
  p_service_key text default null,
  p_inicio_at timestamptz default null,
  p_duracion_minutos integer default null,
  p_modalidad text default null,
  p_cantidad_personas integer default null,
  p_numero_seguimiento integer default null,
  p_tamano_empresa_bucket text default null,
  p_notes text default null,
  p_requires_interpreter boolean default null,
  p_interpreter_count integer default null,
  p_interpreter_projected_hours numeric default null,
  p_interpreter_exception_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_projection public.proyecciones%rowtype;
  v_service public.proyeccion_servicios%rowtype;
  v_service_key text;
  v_inicio_at timestamptz;
  v_duracion_minutos integer;
  v_fin_at timestamptz;
  v_modalidad text;
  v_requires_interpreter boolean;
  v_interpreter_projection_id uuid;
begin
  if not public.proyeccion_validate_actor(p_actor_user_id, p_actor_profesional_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden', 'message', 'No tienes permiso para realizar esta accion.');
  end if;

  select *
  into v_projection
  from public.proyecciones
  where id = p_projection_id
    and parent_projection_id is null
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Proyeccion no encontrada.');
  end if;

  if v_projection.estado = 'cancelada' then
    return jsonb_build_object('ok', false, 'code', 'already_cancelled', 'message', 'La proyeccion ya esta cancelada.');
  end if;

  v_service_key := coalesce(nullif(btrim(coalesce(p_service_key, '')), ''), v_projection.service_key);
  v_inicio_at := coalesce(p_inicio_at, v_projection.inicio_at);
  v_duracion_minutos := coalesce(p_duracion_minutos, v_projection.duracion_minutos);
  v_fin_at := v_inicio_at + make_interval(mins => v_duracion_minutos);
  v_modalidad := coalesce(nullif(btrim(coalesce(p_modalidad, '')), ''), v_projection.modalidad);
  v_requires_interpreter := coalesce(p_requires_interpreter, v_projection.requires_interpreter);

  select *
  into v_service
  from public.proyeccion_servicios
  where service_key = v_service_key
    and proyectable is true;

  if not found or v_service_key = 'interpreter_service' then
    return jsonb_build_object('ok', false, 'code', 'invalid_service', 'message', 'Selecciona un servicio valido.');
  end if;

  if not (v_modalidad = any(v_service.modalidad_permitidas)) then
    return jsonb_build_object('ok', false, 'code', 'invalid_modalidad', 'message', 'Selecciona una modalidad valida.');
  end if;

  if v_requires_interpreter then
    if coalesce(p_interpreter_count, v_projection.interpreter_count) is null
      or coalesce(p_interpreter_count, v_projection.interpreter_count) <= 0
      or coalesce(p_interpreter_projected_hours, v_projection.interpreter_projected_hours) is null
      or coalesce(p_interpreter_projected_hours, v_projection.interpreter_projected_hours) <= 0 then
      return jsonb_build_object('ok', false, 'code', 'interpreter_data_required', 'message', 'Indica cuantos interpretes y cuantas horas proyectadas necesitas.');
    end if;

    if not v_service.sugerir_interprete
      and nullif(btrim(coalesce(p_interpreter_exception_reason, v_projection.interpreter_exception_reason, '')), '') is null then
      return jsonb_build_object('ok', false, 'code', 'interpreter_exception_required', 'message', 'Explica por que este servicio requiere interprete.');
    end if;
  end if;

  update public.proyecciones
  set
    service_key = v_service_key,
    inicio_at = v_inicio_at,
    fin_at = v_fin_at,
    duracion_minutos = v_duracion_minutos,
    modalidad = v_modalidad,
    cantidad_personas = p_cantidad_personas,
    numero_seguimiento = p_numero_seguimiento,
    tamano_empresa_bucket = p_tamano_empresa_bucket,
    notes = nullif(btrim(coalesce(p_notes, '')), ''),
    requires_interpreter = v_requires_interpreter,
    interpreter_count = case when v_requires_interpreter then coalesce(p_interpreter_count, v_projection.interpreter_count) else null end,
    interpreter_projected_hours = case when v_requires_interpreter then coalesce(p_interpreter_projected_hours, v_projection.interpreter_projected_hours) else null end,
    interpreter_exception_reason = case
      when v_requires_interpreter then nullif(btrim(coalesce(p_interpreter_exception_reason, v_projection.interpreter_exception_reason, '')), '')
      else null
    end,
    updated_at = now()
  where id = p_projection_id;

  if v_requires_interpreter then
    select id
    into v_interpreter_projection_id
    from public.proyecciones
    where parent_projection_id = p_projection_id
      and service_key = 'interpreter_service'
    for update;

    if found then
      update public.proyecciones
      set
        estado = 'programada',
        inicio_at = v_inicio_at,
        fin_at = v_fin_at,
        duracion_minutos = v_duracion_minutos,
        modalidad = 'todas_las_modalidades',
        interpreter_count = coalesce(p_interpreter_count, v_projection.interpreter_count),
        interpreter_projected_hours = coalesce(p_interpreter_projected_hours, v_projection.interpreter_projected_hours),
        cancelled_at = null,
        cancel_reason = null,
        updated_at = now()
      where id = v_interpreter_projection_id;
    else
      insert into public.proyecciones (
        parent_projection_id,
        empresa_id,
        profesional_id,
        created_by_user_id,
        service_key,
        inicio_at,
        fin_at,
        duracion_minutos,
        modalidad,
        interpreter_count,
        interpreter_projected_hours,
        notes
      )
      select
        p_projection_id,
        empresa_id,
        profesional_id,
        p_actor_user_id,
        'interpreter_service',
        v_inicio_at,
        v_fin_at,
        v_duracion_minutos,
        'todas_las_modalidades',
        coalesce(p_interpreter_count, v_projection.interpreter_count),
        coalesce(p_interpreter_projected_hours, v_projection.interpreter_projected_hours),
        'Linea de interprete vinculada a proyeccion principal.'
      from public.proyecciones
      where id = p_projection_id
      returning id into v_interpreter_projection_id;
    end if;
  else
    update public.proyecciones
    set
      estado = 'cancelada',
      cancelled_at = now(),
      cancel_reason = 'Interprete retirado de la proyeccion principal.',
      updated_at = now()
    where parent_projection_id = p_projection_id
      and service_key = 'interpreter_service'
      and estado <> 'cancelada';
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', 'updated',
    'message', 'Proyeccion actualizada.',
    'data', jsonb_build_object('id', p_projection_id, 'interpreterProjectionId', v_interpreter_projection_id)
  );
end;
$$;

create or replace function public.proyeccion_cancelar(
  p_projection_id uuid,
  p_actor_user_id uuid,
  p_actor_profesional_id bigint,
  p_cancel_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_projection public.proyecciones%rowtype;
begin
  if not public.proyeccion_validate_actor(p_actor_user_id, p_actor_profesional_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden', 'message', 'No tienes permiso para realizar esta accion.');
  end if;

  select *
  into v_projection
  from public.proyecciones
  where id = p_projection_id
    and parent_projection_id is null
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Proyeccion no encontrada.');
  end if;

  if v_projection.estado = 'cancelada' then
    return jsonb_build_object('ok', false, 'code', 'already_cancelled', 'message', 'La proyeccion ya esta cancelada.');
  end if;

  update public.proyecciones
  set
    estado = 'cancelada',
    cancelled_at = coalesce(cancelled_at, now()),
    cancel_reason = nullif(btrim(coalesce(p_cancel_reason, cancel_reason, '')), ''),
    updated_at = now()
  where id = p_projection_id
     or parent_projection_id = p_projection_id;

  return jsonb_build_object(
    'ok', true,
    'code', 'cancelled',
    'message', 'Proyeccion cancelada.',
    'data', jsonb_build_object('id', p_projection_id)
  );
end;
$$;

revoke all on function public.proyeccion_validate_actor(uuid, bigint) from public;
revoke all on function public.proyeccion_crear(uuid, bigint, uuid, text, timestamptz, integer, text, integer, integer, text, text, boolean, integer, numeric, text) from public;
revoke all on function public.proyeccion_actualizar(uuid, uuid, bigint, text, timestamptz, integer, text, integer, integer, text, text, boolean, integer, numeric, text) from public;
revoke all on function public.proyeccion_cancelar(uuid, uuid, bigint, text) from public;

revoke execute on function public.proyeccion_validate_actor(uuid, bigint) from anon, authenticated;
revoke execute on function public.proyeccion_crear(uuid, bigint, uuid, text, timestamptz, integer, text, integer, integer, text, text, boolean, integer, numeric, text) from anon, authenticated;
revoke execute on function public.proyeccion_actualizar(uuid, uuid, bigint, text, timestamptz, integer, text, integer, integer, text, text, boolean, integer, numeric, text) from anon, authenticated;
revoke execute on function public.proyeccion_cancelar(uuid, uuid, bigint, text) from anon, authenticated;

grant execute on function public.proyeccion_validate_actor(uuid, bigint) to service_role;
grant execute on function public.proyeccion_crear(uuid, bigint, uuid, text, timestamptz, integer, text, integer, integer, text, text, boolean, integer, numeric, text) to service_role;
grant execute on function public.proyeccion_actualizar(uuid, uuid, bigint, text, timestamptz, integer, text, integer, integer, text, text, boolean, integer, numeric, text) to service_role;
grant execute on function public.proyeccion_cancelar(uuid, uuid, bigint, text) to service_role;

comment on table public.proyeccion_servicios
  is 'E3.4b: catalogo versionado de servicios proyectables para calendario profesional.';

comment on table public.proyecciones
  is 'E3.4b: proyecciones semanales de profesionales; interpretes se guardan como linea vinculada.';
