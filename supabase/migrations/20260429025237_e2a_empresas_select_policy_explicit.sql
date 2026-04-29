-- E2A post-QA: make the read posture for public.empresas explicit.
-- The backoffice writes through server-side APIs with service_role, while
-- existing form/draft/search clients still need authenticated SELECT access.

alter table public.empresas enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polrelid = 'public.empresas'::regclass
      and polname = 'empresas_select_authenticated'
  ) then
    create policy empresas_select_authenticated
      on public.empresas
      for select
      to authenticated
      using (auth.role() = 'authenticated'::text);
  end if;
end $$;

comment on policy empresas_select_authenticated on public.empresas is
  'Permite SELECT a usuarios autenticados; INSERT/UPDATE/DELETE se atienden server-side con service_role.';
