import type { Empresa } from "@/lib/store/empresaStore";
import { EMPRESA_SELECT_FIELDS } from "@/lib/empresa";

type EmpresaLookupResult = {
  data: unknown[] | null;
  error: unknown;
};

type EmpresaLookupQuery = {
  eq(field: string, value: string): EmpresaLookupQuery;
  is(field: string, value: null): EmpresaLookupQuery;
  ilike(field: string, pattern: string): EmpresaLookupQuery;
  order(field: string, options?: { ascending?: boolean }): EmpresaLookupQuery;
  limit(count: number): PromiseLike<EmpresaLookupResult>;
};

export type EmpresaLookupClient = {
  from(table: "empresas"): {
    select(fields: string): EmpresaLookupQuery;
  };
};

type LookupOptions = {
  fields?: string;
  limit?: number;
};

function assertLookupSuccess(result: EmpresaLookupResult) {
  if (result.error) {
    throw result.error;
  }
}

function toEmpresaRows(data: unknown[] | null): Empresa[] {
  return ((data ?? []) as unknown) as Empresa[];
}

function compareEmpresaRows(left: Empresa, right: Empresa) {
  const byName = String(left.nombre_empresa ?? "").localeCompare(
    String(right.nombre_empresa ?? "")
  );
  return byName || String(left.id ?? "").localeCompare(String(right.id ?? ""));
}

function mergeEmpresaRows(rows: Empresa[], limit: number) {
  const seen = new Set<string>();
  const merged: Empresa[] = [];

  for (const row of rows) {
    const key = row.id || `${row.nit_empresa ?? ""}:${row.nombre_empresa ?? ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(row);
  }

  return merged.sort(compareEmpresaRows).slice(0, limit);
}

/**
 * Stable ordering keeps single-row fallback deterministic when a NIT has
 * duplicate active companies. Ambiguous flows still use listActiveEmpresasByNit.
 */
function orderActiveEmpresaLookup(query: EmpresaLookupQuery) {
  return query
    .is("deleted_at", null)
    .order("nombre_empresa", { ascending: true })
    .order("id", { ascending: true });
}

export async function searchActiveEmpresasByNombreOrNit(
  supabase: EmpresaLookupClient,
  query: string,
  options: LookupOptions = {}
): Promise<Empresa[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return [];
  }

  const fields = options.fields ?? EMPRESA_SELECT_FIELDS;
  const limit = options.limit ?? 20;
  const pattern = `%${normalizedQuery}%`;

  const [nombreResult, nitResult] = await Promise.all([
    orderActiveEmpresaLookup(
      supabase
        .from("empresas")
        .select(fields)
        .ilike("nombre_empresa", pattern)
    ).limit(limit),
    orderActiveEmpresaLookup(
      supabase
        .from("empresas")
        .select(fields)
        .ilike("nit_empresa", pattern)
    ).limit(limit),
  ]);

  assertLookupSuccess(nombreResult);
  assertLookupSuccess(nitResult);
  return mergeEmpresaRows(
    [...toEmpresaRows(nombreResult.data), ...toEmpresaRows(nitResult.data)],
    limit
  );
}

export async function listActiveEmpresasByNit(
  supabase: EmpresaLookupClient,
  nitEmpresa: string,
  options: LookupOptions = {}
): Promise<Empresa[]> {
  const normalizedNit = nitEmpresa.trim();
  if (!normalizedNit) {
    return [];
  }

  const result = await orderActiveEmpresaLookup(
    supabase
      .from("empresas")
      .select(options.fields ?? EMPRESA_SELECT_FIELDS)
      .eq("nit_empresa", normalizedNit)
  ).limit(options.limit ?? 1000);

  assertLookupSuccess(result);
  return toEmpresaRows(result.data);
}

export async function getFirstActiveEmpresaByNit(
  supabase: EmpresaLookupClient,
  nitEmpresa: string,
  options: LookupOptions = {}
): Promise<Empresa | null> {
  const [empresa] = await listActiveEmpresasByNit(supabase, nitEmpresa, {
    ...options,
    limit: 1,
  });
  return empresa ?? null;
}
