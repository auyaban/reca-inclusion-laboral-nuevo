-- E2B RPC hardening:
-- These SECURITY DEFINER helpers are not used by the web app anymore.
-- Keep current_usuario_login() and is_current_user_admin() executable because
-- existing RLS policies on formatos_finalizados_il still depend on them.

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_my_profesional_profile'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    revoke execute on function public.get_my_profesional_profile() from anon, authenticated;
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'resolve_login_email'
      and pg_get_function_identity_arguments(p.oid) = 'p_login text'
  ) then
    revoke execute on function public.resolve_login_email(text) from anon, authenticated;
  end if;
end $$;
