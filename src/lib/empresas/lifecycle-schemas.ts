import { z } from "zod";
import { EMPRESA_ESTADO_OPTIONS } from "@/lib/empresas/constants";
import {
  normalizeEmpresaEstado,
  normalizeEmpresaNullableText,
} from "@/lib/empresas/normalization";

// cspell:ignore asignacion

export const EMPRESA_OPERATIVA_SORT_FIELDS = [
  "updated_at",
  "nombre_empresa",
  "nit_empresa",
  "ciudad_empresa",
  "estado",
  "profesional_asignado",
] as const;

export const MIS_EMPRESAS_SORT_FIELDS = [
  "nombre",
  "nit",
  "estado",
  "ultimoFormato",
] as const;

export const EMPRESA_OPERATIVA_ASIGNACION_OPTIONS = [
  "todo",
  "libres",
  "asignadas",
] as const;

export const EMPRESA_EVENTOS_TIPO_OPTIONS = ["todo", "nota", "cambios"] as const;

export type EmpresaOperativaSortField =
  (typeof EMPRESA_OPERATIVA_SORT_FIELDS)[number];
export type MisEmpresasSortField = (typeof MIS_EMPRESAS_SORT_FIELDS)[number];
export type EmpresaOperativaAsignacion =
  (typeof EMPRESA_OPERATIVA_ASIGNACION_OPTIONS)[number];
export type EmpresaEventosTipo = (typeof EMPRESA_EVENTOS_TIPO_OPTIONS)[number];

export type EmpresaOperativaListParams = {
  q: string;
  estado: string;
  asignacion: EmpresaOperativaAsignacion;
  page: number;
  pageSize: number;
  sort: EmpresaOperativaSortField;
  direction: "asc" | "desc";
};

export type EmpresaMisListParams = {
  q: string;
  estado: string;
  nuevas: boolean;
  page: number;
  pageSize: number;
  sort: MisEmpresasSortField;
  direction: "asc" | "desc";
};

export type EmpresaEventosParams = {
  tipo: EmpresaEventosTipo;
  page: number;
  pageSize: number;
};

function normalizeOptionalString(value: unknown) {
  const normalized = normalizeEmpresaNullableText(value);
  return typeof normalized === "string" ? normalized : "";
}

function normalizeRequiredText(value: unknown) {
  const normalized = normalizeEmpresaNullableText(value);
  return typeof normalized === "string" ? normalized : "";
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function parseEstadoParam(value: string | null) {
  const normalized = normalizeEmpresaEstado(value);
  if (
    typeof normalized === "string" &&
    (EMPRESA_ESTADO_OPTIONS as readonly string[]).includes(normalized)
  ) {
    return normalized;
  }

  return "";
}

function parseSort(value: string | null): EmpresaOperativaSortField {
  if (
    typeof value === "string" &&
    (EMPRESA_OPERATIVA_SORT_FIELDS as readonly string[]).includes(value)
  ) {
    return value as EmpresaOperativaSortField;
  }

  return "updated_at";
}

function parseMisSort(value: string | null): MisEmpresasSortField {
  if (
    typeof value === "string" &&
    (MIS_EMPRESAS_SORT_FIELDS as readonly string[]).includes(value)
  ) {
    return value as MisEmpresasSortField;
  }

  return "ultimoFormato";
}

function parseDirection(value: string | null) {
  return value === "asc" ? "asc" : "desc";
}

function parseAsignacion(value: string | null): EmpresaOperativaAsignacion {
  if (
    typeof value === "string" &&
    (EMPRESA_OPERATIVA_ASIGNACION_OPTIONS as readonly string[]).includes(value)
  ) {
    return value as EmpresaOperativaAsignacion;
  }

  return "todo";
}

function parseEventoTipo(value: string | null): EmpresaEventosTipo {
  if (
    typeof value === "string" &&
    (EMPRESA_EVENTOS_TIPO_OPTIONS as readonly string[]).includes(value)
  ) {
    return value as EmpresaEventosTipo;
  }

  return "todo";
}

export function parseEmpresaOperativaListParams(
  searchParams: URLSearchParams
): EmpresaOperativaListParams {
  return {
    q: normalizeOptionalString(searchParams.get("q")).slice(0, 120),
    estado: parseEstadoParam(searchParams.get("estado")),
    asignacion: parseAsignacion(searchParams.get("asignacion")),
    page: parsePositiveInt(searchParams.get("page"), 1, 10_000),
    pageSize: parsePositiveInt(searchParams.get("pageSize"), 25, 50),
    sort: parseSort(searchParams.get("sort")),
    direction: parseDirection(searchParams.get("direction")),
  };
}

export function parseMisEmpresasListParams(
  searchParams: URLSearchParams
): EmpresaMisListParams {
  return {
    q: normalizeOptionalString(searchParams.get("q")).slice(0, 120),
    estado: parseEstadoParam(searchParams.get("estado")),
    nuevas: searchParams.get("nuevas") === "true",
    page: parsePositiveInt(searchParams.get("page"), 1, 10_000),
    pageSize: parsePositiveInt(searchParams.get("pageSize"), 25, 50),
    sort: parseMisSort(searchParams.get("sort")),
    direction: parseDirection(searchParams.get("direction")),
  };
}

export function parseEmpresaEventosParams(
  searchParams: URLSearchParams
): EmpresaEventosParams {
  return {
    tipo: parseEventoTipo(searchParams.get("tipo")),
    page: parsePositiveInt(searchParams.get("page"), 1, 10_000),
    pageSize: parsePositiveInt(searchParams.get("pageSize"), 20, 50),
  };
}

const requiredComment = z.preprocess(
  normalizeRequiredText,
  z
    .string()
    .min(1, "Agrega un comentario para continuar.")
    .max(500, "El comentario puede tener máximo 500 caracteres.")
);

const requiredNote = z.preprocess(
  normalizeRequiredText,
  z
    .string()
    .min(1, "Escribe una nota antes de guardarla.")
    .max(2000, "La nota puede tener máximo 2000 caracteres.")
);

const estadoOperativo = z.preprocess((value) => {
  const normalized = normalizeEmpresaEstado(value);
  return typeof normalized === "undefined" ? "" : normalized;
}, z.enum(EMPRESA_ESTADO_OPTIONS, { message: "Selecciona un estado válido." }));

export const reclamarEmpresaSchema = z.object({
  comentario: requiredComment,
});

export const soltarEmpresaSchema = z.object({
  comentario: requiredComment,
});

export const cambiarEstadoEmpresaSchema = z.object({
  estado: estadoOperativo,
  comentario: requiredComment,
});

export const notaEmpresaSchema = z.object({
  contenido: requiredNote,
});
