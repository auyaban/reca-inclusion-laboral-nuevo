-- E2A post-QA advisor fix: the policy is already scoped to authenticated,
-- so USING (true) avoids per-row auth.role() evaluation while keeping access
-- limited by the policy role target.

drop policy if exists empresas_select_authenticated on public.empresas;

create policy empresas_select_authenticated
  on public.empresas
  for select
  to authenticated
  using (true);

comment on policy empresas_select_authenticated on public.empresas is
  'Permite SELECT a usuarios autenticados; INSERT/UPDATE/DELETE se atienden server-side con service_role.';
