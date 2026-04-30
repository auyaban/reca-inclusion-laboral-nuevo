-- E1-M3: Versionado de tarifas (vigente_desde / vigente_hasta)

alter table tarifas
  add column vigente_desde date not null default current_date,
  add column vigente_hasta date;

create index tarifas_vigencia_idx on tarifas (codigo_servicio, vigente_desde desc);

-- Backfill: todas las filas existentes toman su created_at como vigente_desde
update tarifas
  set vigente_desde = created_at::date
  where vigente_desde = current_date
    and created_at is not null;
