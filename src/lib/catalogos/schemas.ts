import { z } from "zod";
import {
  buildInterpreteNameKey,
  normalizeInterpreteName,
} from "@/lib/interpretesCatalog";

export const CATALOGO_KINDS = ["asesores", "gestores", "interpretes"] as const;
export type CatalogoKind = (typeof CATALOGO_KINDS)[number];

export const catalogoKindSchema = z.enum(CATALOGO_KINDS);

const CATALOG_SORT_FIELDS = {
  asesores: ["nombre", "email", "telefono", "sede", "localidad", "gestor"],
  gestores: ["nombre", "email", "telefono", "sede", "localidades"],
  interpretes: ["nombre", "created_at"],
} as const satisfies Record<CatalogoKind, readonly string[]>;

const LIST_ESTADOS = ["activos", "eliminados", "todos"] as const;
const LIST_DIRECTIONS = ["asc", "desc"] as const;

const LOWERCASE_CONNECTORS = new Set(["de", "del", "la", "las", "los", "y"]);
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/g;

export type CatalogoSortField<K extends CatalogoKind = CatalogoKind> =
  (typeof CATALOG_SORT_FIELDS)[K][number];

function normalizeSpacing(value: string) {
  return value.replace(ZERO_WIDTH_CHARS, "").trim().replace(/\s+/g, " ");
}

function normalizeTitleText(value: string) {
  const normalized = normalizeSpacing(value).toLocaleLowerCase("es-CO");
  return normalized
    .split(" ")
    .map((word, index) => {
      if (index > 0 && LOWERCASE_CONNECTORS.has(word)) {
        return word;
      }
      return word.charAt(0).toLocaleUpperCase("es-CO") + word.slice(1);
    })
    .join(" ");
}

function nullableTitleText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = normalizeTitleText(value);
  return normalized || null;
}

function nullablePlainText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = normalizeSpacing(value);
  return normalized || null;
}

function nullableEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = normalizeSpacing(value).toLocaleLowerCase("es-CO");
  return normalized || null;
}

export function normalizeCatalogoPhone(value: unknown) {
  if (value === null || typeof value === "undefined" || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("El teléfono solo puede contener números y máximo 10 dígitos.");
  }

  const normalized = value.replace(ZERO_WIDTH_CHARS, "").replace(/\s+/g, "");
  if (!normalized) {
    return null;
  }
  if (!/^\d{1,10}$/.test(normalized)) {
    throw new Error("El teléfono solo puede contener números y máximo 10 dígitos.");
  }
  return normalized;
}

const nullableEmailSchema = z.preprocess(
  nullableEmail,
  z.string().email("Ingresa un correo válido.").nullable()
);

const nullablePhoneSchema = z.preprocess((value, context) => {
  try {
    return normalizeCatalogoPhone(value);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        error instanceof Error
          ? error.message
          : "El teléfono solo puede contener números y máximo 10 dígitos.",
    });
    return z.NEVER;
  }
}, z.string().nullable());

const requiredNameSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeTitleText(value) : value),
  z.string().min(1, "El nombre es obligatorio.")
);

const asesorSchema = z.object({
  nombre: requiredNameSchema,
  email: nullableEmailSchema.default(null),
  telefono: nullablePhoneSchema.default(null),
  sede: z.preprocess(nullableTitleText, z.string().nullable()).default(null),
  localidad: z.preprocess(nullableTitleText, z.string().nullable()).default(null),
  gestor: z.preprocess(nullableTitleText, z.string().nullable()).default(null),
});

const gestorSchema = z.object({
  nombre: requiredNameSchema,
  email: nullableEmailSchema.default(null),
  telefono: nullablePhoneSchema.default(null),
  sede: z.preprocess(nullableTitleText, z.string().nullable()).default(null),
  localidades: z.preprocess(nullablePlainText, z.string().nullable()).default(null),
});

const interpreteSchema = z.object({
  nombre: z.preprocess(
    (value) =>
      typeof value === "string"
        ? normalizeInterpreteName(value)
            .toLocaleLowerCase("es-CO")
            .split(" ")
            .map(
              (word) =>
                word.charAt(0).toLocaleUpperCase("es-CO") + word.slice(1)
            )
            .join(" ")
        : value,
    z.string().min(1, "El nombre es obligatorio.")
  ),
  nombre_key: z.string().optional(),
}).transform((value) => ({
  nombre: value.nombre,
  nombre_key: buildInterpreteNameKey(value.nombre),
}));

export function catalogoRecordSchema(kind: "asesores"): typeof asesorSchema;
export function catalogoRecordSchema(kind: "gestores"): typeof gestorSchema;
export function catalogoRecordSchema(kind: "interpretes"): typeof interpreteSchema;
export function catalogoRecordSchema(
  kind: CatalogoKind
): typeof asesorSchema | typeof gestorSchema | typeof interpreteSchema;
export function catalogoRecordSchema(kind: CatalogoKind) {
  if (kind === "asesores") {
    return asesorSchema;
  }
  if (kind === "gestores") {
    return gestorSchema;
  }
  return interpreteSchema;
}

function readTextParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value ? value.slice(0, 120) : "";
}

function readPageParam(params: URLSearchParams, key: string, fallback: number) {
  const value = Number.parseInt(params.get(key) ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getCatalogoSortFields(kind: CatalogoKind) {
  return CATALOG_SORT_FIELDS[kind];
}

export function parseCatalogoListParams<K extends CatalogoKind>(
  kind: K,
  params: URLSearchParams
) {
  const estado = params.get("estado");
  const sort = params.get("sort");
  const direction = params.get("direction");
  const sortFields = CATALOG_SORT_FIELDS[kind];
  const allowedSortFields: readonly string[] = sortFields;
  const parsedSort = sort && allowedSortFields.includes(sort) ? sort : "nombre";
  return {
    q: readTextParam(params, "q"),
    estado: LIST_ESTADOS.includes(estado as (typeof LIST_ESTADOS)[number])
      ? (estado as (typeof LIST_ESTADOS)[number])
      : "activos",
    sort: parsedSort as CatalogoSortField<K>,
    direction: LIST_DIRECTIONS.includes(direction as (typeof LIST_DIRECTIONS)[number])
      ? (direction as (typeof LIST_DIRECTIONS)[number])
      : "asc",
    page: readPageParam(params, "page", 1),
    pageSize: Math.min(readPageParam(params, "pageSize", 50), 100),
  };
}

export type CatalogoListParams = ReturnType<typeof parseCatalogoListParams>;
export type CatalogoRecordInput = z.infer<ReturnType<typeof catalogoRecordSchema>>;
