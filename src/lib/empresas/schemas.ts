import { z } from "zod";
import {
  EMPRESA_CAJA_OPTIONS,
  EMPRESA_ESTADO_OPTIONS,
  EMPRESA_GESTION_OPTIONS,
} from "@/lib/empresas/constants";

const nullableText = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

const requiredText = (message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1, message)
  );

const nullableNumericId = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}, z.number().int().positive().nullable());

const gestionSchema = z.enum(EMPRESA_GESTION_OPTIONS, {
  required_error: "Selecciona la gestion.",
});

const estadoSchema = z.enum(EMPRESA_ESTADO_OPTIONS).default("En Proceso");

const cajaSchema = z
  .preprocess(
    (value) => (value === "" || typeof value === "undefined" ? null : value),
    z.enum(EMPRESA_CAJA_OPTIONS).nullable()
  )
  .default(null);

export const empresaBaseSchema = z.object({
  nombre_empresa: requiredText("El nombre de la empresa es obligatorio."),
  nit_empresa: nullableText.default(null),
  direccion_empresa: nullableText.default(null),
  ciudad_empresa: nullableText.default(null),
  sede_empresa: nullableText.default(null),
  zona_empresa: nullableText.default(null),
  correo_1: nullableText.default(null),
  contacto_empresa: nullableText.default(null),
  telefono_empresa: nullableText.default(null),
  cargo: nullableText.default(null),
  responsable_visita: nullableText.default(null),
  profesional_asignado_id: nullableNumericId.default(null),
  asesor: nullableText.default(null),
  correo_asesor: nullableText.default(null),
  caja_compensacion: cajaSchema,
  estado: estadoSchema,
  observaciones: nullableText.default(null),
  gestion: gestionSchema,
  comentario: nullableText.default(null),
});

export const createEmpresaSchema = empresaBaseSchema;

export const updateEmpresaSchema = empresaBaseSchema
  .extend({
    previous_estado: z
      .preprocess(
        (value) => (value === "" || typeof value === "undefined" ? null : value),
        z.enum(EMPRESA_ESTADO_OPTIONS).nullable()
      )
      .default(null),
  })
  .superRefine((value, context) => {
    if (
      value.previous_estado &&
      value.estado !== value.previous_estado &&
      !value.comentario
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comentario"],
        message: "El comentario es obligatorio cuando cambia el estado.",
      });
    }
  });

export const deleteEmpresaSchema = z.object({
  comentario: nullableText.default(null),
});

const SORT_FIELDS = [
  "updated_at",
  "nombre_empresa",
  "nit_empresa",
  "ciudad_empresa",
  "sede_empresa",
  "gestion",
  "profesional_asignado",
  "asesor",
  "caja_compensacion",
  "zona_empresa",
  "estado",
] as const;

const DIRECTIONS = ["asc", "desc"] as const;

function readTextParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value ? value.slice(0, 120) : "";
}

function readPageParam(params: URLSearchParams, key: string, fallback: number) {
  const value = Number.parseInt(params.get(key) ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readSort(params: URLSearchParams) {
  const value = params.get("sort");
  return SORT_FIELDS.includes(value as (typeof SORT_FIELDS)[number])
    ? (value as (typeof SORT_FIELDS)[number])
    : "updated_at";
}

function readDirection(params: URLSearchParams) {
  const value = params.get("direction");
  return DIRECTIONS.includes(value as (typeof DIRECTIONS)[number])
    ? (value as (typeof DIRECTIONS)[number])
    : "desc";
}

export function parseEmpresaListParams(params: URLSearchParams) {
  const pageSize = Math.min(readPageParam(params, "pageSize", 50), 100);
  const profesionalIdValue = params.get("profesionalId");
  const profesionalId = profesionalIdValue
    ? Number.parseInt(profesionalIdValue, 10)
    : null;

  return {
    q: readTextParam(params, "q"),
    page: readPageParam(params, "page", 1),
    pageSize,
    sort: readSort(params),
    direction: readDirection(params),
    estado: readTextParam(params, "estado"),
    gestion: readTextParam(params, "gestion"),
    caja: readTextParam(params, "caja"),
    zona: readTextParam(params, "zona"),
    asesor: readTextParam(params, "asesor"),
    profesionalId:
      profesionalId && Number.isFinite(profesionalId) && profesionalId > 0
        ? profesionalId
        : null,
  };
}

export type EmpresaFormInput = z.infer<typeof createEmpresaSchema>;
export type EmpresaUpdateInput = z.infer<typeof updateEmpresaSchema>;
export type EmpresaListParams = ReturnType<typeof parseEmpresaListParams>;
export type EmpresaSortField = EmpresaListParams["sort"];
