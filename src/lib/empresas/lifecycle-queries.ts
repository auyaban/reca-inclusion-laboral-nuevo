import { EMPRESA_EVENT_TYPES } from "@/lib/empresas/constants";
import {
  describeEmpresaEvent,
  summarizeEmpresaEvent,
  type EmpresaMutationActor,
} from "@/lib/empresas/events";
import type {
  EmpresaEventosParams,
  EmpresaOperativaListParams,
} from "@/lib/empresas/lifecycle-schemas";
import { EmpresaServerError } from "@/lib/empresas/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// cspell:ignore asignacion

export const EMPRESA_OPERATIVA_LIST_FIELDS = [
  "id",
  "nombre_empresa",
  "nit_empresa",
  "ciudad_empresa",
  "sede_empresa",
  "estado",
  "updated_at",
  "profesional_asignado_id",
  "profesional_asignado",
].join(", ");

const SEARCH_COLUMNS = [
  "nombre_empresa",
  "nit_empresa",
  "ciudad_empresa",
] as const;

const EVENT_CHANGE_TYPES = EMPRESA_EVENT_TYPES.filter((tipo) => tipo !== "nota");

type QueryError = {
  message?: string;
  code?: string;
};

type EmpresaOperativaRow = {
  id: string;
  nombre_empresa: string | null;
  nit_empresa: string | null;
  ciudad_empresa: string | null;
  sede_empresa: string | null;
  estado: string | null;
  updated_at: string | null;
  profesional_asignado_id: number | null;
  profesional_asignado: string | null;
};

type EmpresaEventoOperativoRow = {
  id: string;
  empresa_id: string;
  tipo: string | null;
  actor_user_id: string;
  actor_profesional_id: number | null;
  actor_nombre: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type ListResult<T> = {
  data: T[] | null;
  error: QueryError | null;
  count: number | null;
};

type MaybeSingleResult<T> = {
  data: T | null;
  error: QueryError | null;
};

type EmpresaListQuery = {
  is: (column: string, value: null) => EmpresaListQuery;
  not: (column: string, operator: string, value: null) => EmpresaListQuery;
  eq: (column: string, value: string | number) => EmpresaListQuery;
  or: (filters: string) => EmpresaListQuery;
  order: (
    column: string,
    options: { ascending: boolean; nullsFirst: boolean }
  ) => EmpresaListQuery;
  range: (from: number, to: number) => EmpresaListQuery;
  then: PromiseLike<ListResult<EmpresaOperativaRow>>["then"];
};

type EmpresaEventQuery = {
  eq: (column: string, value: string) => EmpresaEventQuery;
  in: (column: string, value: readonly string[]) => EmpresaEventQuery;
  order: (
    column: string,
    options: { ascending: boolean; nullsFirst: boolean }
  ) => EmpresaEventQuery;
  range: (from: number, to: number) => EmpresaEventQuery;
  then: PromiseLike<ListResult<EmpresaEventoOperativoRow>>["then"];
};

type EmpresaExistsQuery = {
  eq: (column: string, value: string) => EmpresaExistsQuery;
  is: (column: string, value: null) => EmpresaExistsQuery;
  maybeSingle: () => Promise<MaybeSingleResult<{ id: string }>>;
};

type EmpresasTableClient = {
  select: {
    (fields: "id"): EmpresaExistsQuery;
    (fields: string, options: { count: "exact" }): EmpresaListQuery;
  };
};

type EmpresaEventosTableClient = {
  select: (
    fields: string,
    options: { count: "exact" }
  ) => EmpresaEventQuery;
};

type EmpresaLifecycleAdminClient = {
  from: {
    (table: "empresas"): EmpresasTableClient;
    (table: "empresa_eventos"): EmpresaEventosTableClient;
  };
};

export type EmpresaAssignmentStatus = "libre" | "asignada" | "tuya";

export type EmpresaOperativaItem = {
  id: string;
  nombreEmpresa: string | null;
  nitEmpresa: string | null;
  ciudadEmpresa: string | null;
  sedeEmpresa: string | null;
  estado: string | null;
  updatedAt: string | null;
  profesionalAsignadoId: number | null;
  profesionalAsignado: string | null;
  assignmentStatus: EmpresaAssignmentStatus;
};

export type EmpresaEventoOperativoItem = {
  id: string;
  tipo: string | null;
  actorNombre: string | null;
  createdAt: string;
  resumen: string;
  detalle: string;
};

function escapeSearchTerm(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(",", " ");
}

function createEmpresaLifecycleClient() {
  return createSupabaseAdminClient() as unknown as EmpresaLifecycleAdminClient;
}

function applyCommonEmpresaFilters<T extends EmpresaListQuery>(
  query: T,
  params: EmpresaOperativaListParams
) {
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

  if (params.asignacion === "libres") {
    next = next.is("profesional_asignado_id", null) as T;
  }

  if (params.asignacion === "asignadas") {
    next = next.not("profesional_asignado_id", "is", null) as T;
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

function assignmentStatusFor(
  row: EmpresaOperativaRow,
  actor: EmpresaMutationActor
): EmpresaAssignmentStatus {
  if (!row.profesional_asignado_id) {
    return "libre";
  }

  return row.profesional_asignado_id === actor.profesionalId ? "tuya" : "asignada";
}

function mapEmpresaOperativaRow(
  row: EmpresaOperativaRow,
  actor: EmpresaMutationActor
): EmpresaOperativaItem {
  return {
    id: row.id,
    nombreEmpresa: row.nombre_empresa,
    nitEmpresa: row.nit_empresa,
    ciudadEmpresa: row.ciudad_empresa,
    sedeEmpresa: row.sede_empresa,
    estado: row.estado,
    updatedAt: row.updated_at,
    profesionalAsignadoId: row.profesional_asignado_id,
    profesionalAsignado: row.profesional_asignado,
    assignmentStatus: assignmentStatusFor(row, actor),
  };
}

async function runEmpresaOperativaQuery(options: {
  actor: EmpresaMutationActor;
  params: EmpresaOperativaListParams;
  query: EmpresaListQuery;
}) {
  const { data, error, count } = await applyCommonEmpresaFilters(
    options.query,
    options.params
  );

  if (error) {
    throw error;
  }

  const total = count ?? 0;

  return {
    items: ((data ?? []) as EmpresaOperativaRow[]).map((row) =>
      mapEmpresaOperativaRow(row, options.actor)
    ),
    total,
    page: options.params.page,
    pageSize: options.params.pageSize,
    totalPages: Math.ceil(total / options.params.pageSize),
  };
}

export async function listMisEmpresas(options: {
  actor: EmpresaMutationActor;
  params: EmpresaOperativaListParams;
}) {
  const admin = createEmpresaLifecycleClient();
  const query = admin
    .from("empresas")
    .select(EMPRESA_OPERATIVA_LIST_FIELDS, { count: "exact" })
    .eq("profesional_asignado_id", options.actor.profesionalId ?? -1);

  return runEmpresaOperativaQuery({
    actor: options.actor,
    params: { ...options.params, asignacion: "todo" },
    query,
  });
}

export async function listEmpresaPool(options: {
  actor: EmpresaMutationActor;
  params: EmpresaOperativaListParams;
}) {
  const admin = createEmpresaLifecycleClient();
  const query = admin
    .from("empresas")
    .select(EMPRESA_OPERATIVA_LIST_FIELDS, { count: "exact" });

  return runEmpresaOperativaQuery({
    actor: options.actor,
    params: options.params,
    query,
  });
}

async function assertEmpresaActiva(empresaId: string) {
  const admin = createEmpresaLifecycleClient();
  const { data, error } = await (
    admin
      .from("empresas")
      .select("id")
      .eq("id", empresaId)
      .is("deleted_at", null)
  ).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new EmpresaServerError(404, "Empresa no encontrada.");
  }
}

function mapEmpresaEventoOperativo(
  event: EmpresaEventoOperativoRow
): EmpresaEventoOperativoItem {
  return {
    id: event.id,
    tipo: event.tipo,
    actorNombre: event.actor_nombre,
    createdAt: event.created_at,
    resumen: summarizeEmpresaEvent(event),
    detalle: describeEmpresaEvent(event),
  };
}

export async function listEmpresaEventosOperativos(options: {
  empresaId: string;
  params: EmpresaEventosParams;
}) {
  await assertEmpresaActiva(options.empresaId);

  const admin = createEmpresaLifecycleClient();
  let query = admin
    .from("empresa_eventos")
    .select(
      "id, empresa_id, tipo, actor_user_id, actor_profesional_id, actor_nombre, payload, created_at",
      { count: "exact" }
    )
    .eq("empresa_id", options.empresaId);

  if (options.params.tipo === "nota") {
    query = query.eq("tipo", "nota");
  }

  if (options.params.tipo === "cambios") {
    query = query.in("tipo", EVENT_CHANGE_TYPES);
  }

  const from = (options.params.page - 1) * options.params.pageSize;
  const to = from + options.params.pageSize - 1;
  const { data, error, count } = await query
    .order("created_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const total = count ?? 0;

  return {
    items: ((data ?? []) as EmpresaEventoOperativoRow[]).map(
      mapEmpresaEventoOperativo
    ),
    total,
    page: options.params.page,
    pageSize: options.params.pageSize,
    totalPages: Math.ceil(total / options.params.pageSize),
  };
}
