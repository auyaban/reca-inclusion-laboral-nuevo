-- E3.3 - Resumen liviano para Mis empresas y último formato.
-- Mantiene las consultas de profesionales del lado service_role y evita traer
-- formatos finalizados o eventos completos al navegador.

create index if not exists formatos_finalizados_il_nombre_empresa_created_idx
  on public.formatos_finalizados_il (lower(btrim(nombre_empresa)), created_at desc)
  where nombre_empresa is not null;

create index if not exists formatos_finalizados_il_payload_nit_digits_created_idx
  on public.formatos_finalizados_il (
    (regexp_replace(coalesce(payload_normalized #>> '{parsed_raw,nit_empresa}', ''), '[^0-9]', '', 'g')),
    created_at desc
  )
  where payload_normalized #>> '{parsed_raw,nit_empresa}' is not null;

create or replace function public.empresa_ultimo_formato(
  p_nit_empresa text,
  p_nombre_empresa text
)
returns table (
  ultimo_formato_at timestamptz,
  ultimo_formato_nombre text
)
language sql
stable
security invoker
set search_path = public
as $$
  with input as (
    select
      regexp_replace(coalesce(p_nit_empresa, ''), '[^0-9]', '', 'g') as nit_digits,
      lower(btrim(coalesce(p_nombre_empresa, ''))) as nombre_norm
  ),
  candidates as (
    select
      f.created_at as ultimo_formato_at,
      coalesce(nullif(btrim(f.nombre_formato), ''), 'Formato finalizado') as ultimo_formato_nombre,
      case
        when input.nit_digits <> ''
          and regexp_replace(coalesce(f.payload_normalized #>> '{parsed_raw,nit_empresa}', ''), '[^0-9]', '', 'g') = input.nit_digits
          then 1
        when input.nombre_norm <> ''
          and lower(btrim(coalesce(f.nombre_empresa, ''))) = input.nombre_norm
          then 2
        else 99
      end as match_rank
    from public.formatos_finalizados_il f
    cross join input
    where (
      input.nit_digits <> ''
      and regexp_replace(coalesce(f.payload_normalized #>> '{parsed_raw,nit_empresa}', ''), '[^0-9]', '', 'g') = input.nit_digits
    )
    or (
      input.nombre_norm <> ''
      and lower(btrim(coalesce(f.nombre_empresa, ''))) = input.nombre_norm
    )
  )
  select candidates.ultimo_formato_at, candidates.ultimo_formato_nombre
  from candidates
  order by candidates.match_rank asc, candidates.ultimo_formato_at desc
  limit 1;
$$;

create or replace function public.empresas_profesional_mis_resumen(
  p_profesional_id bigint,
  p_q text default null,
  p_estado text default null,
  p_nuevas boolean default false,
  p_alert_start_at timestamptz default null,
  p_sort text default 'ultimoFormato',
  p_direction text default 'desc',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  nombre_empresa text,
  nit_empresa text,
  estado text,
  updated_at timestamptz,
  profesional_asignado_id bigint,
  profesional_asignado text,
  ultimo_formato_at timestamptz,
  ultimo_formato_nombre text,
  es_nueva boolean,
  total_count bigint,
  new_count bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_q_like text;
  v_sort text := case
    when p_sort in ('nombre', 'nit', 'estado', 'ultimoFormato') then p_sort
    else 'ultimoFormato'
  end;
  v_direction text := case when p_direction = 'asc' then 'asc' else 'desc' end;
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 50);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_alert_start_at timestamptz := coalesce(p_alert_start_at, 'infinity'::timestamptz);
begin
  if p_profesional_id is null then
    return;
  end if;

  if v_q is not null then
    v_q_like := '%' ||
      replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') ||
      '%';
  end if;

  return query
  with base as (
    select
      e.id,
      e.nombre_empresa,
      e.nit_empresa,
      e.estado,
      e.updated_at,
      e.profesional_asignado_id,
      e.profesional_asignado
    from public.empresas e
    where e.deleted_at is null
      and e.profesional_asignado_id = p_profesional_id
      and (
        v_q is null
        or e.nombre_empresa ilike v_q_like escape '\'
        or e.nit_empresa ilike v_q_like escape '\'
      )
      and (
        nullif(btrim(coalesce(p_estado, '')), '') is null
        or e.estado = btrim(p_estado)
      )
  ),
  decorated as (
    select
      b.id,
      b.nombre_empresa,
      b.nit_empresa,
      b.estado,
      b.updated_at,
      b.profesional_asignado_id,
      b.profesional_asignado,
      ultimo.ultimo_formato_at,
      ultimo.ultimo_formato_nombre,
      (
        assignment.latest_assignment_at is not null
        and not exists (
          select 1
          from public.empresa_eventos note_event
          where note_event.empresa_id = b.id
            and note_event.tipo = 'nota'
            and note_event.actor_profesional_id = p_profesional_id
            and note_event.created_at >= assignment.latest_assignment_at
        )
      ) as es_nueva
    from base b
    left join lateral public.empresa_ultimo_formato(b.nit_empresa, b.nombre_empresa) ultimo
      on true
    left join lateral (
      select max(event.created_at) as latest_assignment_at
      from public.empresa_eventos event
      where event.empresa_id = b.id
        and event.created_at >= v_alert_start_at
        and (
          (
            event.tipo = 'reclamada'
            and event.actor_profesional_id = p_profesional_id
          )
          or (
            event.tipo = 'asignacion_gerente'
            and case
              when coalesce(event.payload->>'asignado_a_profesional_id', '') ~ '^[0-9]+$'
                then (event.payload->>'asignado_a_profesional_id')::bigint
              else null
            end = p_profesional_id
          )
        )
    ) assignment on true
  ),
  visible as (
    select *
    from decorated
    where not p_nuevas or decorated.es_nueva
  ),
  counted as (
    select
      visible.*,
      count(*) over() as total_count,
      (select count(*) from decorated where decorated.es_nueva) as new_count
    from visible
  )
  select
    counted.id,
    counted.nombre_empresa,
    counted.nit_empresa,
    counted.estado,
    counted.updated_at,
    counted.profesional_asignado_id,
    counted.profesional_asignado,
    counted.ultimo_formato_at,
    counted.ultimo_formato_nombre,
    counted.es_nueva,
    counted.total_count,
    counted.new_count
  from counted
  order by
    case when v_sort = 'nombre' and v_direction = 'asc' then counted.nombre_empresa end asc nulls last,
    case when v_sort = 'nombre' and v_direction = 'desc' then counted.nombre_empresa end desc nulls last,
    case when v_sort = 'nit' and v_direction = 'asc' then counted.nit_empresa end asc nulls last,
    case when v_sort = 'nit' and v_direction = 'desc' then counted.nit_empresa end desc nulls last,
    case when v_sort = 'estado' and v_direction = 'asc' then counted.estado end asc nulls last,
    case when v_sort = 'estado' and v_direction = 'desc' then counted.estado end desc nulls last,
    case when v_sort = 'ultimoFormato' and v_direction = 'asc' then counted.ultimo_formato_at end asc nulls last,
    case when v_sort = 'ultimoFormato' and v_direction = 'desc' then counted.ultimo_formato_at end desc nulls last,
    counted.nombre_empresa asc nulls last,
    counted.id asc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.empresa_ultimo_formato(text, text) from public;
revoke execute on function public.empresa_ultimo_formato(text, text) from anon, authenticated;
grant execute on function public.empresa_ultimo_formato(text, text) to service_role;

revoke all on function public.empresas_profesional_mis_resumen(bigint, text, text, boolean, timestamptz, text, text, integer, integer) from public;
revoke execute on function public.empresas_profesional_mis_resumen(bigint, text, text, boolean, timestamptz, text, text, integer, integer) from anon, authenticated;
grant execute on function public.empresas_profesional_mis_resumen(bigint, text, text, boolean, timestamptz, text, text, integer, integer) to service_role;

comment on function public.empresa_ultimo_formato(text, text)
  is 'E3.3: devuelve el formato finalizado mas reciente de una empresa por NIT normalizado y fallback por nombre.';

comment on function public.empresas_profesional_mis_resumen(bigint, text, text, boolean, timestamptz, text, text, integer, integer)
  is 'E3.3: listado liviano de Mis empresas para profesionales con ultimo formato y alerta de asignaciones nuevas.';
