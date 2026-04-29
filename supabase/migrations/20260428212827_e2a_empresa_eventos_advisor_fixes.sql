create index if not exists empresa_eventos_actor_user_id_idx
  on public.empresa_eventos (actor_user_id);

create index if not exists empresa_eventos_actor_profesional_id_idx
  on public.empresa_eventos (actor_profesional_id);

drop policy if exists empresa_eventos_client_deny on public.empresa_eventos;
create policy empresa_eventos_client_deny
  on public.empresa_eventos
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
