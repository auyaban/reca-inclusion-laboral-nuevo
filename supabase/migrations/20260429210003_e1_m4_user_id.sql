-- E1-M4: user_id en ods para trazabilidad del actor

alter table ods
  add column user_id uuid
    references auth.users(id) on delete set null;

create index ods_user_id_idx on ods (user_id);
