-- E1-M2: FK formato_finalizado_id en ods

alter table ods
  add column formato_finalizado_id uuid
    references formatos_finalizados_il(registro_id) on delete set null;

create index ods_formato_finalizado_id_idx on ods (formato_finalizado_id);
