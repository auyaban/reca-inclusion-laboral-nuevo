import type { EmpresaListParams } from "@/lib/empresas/schemas";

type EmpresaQueryBuilder = {
  is: (column: string, value: null) => EmpresaQueryBuilder;
  or: (filters: string) => EmpresaQueryBuilder;
  eq: (column: string, value: string | number) => EmpresaQueryBuilder;
  order: (
    column: string,
    options: { ascending: boolean; nullsFirst: boolean }
  ) => EmpresaQueryBuilder;
  range: (from: number, to: number) => EmpresaQueryBuilder;
};

const SEARCH_COLUMNS = [
  "nombre_empresa",
  "nit_empresa",
  "ciudad_empresa",
] as const;

function escapeSearchTerm(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(",", " ");
}

export function applyEmpresaListQuery<T extends EmpresaQueryBuilder>(
  query: T,
  params: EmpresaListParams
): T {
  let next = query.is("deleted_at", null) as T;

  if (params.q) {
    const term = escapeSearchTerm(params.q);
    next = next.or(
      SEARCH_COLUMNS.map((column) => `${column}.ilike.%${term}%`).join(",")
    ) as T;
  }

  if (params.estado) {
    next = next.eq("estado", params.estado) as T;
  }

  if (params.gestion) {
    next = next.eq("gestion", params.gestion) as T;
  }

  if (params.caja) {
    next = next.eq("caja_compensacion", params.caja) as T;
  }

  if (params.zona) {
    next = next.eq("zona_empresa", params.zona) as T;
  }

  if (params.asesor) {
    next = next.eq("asesor", params.asesor) as T;
  }

  if (params.profesionalId) {
    next = next.eq("profesional_asignado_id", params.profesionalId) as T;
  }

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  return next
    .order(params.sort, {
      ascending: params.direction === "asc",
      nullsFirst: false,
    })
    .range(from, to) as T;
}
