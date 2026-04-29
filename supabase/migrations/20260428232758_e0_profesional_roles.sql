create table if not exists public.profesional_roles (
  profesional_id bigint not null references public.profesionales(id) on delete cascade,
  role text not null constraint profesional_roles_role_check
    check (role in ('inclusion_empresas_admin')),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null,
  constraint profesional_roles_pkey primary key (profesional_id, role)
);

create unique index if not exists profesionales_auth_user_id_unique_idx
  on public.profesionales (auth_user_id)
  where auth_user_id is not null;

create index if not exists profesional_roles_role_idx
  on public.profesional_roles (role);

alter table public.profesional_roles enable row level security;

revoke all on table public.profesional_roles from anon, authenticated;

insert into public.profesional_roles (profesional_id, role)
select profesionales.id, 'inclusion_empresas_admin'
from public.profesionales
where lower(profesionales.usuario_login) in (
  'aaron_vercel',
  'sanpac',
  'sarazambrano',
  'adrianaviveros'
)
on conflict (profesional_id, role) do nothing;
