-- E1-M5b: Fix RPC ods_insert_atomic
-- 1. ON CONFLICT DO UPDATE → DO NOTHING (BD existing wins, igual que legacy)
-- 2. Omitir id de la lista de columnas (DEFAULT gen_random_uuid())
-- 3. Omitir id_servicio (no esta en OdsPayload, no se usa en flujo nuevo)
-- 4. Eliminar variable muerta v_usuario_id

create or replace function public.ods_insert_atomic(
  p_ods jsonb,
  p_usuarios_nuevos jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_ods_id uuid;
  v_usuario jsonb;
begin
  -- 1. Insertar usuarios nuevos (staging) — BD existing wins
  for v_usuario in select * from jsonb_array_elements(p_usuarios_nuevos)
  loop
    insert into public.usuarios_reca (
      cedula_usuario,
      nombre_usuario,
      discapacidad_usuario,
      genero_usuario,
      fecha_ingreso,
      tipo_contrato,
      cargo_servicio
    )
    values (
      v_usuario->>'cedula_usuario',
      v_usuario->>'nombre_usuario',
      v_usuario->>'discapacidad_usuario',
      v_usuario->>'genero_usuario',
      (v_usuario->>'fecha_ingreso')::date,
      v_usuario->>'tipo_contrato',
      v_usuario->>'cargo_servicio'
    )
    on conflict (cedula_usuario) do nothing;
  end loop;

  -- 2. Insertar ODS con columnas explícitas (sin id, sin id_servicio)
  insert into public.ods (
    codigo_servicio,
    referencia_servicio,
    descripcion_servicio,
    nombre_profesional,
    nombre_empresa,
    nit_empresa,
    caja_compensacion,
    asesor_empresa,
    sede_empresa,
    fecha_servicio,
    fecha_ingreso,
    mes_servicio,
    ano_servicio,
    nombre_usuario,
    cedula_usuario,
    discapacidad_usuario,
    genero_usuario,
    modalidad_servicio,
    todas_modalidades,
    horas_interprete,
    valor_virtual,
    valor_bogota,
    valor_otro,
    valor_interprete,
    valor_total,
    tipo_contrato,
    cargo_servicio,
    seguimiento_servicio,
    orden_clausulada,
    total_personas,
    observaciones,
    observacion_agencia,
    formato_finalizado_id,
    user_id,
    session_id,
    started_at,
    submitted_at
  )
  values (
    p_ods->>'codigo_servicio',
    p_ods->>'referencia_servicio',
    p_ods->>'descripcion_servicio',
    p_ods->>'nombre_profesional',
    p_ods->>'nombre_empresa',
    p_ods->>'nit_empresa',
    p_ods->>'caja_compensacion',
    p_ods->>'asesor_empresa',
    p_ods->>'sede_empresa',
    (p_ods->>'fecha_servicio')::date,
    (p_ods->>'fecha_ingreso')::date,
    (p_ods->>'mes_servicio')::integer,
    (p_ods->>'ano_servicio')::integer,
    p_ods->>'nombre_usuario',
    p_ods->>'cedula_usuario',
    p_ods->>'discapacidad_usuario',
    p_ods->>'genero_usuario',
    p_ods->>'modalidad_servicio',
    (p_ods->>'todas_modalidades')::numeric,
    (p_ods->>'horas_interprete')::numeric,
    (p_ods->>'valor_virtual')::numeric,
    (p_ods->>'valor_bogota')::numeric,
    (p_ods->>'valor_otro')::numeric,
    (p_ods->>'valor_interprete')::numeric,
    (p_ods->>'valor_total')::numeric,
    p_ods->>'tipo_contrato',
    p_ods->>'cargo_servicio',
    p_ods->>'seguimiento_servicio',
    (p_ods->>'orden_clausulada')::boolean,
    (p_ods->>'total_personas')::integer,
    p_ods->>'observaciones',
    p_ods->>'observacion_agencia',
    (p_ods->>'formato_finalizado_id')::uuid,
    (p_ods->>'user_id')::uuid,
    (p_ods->>'session_id')::uuid,
    (p_ods->>'started_at')::timestamptz,
    (p_ods->>'submitted_at')::timestamptz
  )
  returning id into v_ods_id;

  return jsonb_build_object('ods_id', v_ods_id);
end;
$$;
