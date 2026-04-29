-- E2B advisor cleanup:
-- - keep one explicit SELECT policy for authenticated reads
-- - keep the repo-owned unique index for auth_user_id and drop the legacy duplicate

drop policy if exists prof_select_self_or_admin on public.profesionales;

drop index if exists public.ux_profesionales_auth_user_id;
