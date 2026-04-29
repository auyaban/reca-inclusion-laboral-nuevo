-- E3.1 post-QA: alinear empresa_agregar_nota con las demas RPCs
-- de ciclo de vida bloqueando la fila de empresa antes de insertar el evento.

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

revoke execute on function public.empresa_agregar_nota(uuid, uuid, bigint, text)
  from public, anon, authenticated;

grant execute on function public.empresa_agregar_nota(uuid, uuid, bigint, text)
  to service_role;

comment on function public.empresa_agregar_nota(uuid, uuid, bigint, text) is
  'E3.1 post-QA: agrega nota inmutable bloqueando la empresa activa antes de insertar el evento; server-only via service_role.';
