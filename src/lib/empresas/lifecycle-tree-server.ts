import { EmpresaServerError } from "@/lib/empresas/server";
import {
  buildEmpresaLifecycleTree,
  normalizeLifecycleDigits,
  type EmpresaLifecycleEvidenceRow,
  type EmpresaLifecycleSourceEmpresa,
} from "@/lib/empresas/lifecycle-tree";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const EMPRESA_LIFECYCLE_EVIDENCE_FIELDS = [
  "registro_id",
  "nombre_formato",
  "nombre_empresa",
  "created_at",
  "finalizado_at_colombia",
  "finalizado_at_iso",
  "path_formato",
  "payload_source",
  "payload_schema_version",
  "payload_normalized",
  "payload_generated_at",
  "acta_ref",
].join(", ");

const EMPRESA_LIFECYCLE_FIELDS =
  "id, nombre_empresa, nit_empresa, caja_compensacion";
const MAX_LIFECYCLE_EVIDENCE_ROWS = 250;

type QueryError = {
  message?: string;
  code?: string;
};

type MaybeSingleResult<T> = {
  data: T | null;
  error: QueryError | null;
};

type ListResult<T> = {
  data: T[] | null;
  error: QueryError | null;
};

type EmpresaQuery = {
  eq: (column: string, value: string) => EmpresaQuery;
  is: (column: string, value: null) => EmpresaQuery;
  maybeSingle: () => Promise<MaybeSingleResult<EmpresaLifecycleSourceEmpresa>>;
};

type EvidenceQuery = {
  or: (filters: string) => EvidenceQuery;
  order: (
    column: string,
    options: { ascending: boolean; nullsFirst: boolean }
  ) => EvidenceQuery;
  limit: (count: number) => EvidenceQuery;
  then: PromiseLike<ListResult<EmpresaLifecycleEvidenceRow>>["then"];
};

type EvidenceMatchKind = "nit" | "name" | "none";

type EmpresaLifecycleTreeClient = {
  from: {
    (table: "empresas"): {
      select: (fields: typeof EMPRESA_LIFECYCLE_FIELDS) => EmpresaQuery;
    };
    (table: "formatos_finalizados_il"): {
      select: (fields: typeof EMPRESA_LIFECYCLE_EVIDENCE_FIELDS) => EvidenceQuery;
    };
  };
};

function createLifecycleTreeClient() {
  return createSupabaseAdminClient() as unknown as EmpresaLifecycleTreeClient;
}

function cleanFilterText(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(",", " ");
}

function digitsToLooseIlikePattern(value: string) {
  return `%${[...value].join("%")}%`;
}

function normalizeName(value: string | null) {
  return value?.replace(/\s+/g, " ").trim().toLocaleLowerCase("es-CO") ?? "";
}

function getEvidenceMatchKind(
  row: EmpresaLifecycleEvidenceRow,
  empresa: EmpresaLifecycleSourceEmpresa
): EvidenceMatchKind {
  const payload = row.payload_normalized;
  const raw =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "parsed_raw" in payload &&
    payload.parsed_raw &&
    typeof payload.parsed_raw === "object" &&
    !Array.isArray(payload.parsed_raw)
      ? (payload.parsed_raw as Record<string, unknown>)
      : {};

  const empresaNit = normalizeLifecycleDigits(empresa.nit_empresa);
  const rowNit = normalizeLifecycleDigits(raw.nit_empresa);
  if (empresaNit && rowNit && empresaNit === rowNit) {
    return "nit";
  }

  const empresaName = normalizeName(empresa.nombre_empresa);
  const rowName = normalizeName(
    typeof raw.nombre_empresa === "string" ? raw.nombre_empresa : row.nombre_empresa
  );
  return empresaName && rowName && empresaName === rowName ? "name" : "none";
}

function buildEvidenceFilters(empresa: EmpresaLifecycleSourceEmpresa) {
  const filters: string[] = [];
  const nitDigits = normalizeLifecycleDigits(empresa.nit_empresa);
  const name = empresa.nombre_empresa?.replace(/\s+/g, " ").trim();

  if (nitDigits.length >= 6) {
    filters.push(
      `payload_normalized->parsed_raw->>nit_empresa.ilike.${digitsToLooseIlikePattern(nitDigits)}`
    );
  }

  if (name) {
    filters.push(`nombre_empresa.ilike.%${cleanFilterText(name)}%`);
    filters.push(
      `payload_normalized->parsed_raw->>nombre_empresa.ilike.%${cleanFilterText(name)}%`
    );
  }

  return filters.join(",");
}

export async function getEmpresaLifecycleTree(options: { empresaId: string }) {
  const admin = createLifecycleTreeClient();
  const { data: empresa, error: empresaError } = await admin
    .from("empresas")
    .select(EMPRESA_LIFECYCLE_FIELDS)
    .eq("id", options.empresaId)
    .is("deleted_at", null)
    .maybeSingle();

  if (empresaError) {
    throw empresaError;
  }

  if (!empresa) {
    throw new EmpresaServerError(404, "Empresa no encontrada.");
  }

  const filters = buildEvidenceFilters(empresa);
  if (!filters) {
    return buildEmpresaLifecycleTree({
      empresa,
      rows: [],
      evidenceLimitReached: false,
    });
  }

  // If this route frequently hits MAX_LIFECYCLE_EVIDENCE_ROWS, replace this
  // broad JSON-path query with a dedicated RPC/index for lifecycle evidence.
  const { data, error } = await admin
    .from("formatos_finalizados_il")
    .select(EMPRESA_LIFECYCLE_EVIDENCE_FIELDS)
    .or(filters)
    .order("finalizado_at_iso", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(MAX_LIFECYCLE_EVIDENCE_ROWS);

  if (error) {
    throw error;
  }

  const rows: EmpresaLifecycleEvidenceRow[] = [];
  const nameFallbackEvidenceIds: string[] = [];
  for (const row of (data ?? []) as EmpresaLifecycleEvidenceRow[]) {
    const match = getEvidenceMatchKind(row, empresa);
    if (match === "none") {
      continue;
    }
    rows.push(row);
    if (match === "name") {
      nameFallbackEvidenceIds.push(row.registro_id);
    }
  }

  return buildEmpresaLifecycleTree({
    empresa,
    rows,
    nameFallbackEvidenceIds,
    evidenceLimitReached: (data ?? []).length >= MAX_LIFECYCLE_EVIDENCE_ROWS,
  });
}
