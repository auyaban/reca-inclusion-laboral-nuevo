alter table public.profesionales
  add column if not exists deleted_at timestamptz null;

do $$
begin
  alter table public.profesional_roles
    drop constraint if exists profesional_roles_role_check;

  alter table public.profesional_roles
    add constraint profesional_roles_role_check
    check (
      role in (
        'inclusion_empresas_admin',
        'inclusion_empresas_profesional'
      )
    );
end $$;

insert into public.profesional_roles (profesional_id, role, assigned_by)
select p.id, 'inclusion_empresas_profesional', null
from public.profesionales p
where p.auth_user_id is not null
  and p.deleted_at is null
on conflict (profesional_id, role) do nothing;

create unique index if not exists profesionales_usuario_login_active_unique_idx
  on public.profesionales (lower(trim(usuario_login)))
  where deleted_at is null
    and nullif(trim(usuario_login), '') is not null;

create unique index if not exists profesionales_correo_auth_active_unique_idx
  on public.profesionales (lower(trim(correo_profesional)))
  where deleted_at is null
    and auth_user_id is not null
    and nullif(trim(correo_profesional), '') is not null;

create index if not exists profesionales_correo_active_idx
  on public.profesionales (lower(trim(correo_profesional)))
  where deleted_at is null
    and nullif(trim(correo_profesional), '') is not null;

create index if not exists profesionales_deleted_at_idx
  on public.profesionales (deleted_at);

create table if not exists public.profesional_eventos (
  id uuid primary key default gen_random_uuid(),
  profesional_id bigint not null references public.profesionales(id) on delete cascade,
  tipo text not null,
  actor_user_id uuid not null references auth.users(id),
  actor_profesional_id bigint null references public.profesionales(id) on delete set null,
  actor_nombre text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint profesional_eventos_tipo_check check (
    tipo in (
      'creacion',
      'edicion',
      'habilitar_acceso',
      'reset_password',
      'rol_asignado',
      'rol_retirado',
      'eliminacion',
      'restauracion'
    )
  )
);

create index if not exists profesional_eventos_profesional_created_idx
  on public.profesional_eventos (profesional_id, created_at desc);

create index if not exists profesional_eventos_tipo_idx
  on public.profesional_eventos (tipo);

alter table public.profesionales enable row level security;
alter table public.profesional_eventos enable row level security;

drop policy if exists profesionales_select_authenticated on public.profesionales;
create policy profesionales_select_authenticated
  on public.profesionales
  for select
  to authenticated
  using (true);

drop policy if exists profesionales_insert_authenticated on public.profesionales;
drop policy if exists profesionales_update_authenticated on public.profesionales;
drop policy if exists profesionales_delete_authenticated on public.profesionales;

revoke insert, update, delete on table public.profesionales from anon, authenticated;
revoke all on table public.profesional_eventos from anon, authenticated;

do $$
declare
  legacy_function record;
begin
  for legacy_function in
    select oid::regprocedure as signature
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'admin_reset_profesional_password'
  loop
    execute format(
      'revoke execute on function %s from anon, authenticated',
      legacy_function.signature
    );
  end loop;
end $$;

comment on column public.profesionales.deleted_at is
  'Soft delete para profesionales administrados desde el backoffice de Empresas E2B.';
comment on table public.profesional_eventos is
  'Auditoría server-side de acciones sensibles sobre profesionales; clientes acceden vía API routes.';
