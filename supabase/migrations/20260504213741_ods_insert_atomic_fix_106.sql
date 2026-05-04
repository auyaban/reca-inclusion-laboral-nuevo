-- Hotfix #106: public.ods_insert_atomic no debe insertar columnas inexistentes
-- en public.usuarios_reca. Esta definicion parte de la version idempotente
-- vigente (20260429230001_ods_insert_atomic_idempotent.sql) y conserva:
-- - verificacion previa por session_id
-- - ON CONFLICT (session_id) DO NOTHING sobre public.ods
-- - ON CONFLICT (cedula_usuario) DO NOTHING sobre public.usuarios_reca
--
-- Nota de dominio: cargo_servicio es metadata del evento ODS y se persiste en
-- public.ods. public.usuarios_reca.cargo_oferente es una columna distinta
-- semantica del oferente; no se mapea desde cargo_servicio en este RPC.
-- Rollback P0: re-aplicar la definicion completa de
-- 20260429230001_ods_insert_atomic_idempotent.sql restaura el estado pre-fix.

create or replace function public.ods_insert_atomic(
  p_ods jsonb,
  p_usuarios_nuevos jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_ods_id uuid;
  v_session_id uuid;
  v_existing_id uuid;
  v_usuario jsonb;
begin
  v_session_id := nullif(p_ods->>'session_id', '')::uuid;

  -- Si hay session_id, primero verificar si ya existe (idempotencia)
  if v_session_id is not null then
    select id into v_existing_id from public.ods where session_id = v_session_id limit 1;
    if v_existing_id is not null then
      return jsonb_build_object('ods_id', v_existing_id, 'idempotent', true);
    end if;
  end if;

  -- Insertar usuarios nuevos (BD existing wins). #106: usuarios_reca no tiene
  -- fecha_ingreso ni cargo_servicio; tipo_contrato si existe y se conserva.
  for v_usuario in select * from jsonb_array_elements(p_usuarios_nuevos)
  loop
    insert into public.usuarios_reca (
      cedula_usuario, nombre_usuario, discapacidad_usuario, genero_usuario,
      tipo_contrato
    )
    values (
      v_usuario->>'cedula_usuario', v_usuario->>'nombre_usuario',
      v_usuario->>'discapacidad_usuario', v_usuario->>'genero_usuario',
      v_usuario->>'tipo_contrato'
    )
    on conflict (cedula_usuario) do nothing;
  end loop;

  -- Insertar ODS con ON CONFLICT (session_id) DO NOTHING
  insert into public.ods (
    codigo_servicio, referencia_servicio, descripcion_servicio,
    nombre_profesional, nombre_empresa, nit_empresa,
    caja_compensacion, asesor_empresa, sede_empresa,
    fecha_servicio, fecha_ingreso, mes_servicio, ano_servicio,
    nombre_usuario, cedula_usuario, discapacidad_usuario, genero_usuario,
    modalidad_servicio, todas_modalidades, horas_interprete,
    valor_virtual, valor_bogota, valor_otro, valor_interprete, valor_total,
    tipo_contrato, cargo_servicio, seguimiento_servicio,
    orden_clausulada, total_personas, observaciones, observacion_agencia,
    formato_finalizado_id, user_id, session_id, started_at, submitted_at
  )
  values (
    p_ods->>'codigo_servicio', p_ods->>'referencia_servicio', p_ods->>'descripcion_servicio',
    p_ods->>'nombre_profesional', p_ods->>'nombre_empresa', p_ods->>'nit_empresa',
    p_ods->>'caja_compensacion', p_ods->>'asesor_empresa', p_ods->>'sede_empresa',
    (p_ods->>'fecha_servicio')::date, (p_ods->>'fecha_ingreso')::date,
    (p_ods->>'mes_servicio')::integer, (p_ods->>'ano_servicio')::integer,
    p_ods->>'nombre_usuario', p_ods->>'cedula_usuario',
    p_ods->>'discapacidad_usuario', p_ods->>'genero_usuario',
    p_ods->>'modalidad_servicio',
    (p_ods->>'todas_modalidades')::numeric, (p_ods->>'horas_interprete')::numeric,
    (p_ods->>'valor_virtual')::numeric, (p_ods->>'valor_bogota')::numeric,
    (p_ods->>'valor_otro')::numeric, (p_ods->>'valor_interprete')::numeric,
    (p_ods->>'valor_total')::numeric,
    p_ods->>'tipo_contrato', p_ods->>'cargo_servicio', p_ods->>'seguimiento_servicio',
    (p_ods->>'orden_clausulada')::boolean, (p_ods->>'total_personas')::integer,
    p_ods->>'observaciones', p_ods->>'observacion_agencia',
    (p_ods->>'formato_finalizado_id')::uuid, (p_ods->>'user_id')::uuid,
    v_session_id, (p_ods->>'started_at')::timestamptz, (p_ods->>'submitted_at')::timestamptz
  )
  on conflict (session_id) where session_id is not null do nothing
  returning id into v_ods_id;

  -- Race condition: si ON CONFLICT silencio el insert, leer el id existente
  if v_ods_id is null and v_session_id is not null then
    select id into v_ods_id from public.ods where session_id = v_session_id limit 1;
    return jsonb_build_object('ods_id', v_ods_id, 'idempotent', true);
  end if;

  return jsonb_build_object('ods_id', v_ods_id);
end;
$$;
