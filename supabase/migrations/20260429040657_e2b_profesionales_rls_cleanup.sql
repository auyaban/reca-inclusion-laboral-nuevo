drop policy if exists prof_insert_admin on public.profesionales;
drop policy if exists prof_update_self_or_admin on public.profesionales;
drop policy if exists prof_delete_self_or_admin on public.profesionales;

drop policy if exists profesionales_insert_authenticated on public.profesionales;
drop policy if exists profesionales_update_authenticated on public.profesionales;
drop policy if exists profesionales_delete_authenticated on public.profesionales;

revoke insert, update, delete on table public.profesionales from anon, authenticated;

comment on table public.profesionales is
  'Lectura autenticada conservada; escrituras de backoffice pasan por API server-side con service role.';
