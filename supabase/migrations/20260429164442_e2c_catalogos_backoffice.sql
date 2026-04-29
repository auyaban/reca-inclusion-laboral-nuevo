alter table public.asesores
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists deleted_at timestamptz null;

create unique index if not exists asesores_id_unique_idx
  on public.asesores (id);

create index if not exists asesores_deleted_at_idx
  on public.asesores (deleted_at);

alter table public.gestores
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists deleted_at timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gestores'::regclass
      and contype = 'p'
  ) then
    alter table public.gestores
      add constraint gestores_pkey primary key (id);
  end if;
end $$;

create index if not exists gestores_deleted_at_idx
  on public.gestores (deleted_at);

alter table public.interpretes
  add column if not exists deleted_at timestamptz null;

create index if not exists interpretes_deleted_at_idx
  on public.interpretes (deleted_at);

alter table public.asesores enable row level security;
alter table public.gestores enable row level security;
alter table public.interpretes enable row level security;

drop policy if exists asesores_select_authenticated on public.asesores;
create policy asesores_select_authenticated
  on public.asesores
  for select
  to authenticated
  using (true);

drop policy if exists gestores_select_authenticated on public.gestores;
create policy gestores_select_authenticated
  on public.gestores
  for select
  to authenticated
  using (true);

drop policy if exists interpretes_select_authenticated on public.interpretes;
create policy interpretes_select_authenticated
  on public.interpretes
  for select
  to authenticated
  using (true);

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('asesores', 'gestores', 'interpretes')
      and cmd <> 'SELECT'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

revoke insert, update, delete on table public.asesores from anon, authenticated;
revoke insert, update, delete on table public.gestores from anon, authenticated;
revoke insert, update, delete on table public.interpretes from anon, authenticated;

comment on column public.asesores.id is
  'Llave estable para el backoffice E2C; nombre se conserva como PK legacy.';
comment on column public.asesores.deleted_at is
  'Soft delete para asesores administrados desde el backoffice E2C.';
comment on column public.gestores.id is
  'Llave estable para editar y eliminar gestores desde el backoffice E2C.';
comment on column public.gestores.deleted_at is
  'Soft delete para gestores administrados desde el backoffice E2C.';
comment on column public.interpretes.deleted_at is
  'Soft delete para interpretes administrados desde el backoffice E2C.';
