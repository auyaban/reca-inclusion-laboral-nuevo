// cspell:ignore creacion eliminacion

export const EMPRESA_GESTION_OPTIONS = ["RECA", "COMPENSAR"] as const;

export const EMPRESA_ESTADO_OPTIONS = [
  "Activa",
  "En Proceso",
  "Pausada",
  "Cerrada",
  "Inactiva",
] as const;

export const EMPRESA_CAJA_OPTIONS = ["Compensar", "No Compensar"] as const;

export const EMPRESA_EVENT_TYPES = [
  "creacion",
  "edicion",
  "asignacion_gerente",
  "desasignacion_gerente",
  "cambio_estado",
  "eliminacion",
] as const;

export const EMPRESA_SELECT_FIELDS = [
  "id",
  "nombre_empresa",
  "nit_empresa",
  "direccion_empresa",
  "ciudad_empresa",
  "sede_empresa",
  "zona_empresa",
  "correo_1",
  "contacto_empresa",
  "telefono_empresa",
  "cargo",
  "responsable_visita",
  "profesional_asignado_id",
  "profesional_asignado",
  "correo_profesional",
  "asesor",
  "correo_asesor",
  "caja_compensacion",
  "estado",
  "observaciones",
  "comentarios_empresas",
  "gestion",
  "created_at",
  "updated_at",
  "deleted_at",
].join(", ");

export const EMPRESA_LIST_FIELDS = [
  "id",
  "nombre_empresa",
  "nit_empresa",
  "ciudad_empresa",
  "sede_empresa",
  "zona_empresa",
  "gestion",
  "profesional_asignado",
  "asesor",
  "caja_compensacion",
  "estado",
  "updated_at",
].join(", ");

export const EMPRESA_WRITE_FIELDS = [
  "nombre_empresa",
  "nit_empresa",
  "direccion_empresa",
  "ciudad_empresa",
  "sede_empresa",
  "zona_empresa",
  "correo_1",
  "contacto_empresa",
  "telefono_empresa",
  "cargo",
  "responsable_visita",
  "profesional_asignado_id",
  "profesional_asignado",
  "correo_profesional",
  "asesor",
  "correo_asesor",
  "caja_compensacion",
  "estado",
  "observaciones",
  "gestion",
] as const;

export const EMPRESA_GENERAL_EVENT_FIELDS = EMPRESA_WRITE_FIELDS.filter(
  (field) =>
    ![
      "estado",
      "profesional_asignado_id",
      "profesional_asignado",
      "correo_profesional",
    ].includes(field)
);
