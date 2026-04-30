-- Remote-applied ODS E0 migration.
-- Kept locally to align Supabase migration history after the ODS production hotfixes.

alter table public.profesional_roles
  drop constraint if exists profesional_roles_role_check;

alter table public.profesional_roles
  add constraint profesional_roles_role_check
  check (role in (
    'inclusion_empresas_admin',
    'inclusion_empresas_profesional',
    'ods_operador'
  ));

insert into public.profesional_roles (profesional_id, role)
select id, 'ods_operador'
from public.profesionales
where usuario_login in ('jancam', 'aaron_vercel')
on conflict (profesional_id, role) do nothing;

alter table public.ods enable row level security;

drop policy if exists "ods_select_anon" on public.ods;
drop policy if exists "ods_select_authenticated" on public.ods;
drop policy if exists "ods_insert_authenticated" on public.ods;
drop policy if exists "ods_update_authenticated" on public.ods;
drop policy if exists "ods_delete_authenticated" on public.ods;

drop policy if exists "ods_operador puede leer ods" on public.ods;
drop policy if exists "ods_operador puede insertar ods" on public.ods;

create policy "ods_operador puede leer ods"
  on public.ods
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profesional_roles pr
      join public.profesionales p on p.id = pr.profesional_id
      where p.auth_user_id = auth.uid()
        and pr.role = 'ods_operador'
    )
  );

create policy "ods_operador puede insertar ods"
  on public.ods
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profesional_roles pr
      join public.profesionales p on p.id = pr.profesional_id
      where p.auth_user_id = auth.uid()
        and pr.role = 'ods_operador'
    )
  );

revoke select, insert, update, delete on table public.ods from authenticated;
revoke select on table public.ods from anon;
