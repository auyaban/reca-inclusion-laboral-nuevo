-- E1-M1: Renombrar año_servicio → ano_servicio (sin ñ)

alter table ods
  rename column "año_servicio" to ano_servicio;
