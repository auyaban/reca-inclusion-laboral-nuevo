comment on table public.profesional_roles is
  'Application roles for RECA professionals. Browser clients have no direct table grants; API routes resolve roles server-side with service_role.';

comment on column public.profesional_roles.role is
  'Application permission key. Initial Empresas admin permission: inclusion_empresas_admin.';

do $$
declare
  missing_logins text[];
begin
  with expected(usuario_login) as (
    values
      ('aaron_vercel'),
      ('sanpac'),
      ('sarazambrano'),
      ('adrianaviveros')
  ),
  missing as (
    select expected.usuario_login
    from expected
    left join public.profesionales
      on lower(public.profesionales.usuario_login) = expected.usuario_login
    left join public.profesional_roles
      on public.profesional_roles.profesional_id = public.profesionales.id
      and public.profesional_roles.role = 'inclusion_empresas_admin'
    where public.profesional_roles.profesional_id is null
  )
  select coalesce(array_agg(usuario_login order by usuario_login), array[]::text[])
    into missing_logins
  from missing;

  if coalesce(array_length(missing_logins, 1), 0) > 0 then
    raise exception
      'profesional_roles seed missing required inclusion_empresas_admin roles: %',
      array_to_string(missing_logins, ', ');
  end if;
end $$;
