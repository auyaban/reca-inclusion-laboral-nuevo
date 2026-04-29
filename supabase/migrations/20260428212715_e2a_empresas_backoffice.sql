alter table public.empresas
  add column if not exists profesional_asignado_id bigint null,
  add column if not exists deleted_at timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'empresas_profesional_asignado_id_fkey'
      and conrelid = 'public.empresas'::regclass
  ) then
    alter table public.empresas
      add constraint empresas_profesional_asignado_id_fkey
      foreign key (profesional_asignado_id)
      references public.profesionales(id)
      on delete set null;
  end if;
end $$;

create index if not exists empresas_profesional_asignado_id_idx
  on public.empresas (profesional_asignado_id)
  where deleted_at is null;

create index if not exists empresas_deleted_at_idx
  on public.empresas (deleted_at);

with normalized_profesionales as (
  select
    id,
    lower(trim(nombre_profesional)) as nombre_key,
    count(*) over (partition by lower(trim(nombre_profesional))) as match_count
  from public.profesionales
  where nullif(trim(nombre_profesional), '') is not null
),
unique_profesionales as (
  select id, nombre_key
  from normalized_profesionales
  where match_count = 1
),
matches as (
  select e.id as empresa_id, p.id as profesional_id
  from public.empresas e
  join unique_profesionales p
    on p.nombre_key = lower(trim(e.profesional_asignado))
  where e.profesional_asignado_id is null
    and nullif(trim(e.profesional_asignado), '') is not null
)
update public.empresas e
set profesional_asignado_id = m.profesional_id
from matches m
where e.id = m.empresa_id;

create table if not exists public.empresa_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null,
  actor_user_id uuid not null references auth.users(id),
  actor_profesional_id bigint null references public.profesionales(id) on delete set null,
  actor_nombre text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint empresa_eventos_tipo_check check (
    tipo in (
      'creacion',
      'edicion',
      'asignacion_gerente',
      'desasignacion_gerente',
      'cambio_estado',
      'eliminacion'
    )
  )
);

create index if not exists empresa_eventos_empresa_created_idx
  on public.empresa_eventos (empresa_id, created_at desc);

alter table public.empresas enable row level security;
alter table public.empresa_eventos enable row level security;

drop policy if exists empresas_insert_authenticated on public.empresas;
drop policy if exists empresas_update_authenticated on public.empresas;
drop policy if exists empresas_delete_authenticated on public.empresas;

revoke insert, update, delete on table public.empresas from anon, authenticated;
revoke all on table public.empresa_eventos from anon, authenticated;

comment on column public.empresas.profesional_asignado_id is
  'Referencia canonica al profesional asignado; profesional_asignado y correo_profesional quedan como snapshots legacy.';
comment on column public.empresas.deleted_at is
  'Soft delete para el backoffice de Empresas E2A.';
comment on table public.empresa_eventos is
  'Auditoria server-side del backoffice de Empresas; clientes leen via API routes.';
