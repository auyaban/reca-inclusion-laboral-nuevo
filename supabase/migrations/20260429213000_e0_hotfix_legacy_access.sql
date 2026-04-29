-- Hotfix: restaurar acceso del legacy ODS a la tabla `ods`
--
-- Contexto: la migracion E0 (20260429200000_e0_roles_ods.sql) habilito RLS estricta
-- en `ods` con policies que solo permiten a usuarios con rol `ods_operador`, y
-- ademas hizo REVOKE de los grants directos a `authenticated`. Como el legacy
-- desktop sigue vivo y lo usan mas de 2 personas, esto bloqueo a todos los
-- usuarios que NO son `jancam` ni `aaron_vercel`.
--
-- Este hotfix restaura el estado pre-E0 sobre la tabla `ods`. El rol
-- `ods_operador` y el CHECK constraint de `profesional_roles` quedan intactos,
-- listos para reactivar las RLS en el cutover legacy -> nuevo (futura epica E5).
--
-- El modulo nuevo (E2/E3) no se ve afectado porque usa service_role server-side
-- via la RPC `ods_insert_atomic`, que ignora RLS.

-- 1. Desactivar RLS sobre ods
alter table public.ods disable row level security;

-- 2. Eliminar las 2 policies de E0 (idempotente)
drop policy if exists "ods_operador puede leer ods" on public.ods;
drop policy if exists "ods_operador puede insertar ods" on public.ods;

-- 3. Restaurar grants directos a authenticated
grant select, insert, update, delete on table public.ods to authenticated;
