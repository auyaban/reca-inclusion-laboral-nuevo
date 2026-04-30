-- Remote-applied ODS hotfix.
-- Restores legacy desktop access while the new ODS module keeps using server-side APIs.

alter table public.ods disable row level security;

drop policy if exists "ods_operador puede leer ods" on public.ods;
drop policy if exists "ods_operador puede insertar ods" on public.ods;

grant select, insert, update, delete on table public.ods to authenticated;
