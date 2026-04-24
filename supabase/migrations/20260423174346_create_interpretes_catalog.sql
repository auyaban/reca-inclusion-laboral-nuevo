create table if not exists public.interpretes (
  id uuid default gen_random_uuid(),
  nombre text not null,
  nombre_key text,
  created_at timestamptz not null default now()
);

alter table public.interpretes
  add column if not exists id uuid,
  add column if not exists nombre_key text,
  add column if not exists created_at timestamptz default now();

alter table public.interpretes
  alter column id set default gen_random_uuid(),
  alter column created_at set default now();

update public.interpretes
set
  id = coalesce(id, gen_random_uuid()),
  nombre = trim(regexp_replace(nombre, '\s+', ' ', 'g')),
  nombre_key = lower(trim(regexp_replace(nombre, '\s+', ' ', 'g'))),
  created_at = coalesce(created_at, now())
where
  id is null
  or nombre is distinct from trim(regexp_replace(nombre, '\s+', ' ', 'g'))
  or nombre_key is distinct from lower(trim(regexp_replace(nombre, '\s+', ' ', 'g')))
  or created_at is null;

delete from public.interpretes
where nombre is null or btrim(nombre) = '';

with ranked as (
  select
    ctid,
    row_number() over (
      partition by nombre_key
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.interpretes
)
delete from public.interpretes target
using ranked
where target.ctid = ranked.ctid
  and ranked.duplicate_rank > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.interpretes'::regclass
      and contype = 'p'
  ) then
    alter table public.interpretes
      add constraint interpretes_pkey primary key (id);
  end if;
end
$$;

alter table public.interpretes
  alter column nombre set not null,
  alter column nombre_key set not null,
  alter column created_at set not null;

create unique index if not exists interpretes_nombre_key_key
  on public.interpretes (nombre_key);

alter table public.interpretes enable row level security;
