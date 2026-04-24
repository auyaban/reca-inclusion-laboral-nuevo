alter table public.interpretes enable row level security;

alter table public.interpretes force row level security;

drop policy if exists interpretes_client_deny on public.interpretes;

create policy interpretes_client_deny
on public.interpretes
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
