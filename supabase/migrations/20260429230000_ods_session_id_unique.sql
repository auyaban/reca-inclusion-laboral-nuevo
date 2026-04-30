-- BS-3: Idempotencia de creacion de ODS por session_id
-- Evita ODS duplicada por doble-click en "Confirmar y terminar".
-- session_id es un UUID generado client-side.
-- Solo aplica cuando session_id NO es NULL — los registros legacy con session_id NULL no se ven afectados.

create unique index if not exists ods_session_id_uniq_idx
  on public.ods (session_id)
  where session_id is not null;

comment on index public.ods_session_id_uniq_idx is
  'BS-3: Idempotencia. Evita ODS duplicada por doble-click. Permite NULL para legacy rows.';
