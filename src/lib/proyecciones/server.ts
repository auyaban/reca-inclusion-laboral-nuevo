import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CreateProyeccionInput,
  ProyeccionesListParams,
  UpdateProyeccionInput,
} from "@/lib/proyecciones/schemas";

export type ProyeccionActor = {
  userId: string;
  profesionalId: number;
  nombre: string;
};

export type ProyeccionServerCode =
  | "created"
  | "updated"
  | "cancelled"
  | "not_found"
  | "forbidden"
  | "invalid_payload"
  | "invalid_service"
  | "invalid_modalidad"
  | "empresa_not_found"
  | "interpreter_data_required"
  | "interpreter_exception_required"
  | "already_cancelled"
  | "rpc_error";

export type ProyeccionMutationResponse = {
  ok: true;
  code: ProyeccionServerCode;
  message: string;
  data: {
    id?: string;
    interpreterProjectionId?: string | null;
  };
};

export class ProyeccionServerError extends Error {
  status: number;
  code: ProyeccionServerCode;

  constructor(options: { status: number; code: ProyeccionServerCode; message: string }) {
    super(options.message);
    this.name = "ProyeccionServerError";
    this.status = options.status;
    this.code = options.code;
  }
}

type RpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

type ProyeccionServicioRow = {
  service_key: string;
  nombre: string;
  proyectable: boolean | null;
  sugerir_interprete: boolean | null;
  modalidad_permitidas: string[] | null;
  requiere_cantidad_personas: boolean | null;
  requiere_numero_seguimiento: boolean | null;
  requiere_tamano_empresa: boolean | null;
};

type ProyeccionRow = {
  id: string;
  parent_projection_id: string | null;
  empresa_id: string;
  profesional_id: number;
  service_key: string;
  estado: string;
  inicio_at: string;
  fin_at: string;
  duracion_minutos: number;
  modalidad: string;
  cantidad_personas: number | null;
  numero_seguimiento: number | null;
  tamano_empresa_bucket: string | null;
  notes: string | null;
  requires_interpreter: boolean | null;
  interpreter_count: number | null;
  interpreter_projected_hours: number | null;
  interpreter_exception_reason: string | null;
  created_at: string;
  updated_at: string;
  empresas?: RelationValue<{
    id: string;
    nombre_empresa: string | null;
    nit_empresa: string | null;
  }>;
  profesionales?: RelationValue<{
    id: number;
    nombre_profesional: string | null;
  }>;
  proyeccion_servicios?: RelationValue<{
    service_key: string;
    nombre: string;
  }>;
};

type RelationValue<T> = T | T[] | null;

type QueryResult<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

type MaybeSingleResult<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type ProyeccionesQuery = {
  gte: (column: string, value: string) => ProyeccionesQuery;
  lt: (column: string, value: string) => ProyeccionesQuery;
  eq: (column: string, value: string | number) => ProyeccionesQuery;
  neq: (column: string, value: string | number) => ProyeccionesQuery;
  order: (
    column: string,
    options: { ascending: boolean }
  ) => Promise<QueryResult<ProyeccionRow>>;
  maybeSingle: () => Promise<MaybeSingleResult<ProyeccionRow>>;
};

type ServiciosQuery = {
  eq: (column: string, value: boolean) => ServiciosQuery;
  order: (
    column: string,
    options: { ascending: boolean }
  ) => Promise<QueryResult<ProyeccionServicioRow>>;
};

type ProyeccionesAdminClient = RpcClient & {
  from: {
    (table: "proyecciones"): {
      select: (fields: string) => ProyeccionesQuery;
    };
    (table: "proyeccion_servicios"): {
      select: (fields: string) => ServiciosQuery;
    };
  };
};

type RawRpcResponse = {
  ok?: unknown;
  code?: unknown;
  message?: unknown;
  data?: unknown;
};

export type ProyeccionServicioItem = {
  serviceKey: string;
  nombre: string;
  proyectable: boolean;
  sugerirInterprete: boolean;
  modalidadPermitidas: string[];
  requiereCantidadPersonas: boolean;
  requiereNumeroSeguimiento: boolean;
  requiereTamanoEmpresa: boolean;
};

export type ProyeccionItem = {
  id: string;
  parentProjectionId: string | null;
  empresaId: string;
  profesionalId: number;
  serviceKey: string;
  estado: string;
  inicioAt: string;
  finAt: string;
  duracionMinutos: number;
  modalidad: string;
  cantidadPersonas: number | null;
  numeroSeguimiento: number | null;
  tamanoEmpresaBucket: string | null;
  notes: string | null;
  requiresInterpreter: boolean;
  interpreterCount: number | null;
  interpreterProjectedHours: number | null;
  interpreterExceptionReason: string | null;
  createdAt: string;
  updatedAt: string;
  empresa: {
    id: string;
    nombreEmpresa: string | null;
    nitEmpresa: string | null;
  } | null;
  profesional: {
    id: number;
    nombreProfesional: string | null;
  } | null;
  servicio: {
    serviceKey: string;
    nombre: string;
  } | null;
};

function createProyeccionesClient() {
  return createSupabaseAdminClient() as unknown as ProyeccionesAdminClient;
}

function readNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function statusForCode(code: ProyeccionServerCode) {
  if (
    code === "invalid_payload" ||
    code === "invalid_service" ||
    code === "invalid_modalidad" ||
    code === "interpreter_data_required" ||
    code === "interpreter_exception_required" ||
    code === "already_cancelled"
  ) {
    return 400;
  }

  if (code === "empresa_not_found" || code === "not_found") {
    return 404;
  }

  if (code === "forbidden") {
    return 403;
  }

  return 500;
}

function isProyeccionServerCode(value: unknown): value is ProyeccionServerCode {
  return (
    typeof value === "string" &&
    [
      "created",
      "updated",
      "cancelled",
      "not_found",
      "forbidden",
      "invalid_payload",
      "invalid_service",
      "invalid_modalidad",
      "empresa_not_found",
      "interpreter_data_required",
      "interpreter_exception_required",
      "already_cancelled",
      "rpc_error",
    ].includes(value)
  );
}

function normalizeRpcResponse(value: unknown): ProyeccionMutationResponse {
  const raw = value && typeof value === "object" ? (value as RawRpcResponse) : {};
  const code = isProyeccionServerCode(raw.code) ? raw.code : "rpc_error";
  const message =
    readNonEmptyString(raw.message) ??
    (code === "rpc_error" ? "No se pudo completar la proyeccion." : "Accion completada.");
  const data =
    raw.data && typeof raw.data === "object"
      ? (raw.data as ProyeccionMutationResponse["data"])
      : {};

  if (raw.ok !== true) {
    throw new ProyeccionServerError({
      status: statusForCode(code),
      code,
      message,
    });
  }

  return { ok: true, code, message, data };
}

async function callProjectionRpc(functionName: string, args: Record<string, unknown>) {
  const admin = createProyeccionesClient();
  const { data, error } = await admin.rpc(functionName, args);

  if (error) {
    throw new ProyeccionServerError({
      status: 500,
      code: "rpc_error",
      message: "No se pudo completar la proyeccion.",
    });
  }

  return normalizeRpcResponse(data);
}

function nullable<T extends Record<string, unknown>, K extends keyof T>(
  value: T,
  key: K
) {
  return Object.prototype.hasOwnProperty.call(value, key) ? value[key] : null;
}

export function createProyeccion(options: {
  actor: ProyeccionActor;
  payload: CreateProyeccionInput;
}) {
  const { actor, payload } = options;
  return callProjectionRpc("proyeccion_crear", {
    p_actor_user_id: actor.userId,
    p_actor_profesional_id: actor.profesionalId,
    p_empresa_id: payload.empresaId,
    p_service_key: payload.serviceKey,
    p_inicio_at: payload.inicioAt,
    p_duracion_minutos: payload.duracionMinutos,
    p_modalidad: payload.modalidad,
    p_cantidad_personas: payload.cantidadPersonas,
    p_numero_seguimiento: payload.numeroSeguimiento,
    p_tamano_empresa_bucket: payload.tamanoEmpresaBucket,
    p_notes: payload.notes,
    p_requires_interpreter: payload.requiresInterpreter,
    p_interpreter_count: payload.interpreterCount,
    p_interpreter_projected_hours: payload.interpreterProjectedHours,
    p_interpreter_exception_reason: payload.interpreterExceptionReason,
  });
}

export function updateProyeccion(options: {
  id: string;
  actor: ProyeccionActor;
  payload: UpdateProyeccionInput;
}) {
  const { actor, payload } = options;
  return callProjectionRpc("proyeccion_actualizar", {
    p_projection_id: options.id,
    p_actor_user_id: actor.userId,
    p_actor_profesional_id: actor.profesionalId,
    p_service_key: nullable(payload, "serviceKey"),
    p_inicio_at: nullable(payload, "inicioAt"),
    p_duracion_minutos: nullable(payload, "duracionMinutos"),
    p_modalidad: nullable(payload, "modalidad"),
    p_cantidad_personas: nullable(payload, "cantidadPersonas"),
    p_numero_seguimiento: nullable(payload, "numeroSeguimiento"),
    p_tamano_empresa_bucket: nullable(payload, "tamanoEmpresaBucket"),
    p_notes: nullable(payload, "notes"),
    p_requires_interpreter: nullable(payload, "requiresInterpreter"),
    p_interpreter_count: nullable(payload, "interpreterCount"),
    p_interpreter_projected_hours: nullable(payload, "interpreterProjectedHours"),
    p_interpreter_exception_reason: nullable(payload, "interpreterExceptionReason"),
  });
}

export function cancelProyeccion(options: {
  id: string;
  actor: ProyeccionActor;
  comentario?: string | null;
}) {
  return callProjectionRpc("proyeccion_cancelar", {
    p_projection_id: options.id,
    p_actor_user_id: options.actor.userId,
    p_actor_profesional_id: options.actor.profesionalId,
    p_cancel_reason: readNonEmptyString(options.comentario),
  });
}

function firstRelation<T>(value: RelationValue<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function mapServicioRow(row: ProyeccionServicioRow): ProyeccionServicioItem {
  return {
    serviceKey: row.service_key,
    nombre: row.nombre,
    proyectable: row.proyectable === true,
    sugerirInterprete: row.sugerir_interprete === true,
    modalidadPermitidas: row.modalidad_permitidas ?? [],
    requiereCantidadPersonas: row.requiere_cantidad_personas === true,
    requiereNumeroSeguimiento: row.requiere_numero_seguimiento === true,
    requiereTamanoEmpresa: row.requiere_tamano_empresa === true,
  };
}

function mapProyeccionRow(row: ProyeccionRow): ProyeccionItem {
  const empresa = firstRelation(row.empresas);
  const profesional = firstRelation(row.profesionales);
  const servicio = firstRelation(row.proyeccion_servicios);

  return {
    id: row.id,
    parentProjectionId: row.parent_projection_id,
    empresaId: row.empresa_id,
    profesionalId: row.profesional_id,
    serviceKey: row.service_key,
    estado: row.estado,
    inicioAt: row.inicio_at,
    finAt: row.fin_at,
    duracionMinutos: row.duracion_minutos,
    modalidad: row.modalidad,
    cantidadPersonas: row.cantidad_personas,
    numeroSeguimiento: row.numero_seguimiento,
    tamanoEmpresaBucket: row.tamano_empresa_bucket,
    notes: row.notes,
    requiresInterpreter: row.requires_interpreter === true,
    interpreterCount: row.interpreter_count,
    interpreterProjectedHours: row.interpreter_projected_hours,
    interpreterExceptionReason: row.interpreter_exception_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    empresa: empresa
      ? {
          id: empresa.id,
          nombreEmpresa: empresa.nombre_empresa,
          nitEmpresa: empresa.nit_empresa,
        }
      : null,
    profesional: profesional
      ? {
          id: profesional.id,
          nombreProfesional: profesional.nombre_profesional,
        }
      : null,
    servicio: servicio
      ? {
          serviceKey: servicio.service_key,
          nombre: servicio.nombre,
        }
      : null,
  };
}

export async function listProyeccionServicios() {
  const admin = createProyeccionesClient();
  const { data, error } = await admin
    .from("proyeccion_servicios")
    .select(
      [
        "service_key",
        "nombre",
        "proyectable",
        "sugerir_interprete",
        "modalidad_permitidas",
        "requiere_cantidad_personas",
        "requiere_numero_seguimiento",
        "requiere_tamano_empresa",
      ].join(", ")
    )
    .eq("proyectable", true)
    .order("orden", { ascending: true });

  if (error) {
    throw new ProyeccionServerError({
      status: 500,
      code: "rpc_error",
      message: "No se pudo consultar el catalogo de servicios.",
    });
  }

  return { items: (data ?? []).map(mapServicioRow) };
}

export const listCachedProyeccionServicios = unstable_cache(
  () => listProyeccionServicios(),
  ["proyeccion-servicios-v1"],
  { revalidate: 3600 }
);

const PROYECCION_SELECT_FIELDS = [
  "id",
  "parent_projection_id",
  "empresa_id",
  "profesional_id",
  "service_key",
  "estado",
  "inicio_at",
  "fin_at",
  "duracion_minutos",
  "modalidad",
  "cantidad_personas",
  "numero_seguimiento",
  "tamano_empresa_bucket",
  "notes",
  "requires_interpreter",
  "interpreter_count",
  "interpreter_projected_hours",
  "interpreter_exception_reason",
  "created_at",
  "updated_at",
  "empresas(id,nombre_empresa,nit_empresa)",
  "profesionales(id,nombre_profesional)",
  "proyeccion_servicios(service_key,nombre)",
].join(", ");

function applyProjectionFilters(query: ProyeccionesQuery, params: ProyeccionesListParams) {
  let next = query.gte("inicio_at", params.from).lt("inicio_at", params.to);

  if (params.estado) {
    next = next.eq("estado", params.estado);
  }

  if (params.profesionalId) {
    next = next.eq("profesional_id", params.profesionalId);
  }

  if (params.empresaId) {
    next = next.eq("empresa_id", params.empresaId);
  }

  if (params.serviceKey) {
    next = next.eq("service_key", params.serviceKey);
  }

  if (!params.includeInterpreter) {
    next = next.neq("service_key", "interpreter_service");
  }

  return next;
}

export async function listProyecciones(params: ProyeccionesListParams) {
  const admin = createProyeccionesClient();
  const query = applyProjectionFilters(
    admin.from("proyecciones").select(PROYECCION_SELECT_FIELDS),
    params
  );
  const { data, error } = await query.order("inicio_at", { ascending: true });

  if (error) {
    throw new ProyeccionServerError({
      status: 500,
      code: "rpc_error",
      message: "No se pudo consultar las proyecciones.",
    });
  }

  return { items: (data ?? []).map(mapProyeccionRow) };
}

export async function getProyeccion(id: string) {
  const admin = createProyeccionesClient();
  const { data, error } = await admin
    .from("proyecciones")
    .select(PROYECCION_SELECT_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new ProyeccionServerError({
      status: 500,
      code: "rpc_error",
      message: "No se pudo consultar la proyeccion.",
    });
  }

  if (!data) {
    throw new ProyeccionServerError({
      status: 404,
      code: "not_found",
      message: "Proyeccion no encontrada.",
    });
  }

  return mapProyeccionRow(data);
}
