import {
  EMPRESA_EVENT_TYPES,
  EMPRESA_SELECT_FIELDS,
} from "@/lib/empresas/constants";
import {
  deserializeEmpresaContacts,
  type EmpresaContact,
} from "@/lib/empresas/contacts";
import { getAssignmentAlertsStartAt } from "@/lib/empresas/lifecycle-config";
import {
  describeEmpresaEvent,
  summarizeEmpresaEvent,
  type EmpresaMutationActor,
} from "@/lib/empresas/events";
import type {
  EmpresaEventosParams,
  EmpresaMisListParams,
  EmpresaOperativaListParams,
} from "@/lib/empresas/lifecycle-schemas";
import { EmpresaServerError, type EmpresaRow } from "@/lib/empresas/server";
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

type EmpresaMisResumenRow = {
  id: string;
  nombre_empresa: string | null;
  nit_empresa: string | null;
  estado: string | null;
  updated_at: string | null;
  profesional_asignado_id: number | null;
  profesional_asignado: string | null;
  ultimo_formato_at: string | null;
  ultimo_formato_nombre: string | null;
  es_nueva: boolean | null;
  total_count: number | null;
  new_count: number | null;
};

type EmpresaUltimoFormatoRow = {
  ultimo_formato_at: string | null;
  ultimo_formato_nombre: string | null;
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

type RpcResult<T> = {
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

type EmpresaDetailQuery = {
  eq: (column: string, value: string) => EmpresaDetailQuery;
  is: (column: string, value: null) => EmpresaDetailQuery;
  maybeSingle: () => Promise<MaybeSingleResult<EmpresaRow>>;
};

type EmpresasTableClient = {
  select: {
    (fields: "id"): EmpresaExistsQuery;
    (fields: string): EmpresaDetailQuery;
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
  rpc: {
    (
      name: "empresas_profesional_mis_resumen",
      args: Record<string, unknown>
    ): Promise<RpcResult<EmpresaMisResumenRow[]>>;
    (
      name: "empresa_ultimo_formato",
      args: Record<string, unknown>
    ): Promise<RpcResult<EmpresaUltimoFormatoRow[]>>;
  };
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

export type MisEmpresaItem = EmpresaOperativaItem & {
  ultimoFormatoAt: string | null;
  ultimoFormatoNombre: string | null;
  esNueva: boolean;
};

export type MisEmpresasResult = {
  items: MisEmpresaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  newCount: number;
};

export type EmpresaEventoOperativoItem = {
  id: string;
  tipo: string | null;
  actorNombre: string | null;
  createdAt: string;
  resumen: string;
  detalle: string;
};

export type EmpresaOperativaDetail = {
  id: string;
  nombreEmpresa: string | null;
  nitEmpresa: string | null;
  direccionEmpresa: string | null;
  ciudadEmpresa: string | null;
  sedeEmpresa: string | null;
  zonaEmpresa: string | null;
  gestion: string | null;
  cajaCompensacion: string | null;
  asesor: string | null;
  correoAsesor: string | null;
  estado: string | null;
  observaciones: string | null;
  comentariosEmpresas: string | null;
  responsable: EmpresaContact;
  contactos: EmpresaContact[];
  profesionalAsignadoId: number | null;
  profesionalAsignado: string | null;
  correoProfesional: string | null;
  assignmentStatus: EmpresaAssignmentStatus;
  ultimoFormatoAt: string | null;
  ultimoFormatoNombre: string | null;
  createdAt: string | null;
  updatedAt: string | null;
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

function mapMisEmpresaRow(row: EmpresaMisResumenRow): MisEmpresaItem {
  return {
    id: row.id,
    nombreEmpresa: row.nombre_empresa,
    nitEmpresa: row.nit_empresa,
    ciudadEmpresa: null,
    sedeEmpresa: null,
    estado: row.estado,
    updatedAt: row.updated_at,
    profesionalAsignadoId: row.profesional_asignado_id,
    profesionalAsignado: row.profesional_asignado,
    assignmentStatus: "tuya",
    ultimoFormatoAt: row.ultimo_formato_at,
    ultimoFormatoNombre: row.ultimo_formato_nombre,
    esNueva: row.es_nueva === true,
  };
}

function emptyPoolResult(params: EmpresaOperativaListParams) {
  return {
    items: [],
    total: 0,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: 0,
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
  params: EmpresaMisListParams;
}): Promise<MisEmpresasResult> {
  const admin = createEmpresaLifecycleClient();
  const offset = (options.params.page - 1) * options.params.pageSize;
  const { data, error } = await admin.rpc("empresas_profesional_mis_resumen", {
    p_profesional_id: options.actor.profesionalId ?? -1,
    p_q: options.params.q || null,
    p_estado: options.params.estado || null,
    p_nuevas: options.params.nuevas,
    p_alert_start_at: getAssignmentAlertsStartAt(),
    p_sort: options.params.sort,
    p_direction: options.params.direction,
    p_limit: options.params.pageSize,
    p_offset: offset,
  });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as EmpresaMisResumenRow[];
  const total = rows[0]?.total_count ?? 0;
  const newCount = rows[0]?.new_count ?? 0;

  return {
    items: rows.map(mapMisEmpresaRow),
    total,
    page: options.params.page,
    pageSize: options.params.pageSize,
    totalPages: Math.ceil(total / options.params.pageSize),
    newCount,
  };
}

export async function countMisEmpresasNuevas(actor: EmpresaMutationActor) {
  const result = await listMisEmpresas({
    actor,
    params: {
      q: "",
      estado: "",
      nuevas: true,
      page: 1,
      pageSize: 1,
      sort: "ultimoFormato",
      direction: "desc",
    },
  });

  return result.newCount;
}

export async function listEmpresaPool(options: {
  actor: EmpresaMutationActor;
  params: EmpresaOperativaListParams;
}) {
  if (options.params.q.trim().length < 3) {
    return emptyPoolResult(options.params);
  }

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

function mapEmpresaDetailRow(
  row: EmpresaRow,
  actor: EmpresaMutationActor,
  ultimoFormato: EmpresaUltimoFormatoRow | null
): EmpresaOperativaDetail {
  const parsedContacts = deserializeEmpresaContacts(
    {
      responsable_visita: row.responsable_visita,
      contacto_empresa: row.contacto_empresa,
      cargo: row.cargo,
      telefono_empresa: row.telefono_empresa,
      correo_1: row.correo_1,
    },
    { preserveLegacyContactValues: true }
  );
  const contactos = [
    parsedContacts.responsable,
    ...parsedContacts.adicionales,
  ].filter((contact) =>
    Boolean(contact.nombre || contact.cargo || contact.telefono || contact.correo)
  );

  return {
    id: row.id,
    nombreEmpresa: row.nombre_empresa,
    nitEmpresa: row.nit_empresa,
    direccionEmpresa: row.direccion_empresa,
    ciudadEmpresa: row.ciudad_empresa,
    sedeEmpresa: row.sede_empresa,
    zonaEmpresa: row.zona_empresa,
    gestion: row.gestion,
    cajaCompensacion: row.caja_compensacion,
    asesor: row.asesor,
    correoAsesor: row.correo_asesor,
    estado: row.estado,
    observaciones: row.observaciones,
    comentariosEmpresas: row.comentarios_empresas,
    responsable: parsedContacts.responsable,
    contactos,
    profesionalAsignadoId: row.profesional_asignado_id,
    profesionalAsignado: row.profesional_asignado,
    correoProfesional: row.correo_profesional,
    assignmentStatus: assignmentStatusFor(
      {
        id: row.id,
        nombre_empresa: row.nombre_empresa,
        nit_empresa: row.nit_empresa,
        ciudad_empresa: row.ciudad_empresa,
        sede_empresa: row.sede_empresa,
        estado: row.estado,
        updated_at: row.updated_at,
        profesional_asignado_id: row.profesional_asignado_id,
        profesional_asignado: row.profesional_asignado,
      },
      actor
    ),
    ultimoFormatoAt: ultimoFormato?.ultimo_formato_at ?? null,
    ultimoFormatoNombre: ultimoFormato?.ultimo_formato_nombre ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getEmpresaOperativaDetail(options: {
  actor: EmpresaMutationActor;
  empresaId: string;
}): Promise<EmpresaOperativaDetail> {
  const admin = createEmpresaLifecycleClient();
  const { data, error } = await admin
    .from("empresas")
    .select(EMPRESA_SELECT_FIELDS)
    .eq("id", options.empresaId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new EmpresaServerError(404, "Empresa no encontrada.");
  }

  const { data: ultimoFormato, error: ultimoFormatoError } = await admin.rpc(
    "empresa_ultimo_formato",
    {
      p_nit_empresa: data.nit_empresa,
      p_nombre_empresa: data.nombre_empresa,
    }
  );

  if (ultimoFormatoError) {
    throw ultimoFormatoError;
  }

  return mapEmpresaDetailRow(
    data as EmpresaRow,
    options.actor,
    ((ultimoFormato as EmpresaUltimoFormatoRow[] | null) ?? [])[0] ?? null
  );
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
