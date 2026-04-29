-- Hotfix: restaurar `año_servicio` (con ñ) como columna shadow sincronizada con
-- `ano_servicio`, para mantener compatibilidad con el legacy desktop ODS.
--
-- Contexto: la migracion E1-M1 (20260429210000_e1_m1_rename_ano_servicio.sql)
-- renombro la columna `año_servicio` a `ano_servicio`. El legacy desktop maneja
-- la columna via `_YEAR_FIELD_ALIASES` en `terminar.py`, pero su cache LRU del
-- schema OpenAPI puede tener una version stale que aun apunta a `año_servicio`,
-- causando errores "column does not exist" en el INSERT.
--
-- Solucion: traer la columna `año_servicio` de vuelta como columna nullable,
-- backfill con valores de `ano_servicio`, y mantener ambas sincronizadas via
-- trigger BEFORE INSERT/UPDATE. Asi:
--   - Legacy escribe en cualquiera de las dos -> ambas quedan iguales.
--   - Modulo nuevo escribe en `ano_servicio` (canonica) -> trigger replica.
--   - Cuando se decommissione el legacy (futura epica E5 - Cutover), se elimina
--     este shadow + el trigger.
--
-- IMPORTANTE: este es un hotfix de produccion. La columna canonica sigue siendo
-- `ano_servicio`. La columna `año_servicio` es legacy compat solamente.

-- 1. Restaurar columna shadow (idempotente)
alter table public.ods add column if not exists "año_servicio" integer;

-- 2. Backfill desde ano_servicio donde aun este vacia
update public.ods
set "año_servicio" = ano_servicio
where "año_servicio" is null and ano_servicio is not null;

-- 3. Funcion de sincronizacion bidireccional
create or replace function public.ods_sync_ano_servicio_columns()
returns trigger as $$
begin
  -- Si solo viene un lado, copiar al otro
  if new.ano_servicio is null and new."año_servicio" is not null then
    new.ano_servicio := new."año_servicio";
  elsif new.ano_servicio is not null and new."año_servicio" is null then
    new."año_servicio" := new.ano_servicio;
  -- Si ambas vienen pero difieren, ano_servicio (canonica) gana
  elsif new.ano_servicio is not null and new."año_servicio" is not null
        and new.ano_servicio <> new."año_servicio" then
    new."año_servicio" := new.ano_servicio;
  end if;
  return new;
end;
$$ language plpgsql;

-- 4. Trigger BEFORE INSERT OR UPDATE (idempotente)
drop trigger if exists ods_sync_ano_servicio_trigger on public.ods;
create trigger ods_sync_ano_servicio_trigger
  before insert or update of ano_servicio, "año_servicio" on public.ods
  for each row
  execute function public.ods_sync_ano_servicio_columns();
