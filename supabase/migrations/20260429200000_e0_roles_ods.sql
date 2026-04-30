-- E0: Roles ODS
-- 1. Ampliar CHECK de profesional_roles para incluir ods_operador
-- 2. Asignar ods_operador a jancam (id=10) y aaron_vercel (id=30)
-- 3. Habilitar RLS en ods con policies para ods_operador
-- 4. Eliminar policies permissivas heredadas

-- 1. Ampliar CHECK
alter table public.profesional_roles
  drop constraint if exists profesional_roles_role_check;

alter table public.profesional_roles
  add constraint profesional_roles_role_check
  check (role in (
    'inclusion_empresas_admin',
    'inclusion_empresas_profesional',
    'ods_operador'
  ));

-- 2. Asignar ods_operador a los 2 usuarios ODS
insert into public.profesional_roles (profesional_id, role)
select id, 'ods_operador'
from public.profesionales
where usuario_login in ('jancam', 'aaron_vercel')
on conflict (profesional_id, role) do nothing;

-- 3. RLS para ods
alter table public.ods enable row level security;

-- 4. Eliminar policies permissivas heredadas
drop policy if exists "ods_select_anon" on public.ods;
drop policy if exists "ods_select_authenticated" on public.ods;
drop policy if exists "ods_insert_authenticated" on public.ods;
drop policy if exists "ods_update_authenticated" on public.ods;
drop policy if exists "ods_delete_authenticated" on public.ods;

-- Drop existing ods_operador policies if they exist (idempotent)
drop policy if exists "ods_operador puede leer ods" on public.ods;
drop policy if exists "ods_operador puede insertar ods" on public.ods;

-- Policy: ods_operador puede leer todas las ODS
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

-- Policy: ods_operador puede insertar ODS
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

-- Denegar acceso directo a clientes autenticados (solo API routes con service_role)
revoke select, insert, update, delete on table public.ods from authenticated;
revoke select on table public.ods from anon;
