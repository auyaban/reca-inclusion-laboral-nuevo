-- Reconcilia drift remoto-local detectado en PR #71 / issue #74.
-- La columna ya existe en produccion remota y contiene URLs de Google Sheets.
alter table public.formatos_finalizados_il
  add column if not exists path_formato text;
