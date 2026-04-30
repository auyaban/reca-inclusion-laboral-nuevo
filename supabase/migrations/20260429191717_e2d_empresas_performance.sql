-- E2D.3 - Catálogos livianos de Empresas para reducir egress.

create or replace function public.empresa_catalogo_filtros()
returns table (
  zonas text[],
  estados text[],
  gestores text[],
  cajas text[],
  asesores text[]
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(
      array(
        select distinct btrim(zona_empresa) as value
        from public.empresas
        where deleted_at is null
          and nullif(btrim(zona_empresa), '') is not null
        order by value
      ),
      array[]::text[]
    ) as zonas,
    coalesce(
      array(
        select distinct btrim(estado) as value
        from public.empresas
        where deleted_at is null
          and nullif(btrim(estado), '') is not null
        order by value
      ),
      array[]::text[]
    ) as estados,
    coalesce(
      array(
        select distinct btrim(gestion) as value
        from public.empresas
        where deleted_at is null
          and nullif(btrim(gestion), '') is not null
        order by value
      ),
      array[]::text[]
    ) as gestores,
    coalesce(
      array(
        select distinct btrim(caja_compensacion) as value
        from public.empresas
        where deleted_at is null
          and nullif(btrim(caja_compensacion), '') is not null
        order by value
      ),
      array[]::text[]
    ) as cajas,
    coalesce(
      array(
        select distinct btrim(asesor) as value
        from public.empresas
        where deleted_at is null
          and nullif(btrim(asesor), '') is not null
        order by value
      ),
      array[]::text[]
    ) as asesores;
$$;

revoke all on function public.empresa_catalogo_filtros() from public;
revoke execute on function public.empresa_catalogo_filtros() from anon, authenticated;
grant execute on function public.empresa_catalogo_filtros() to service_role;

comment on function public.empresa_catalogo_filtros()
  is 'E2D.3: devuelve filtros únicos de Empresas como arrays para evitar traer filas completas al backoffice.';
