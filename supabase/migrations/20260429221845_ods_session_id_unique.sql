-- Remote-applied ODS idempotency index.

create unique index if not exists ods_session_id_uniq_idx
  on public.ods (session_id)
  where session_id is not null;

comment on index public.ods_session_id_uniq_idx is
  'BS-3: Idempotencia. Evita ODS duplicada por doble-click. Permite NULL para legacy rows.';
