import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BackofficeBadgeTone } from "@/components/backoffice";
import type {
  OdsMotorTelemetriaRow,
  OdsTelemetryJsonObject,
} from "@/lib/ods/telemetry/types";
import type { OdsTelemetryAdminParams } from "@/lib/ods/telemetry/adminSchemas";

export const TOP_MISMATCH_SCAN_LIMIT = 10000;

const TELEMETRY_SELECT_FIELDS = [
  "id",
  "ods_id",
  "idempotency_key",
  "import_origin",
  "motor_suggestion",
  "confidence",
  "final_value",
  "mismatch_fields",
  "created_at",
  "confirmed_at",
].join(", ");

const ACCURACY_FIELDS = [
  { field: "codigo_servicio", label: "Codigo servicio" },
  { field: "modalidad_servicio", label: "Modalidad servicio" },
  { field: "valor_total", label: "Valor total" },
  { field: "valor_base", label: "Valor base" },
] as const;

type QueryBuilder = {
  in: (column: string, values: readonly string[]) => QueryBuilder;
  gte: (column: string, value: string) => QueryBuilder;
  lte: (column: string, value: string) => QueryBuilder;
  is: (column: string, value: null) => QueryBuilder;
  not: (column: string, operator: string, value: unknown) => QueryBuilder;
  filter: (column: string, operator: string, value: string) => QueryBuilder;
  order: (
    column: string,
    options: { ascending: boolean; nullsFirst?: boolean }
  ) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
};

type TelemetryAdminClient = {
  from: (table: "ods_motor_telemetria") => {
    select: (
      fields: string,
      options?: { count?: "exact"; head?: boolean }
    ) => QueryBuilder;
  };
};

export type OdsTelemetryTopMismatchField = {
  field: string;
  count: number;
};

export type OdsTelemetryAccuracyMetric = {
  field: string;
  label: string;
  matches: number;
  total: number;
  accuracy: number | null;
};

export type OdsTelemetryAdminMetrics = {
  total: number;
  confirmed: number;
  pending: number;
  confirmedPercent: number;
  pendingPercent: number;
  accuracy: {
    confirmedCount: number;
    fields: OdsTelemetryAccuracyMetric[];
  };
  topMismatchFields: OdsTelemetryTopMismatchField[];
  topMismatchScanCapped: boolean;
  topMismatchTotal: number;
};

export type OdsTelemetryAdminResult = {
  items: OdsMotorTelemetriaRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  metrics: OdsTelemetryAdminMetrics;
};

function startOfDate(value: string) {
  return `${value}T00:00:00.000Z`;
}

function endOfDate(value: string) {
  return `${value}T23:59:59.999Z`;
}

function pgTextArray(values: readonly string[]) {
  return `{${values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",")}}`;
}

function applyOdsTelemetryFilters<T extends QueryBuilder>(
  query: T,
  params: OdsTelemetryAdminParams
): T {
  let next = query;

  if (params.origins.length > 0) {
    next = next.in("import_origin", params.origins) as T;
  }

  if (params.confidences.length > 0) {
    next = next.in("confidence", params.confidences) as T;
  }

  if (params.from) {
    next = next.gte("created_at", startOfDate(params.from)) as T;
  }

  if (params.to) {
    next = next.lte("created_at", endOfDate(params.to)) as T;
  }

  if (params.mismatch === "pendiente") {
    next = next.is("confirmed_at", null) as T;
  } else if (params.mismatch === "si") {
    next = next.not("confirmed_at", "is", null) as T;
    next = next.not("mismatch_fields", "eq", "{}") as T;
  } else if (params.mismatch === "no") {
    next = next.not("confirmed_at", "is", null) as T;
    next = next.filter("mismatch_fields", "eq", "{}") as T;
  }

  return next;
}

function withoutMismatchFilter(
  params: OdsTelemetryAdminParams
): OdsTelemetryAdminParams {
  return params.mismatch ? { ...params, mismatch: "" } : params;
}

function ratioPercent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function readCount(value: { count?: number | null }) {
  return value.count ?? 0;
}

function telemetryTable(admin: TelemetryAdminClient) {
  return admin.from("ods_motor_telemetria");
}

async function countRows(
  admin: TelemetryAdminClient,
  params: OdsTelemetryAdminParams,
  mutate?: (query: QueryBuilder) => QueryBuilder
) {
  let query = applyOdsTelemetryFilters(
    telemetryTable(admin).select("id", { count: "exact", head: true }) as QueryBuilder,
    params
  );
  if (mutate) {
    query = mutate(query);
  }

  const { error, count } = (await query) as { error?: unknown; count?: number | null };
  if (error) {
    throw error;
  }
  return count ?? 0;
}

export function hasActiveTelemetryFilters(params: OdsTelemetryAdminParams) {
  return Boolean(
    params.origins.length > 0 ||
      params.confidences.length > 0 ||
      params.mismatch ||
      params.from ||
      params.to
  );
}

export function getMismatchStatus(row: OdsMotorTelemetriaRow): {
  label: string;
  tone: BackofficeBadgeTone;
} {
  if (!row.confirmed_at) {
    return { label: "Pendiente", tone: "warning" };
  }

  if (row.mismatch_fields.length === 0) {
    return { label: "Match exacto", tone: "success" };
  }

  return { label: "Con diferencias", tone: "danger" };
}

export function readTelemetryJsonString(
  value: OdsTelemetryJsonObject | null,
  key: string
) {
  const raw = value?.[key];
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }
  return "";
}

export function computeTopMismatchFields(
  rows: Pick<OdsMotorTelemetriaRow, "mismatch_fields">[]
): OdsTelemetryTopMismatchField[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const field of row.mismatch_fields) {
      counts.set(field, (counts.get(field) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count || a.field.localeCompare(b.field, "es"))
    .slice(0, 10);
}

export function computeAccuracyMetrics(
  rows: Pick<OdsMotorTelemetriaRow, "confirmed_at" | "mismatch_fields">[]
) {
  const confirmed = rows.filter((row) => row.confirmed_at);

  return {
    confirmedCount: confirmed.length,
    fields: ACCURACY_FIELDS.map(({ field, label }) => {
      const matches = confirmed.filter(
        (row) => !row.mismatch_fields.includes(field)
      ).length;
      return {
        field,
        label,
        matches,
        total: confirmed.length,
        accuracy: confirmed.length > 0 ? ratioPercent(matches, confirmed.length) : null,
      };
    }),
  };
}

async function getAccuracyMetrics(
  admin: TelemetryAdminClient,
  params: OdsTelemetryAdminParams
) {
  const metricParams = withoutMismatchFilter(params);
  const [confirmedCount, ...matchesByField] = await Promise.all([
    countRows(admin, metricParams, (query) =>
      query.not("confirmed_at", "is", null)
    ),
    ...ACCURACY_FIELDS.map(({ field }) =>
      countRows(admin, metricParams, (query) =>
        query
          .not("confirmed_at", "is", null)
          .not("mismatch_fields", "cs", pgTextArray([field]))
      )
    ),
  ]);

  const fieldCounts = ACCURACY_FIELDS.map(({ field, label }, index) => {
    const matches = matchesByField[index] ?? 0;
    return {
      field,
      label,
      matches,
      total: confirmedCount,
      accuracy:
        confirmedCount > 0 ? ratioPercent(matches, confirmedCount) : null,
    };
  });

  return {
    confirmedCount,
    fields: fieldCounts,
  };
}

/**
 * Supabase JS cannot express unnest(mismatch_fields) + GROUP BY through
 * `.select()` filters, and adding an RPC would require a remote migration outside
 * this issue. This bounded server-side scan keeps the initial admin view simple;
 * if real volume exceeds the cap, replace it with a dedicated aggregate RPC.
 */
async function getTopMismatchMetrics(
  admin: TelemetryAdminClient,
  params: OdsTelemetryAdminParams
) {
  const metricParams = withoutMismatchFilter(params);
  const topMismatchTotal = await countRows(admin, metricParams, (query) =>
    query.not("confirmed_at", "is", null).not("mismatch_fields", "eq", "{}")
  );
  const query = applyOdsTelemetryFilters(
    telemetryTable(admin).select("mismatch_fields") as QueryBuilder,
    metricParams
  )
    .not("confirmed_at", "is", null)
    .not("mismatch_fields", "eq", "{}")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(TOP_MISMATCH_SCAN_LIMIT);

  const { data, error } = (await query) as {
    data?: Pick<OdsMotorTelemetriaRow, "mismatch_fields">[] | null;
    error?: unknown;
  };
  if (error) {
    throw error;
  }

  return {
    topMismatchFields: computeTopMismatchFields(data ?? []),
    topMismatchTotal,
    topMismatchScanCapped: topMismatchTotal > TOP_MISMATCH_SCAN_LIMIT,
  };
}

export async function getOdsTelemetryAdminData(options: {
  params: OdsTelemetryAdminParams;
  admin?: TelemetryAdminClient;
}): Promise<OdsTelemetryAdminResult> {
  const admin =
    options.admin ??
    (createSupabaseAdminClient() as unknown as TelemetryAdminClient);
  const { params } = options;
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  const listQuery = applyOdsTelemetryFilters(
    telemetryTable(admin).select(TELEMETRY_SELECT_FIELDS, { count: "exact" }) as QueryBuilder,
    params
  )
    .order(params.sort, {
      ascending: params.direction === "asc",
      nullsFirst: false,
    })
    .range(from, to);

  const [listResult, totalCount, confirmed, pending, accuracy, topMismatch] =
    await Promise.all([
      listQuery as unknown as Promise<{
        data?: OdsMotorTelemetriaRow[] | null;
        error?: unknown;
        count?: number | null;
      }>,
      countRows(admin, params),
      countRows(admin, params, (query) => query.not("confirmed_at", "is", null)),
      countRows(admin, params, (query) => query.is("confirmed_at", null)),
      getAccuracyMetrics(admin, params),
      getTopMismatchMetrics(admin, params),
    ]);

  if (listResult.error) {
    throw listResult.error;
  }

  const total = readCount(listResult) || totalCount;

  return {
    items: (listResult.data ?? []) as OdsMotorTelemetriaRow[],
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
    metrics: {
      total,
      confirmed,
      pending,
      confirmedPercent: ratioPercent(confirmed, total),
      pendingPercent: ratioPercent(pending, total),
      accuracy,
      ...topMismatch,
    },
  };
}
