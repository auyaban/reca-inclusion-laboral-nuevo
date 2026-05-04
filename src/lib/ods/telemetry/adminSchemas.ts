import type {
  OdsTelemetryConfidence,
  OdsTelemetryImportOrigin,
} from "@/lib/ods/telemetry/types";

export const ODS_TELEMETRY_IMPORT_ORIGINS = [
  "acta_pdf",
  "acta_excel",
  "acta_id_directo",
  "manual",
] as const satisfies readonly OdsTelemetryImportOrigin[];

export const ODS_TELEMETRY_CONFIDENCES = [
  "low",
  "medium",
  "high",
] as const satisfies readonly OdsTelemetryConfidence[];

export const ODS_TELEMETRY_MISMATCH_FILTERS = [
  "si",
  "no",
  "pendiente",
] as const;

const DIRECTIONS = ["asc", "desc"] as const;
const SORT_FIELDS = ["created_at"] as const;

export type OdsTelemetryMismatchFilter =
  | (typeof ODS_TELEMETRY_MISMATCH_FILTERS)[number]
  | "";

export type OdsTelemetryAdminSort = (typeof SORT_FIELDS)[number];
export type OdsTelemetryAdminDirection = (typeof DIRECTIONS)[number];

export type OdsTelemetryAdminParams = {
  origins: OdsTelemetryImportOrigin[];
  confidences: OdsTelemetryConfidence[];
  mismatch: OdsTelemetryMismatchFilter;
  from: string;
  to: string;
  page: number;
  pageSize: number;
  sort: OdsTelemetryAdminSort;
  direction: OdsTelemetryAdminDirection;
};

function uniqueValid<T extends readonly string[]>(
  values: string[],
  allowed: T
): T[number][] {
  const allowedSet = new Set<string>(allowed);
  return [...new Set(values.map((value) => value.trim()))].filter(
    (value): value is T[number] => allowedSet.has(value)
  );
}

function readDateParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function readPageParam(params: URLSearchParams, key: string, fallback: number) {
  const parsed = Number.parseInt(params.get(key) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseOdsTelemetryAdminParams(
  params: URLSearchParams
): OdsTelemetryAdminParams {
  const mismatchValue = params.get("mismatch")?.trim() ?? "";
  const mismatch = ODS_TELEMETRY_MISMATCH_FILTERS.includes(
    mismatchValue as (typeof ODS_TELEMETRY_MISMATCH_FILTERS)[number]
  )
    ? (mismatchValue as OdsTelemetryMismatchFilter)
    : "";
  const directionValue = params.get("direction")?.trim() ?? "";
  const direction = DIRECTIONS.includes(
    directionValue as OdsTelemetryAdminDirection
  )
    ? (directionValue as OdsTelemetryAdminDirection)
    : "desc";
  const sortValue = params.get("sort")?.trim() ?? "";
  const sort = SORT_FIELDS.includes(sortValue as OdsTelemetryAdminSort)
    ? (sortValue as OdsTelemetryAdminSort)
    : "created_at";

  return {
    origins: uniqueValid(params.getAll("origin"), ODS_TELEMETRY_IMPORT_ORIGINS),
    confidences: uniqueValid(
      params.getAll("confidence"),
      ODS_TELEMETRY_CONFIDENCES
    ),
    mismatch,
    from: readDateParam(params, "from"),
    to: readDateParam(params, "to"),
    page: readPageParam(params, "page", 1),
    pageSize: Math.min(readPageParam(params, "pageSize", 50), 100),
    sort,
    direction,
  };
}
