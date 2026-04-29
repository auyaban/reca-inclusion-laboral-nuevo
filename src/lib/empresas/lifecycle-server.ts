import type { EmpresaMutationActor } from "@/lib/empresas/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EmpresaLifecycleCode =
  | "ok"
  | "claimed"
  | "released"
  | "state_changed"
  | "note_added"
  | "unchanged"
  | "comment_required"
  | "not_found"
  | "forbidden"
  | "invalid_state"
  | "empty_note"
  | "conflict"
  | "rpc_error";

export type EmpresaLifecycleEventSummary = {
  tipo: string;
};

export type EmpresaLifecycleData = {
  empresaId?: string;
  estado?: string | null;
  profesionalAsignadoId?: number | null;
  profesionalAsignado?: string | null;
  updatedAt?: string | null;
  events?: EmpresaLifecycleEventSummary[];
  unchanged?: boolean;
};

export type EmpresaLifecycleResponse = {
  ok: true;
  code: EmpresaLifecycleCode;
  message: string;
  data: EmpresaLifecycleData;
};

type RawLifecycleResponse = {
  ok?: unknown;
  code?: unknown;
  message?: unknown;
  data?: unknown;
};

type RpcError = {
  message?: string;
};

type RpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

export class EmpresaLifecycleError extends Error {
  status: number;
  code: EmpresaLifecycleCode;

  constructor(options: { status: number; code: EmpresaLifecycleCode; message: string }) {
    super(options.message);
    this.name = "EmpresaLifecycleError";
    this.status = options.status;
    this.code = options.code;
  }
}

function readNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeComment(value: string | null | undefined) {
  return readNonEmptyString(value);
}

function statusForLifecycleCode(code: EmpresaLifecycleCode) {
  if (code === "comment_required" || code === "invalid_state" || code === "empty_note") {
    return 400;
  }

  if (code === "not_found") {
    return 404;
  }

  if (code === "forbidden") {
    return 403;
  }

  if (code === "conflict") {
    return 409;
  }

  return 500;
}

function isLifecycleCode(value: unknown): value is EmpresaLifecycleCode {
  return (
    typeof value === "string" &&
    [
      "ok",
      "claimed",
      "released",
      "state_changed",
      "note_added",
      "unchanged",
      "comment_required",
      "not_found",
      "forbidden",
      "invalid_state",
      "empty_note",
      "conflict",
      "rpc_error",
    ].includes(value)
  );
}

function normalizeLifecycleResponse(value: unknown): EmpresaLifecycleResponse {
  const raw =
    value && typeof value === "object" ? (value as RawLifecycleResponse) : {};
  const code = isLifecycleCode(raw.code) ? raw.code : "rpc_error";
  const message =
    readNonEmptyString(raw.message) ??
    (code === "rpc_error" ? "No se pudo completar la acción." : "Acción completada.");
  const data =
    raw.data && typeof raw.data === "object"
      ? (raw.data as EmpresaLifecycleData)
      : {};

  if (raw.ok !== true) {
    throw new EmpresaLifecycleError({
      status: statusForLifecycleCode(code),
      code,
      message,
    });
  }

  return {
    ok: true,
    code,
    message,
    data,
  };
}

async function callEmpresaLifecycleRpc(
  functionName: string,
  args: Record<string, unknown>
) {
  const admin = createSupabaseAdminClient() as unknown as RpcClient;
  const { data, error } = await admin.rpc(functionName, args);

  if (error) {
    throw new EmpresaLifecycleError({
      status: 500,
      code: "rpc_error",
      message: "No se pudo completar la acción.",
    });
  }

  return normalizeLifecycleResponse(data);
}

export function reclamarEmpresa(options: {
  empresaId: string;
  actor: EmpresaMutationActor;
  comentario?: string | null;
}) {
  return callEmpresaLifecycleRpc("empresa_reclamar", {
    p_empresa_id: options.empresaId,
    p_actor_user_id: options.actor.userId,
    p_actor_profesional_id: options.actor.profesionalId,
    p_comentario: normalizeComment(options.comentario),
  });
}

export function soltarEmpresa(options: {
  empresaId: string;
  actor: EmpresaMutationActor;
  comentario: string;
}) {
  return callEmpresaLifecycleRpc("empresa_soltar", {
    p_empresa_id: options.empresaId,
    p_actor_user_id: options.actor.userId,
    p_actor_profesional_id: options.actor.profesionalId,
    p_comentario: normalizeComment(options.comentario),
  });
}

export function cambiarEstadoEmpresaOperativo(options: {
  empresaId: string;
  actor: EmpresaMutationActor;
  estado: string;
  comentario: string;
}) {
  return callEmpresaLifecycleRpc("empresa_cambiar_estado_operativo", {
    p_empresa_id: options.empresaId,
    p_actor_user_id: options.actor.userId,
    p_actor_profesional_id: options.actor.profesionalId,
    p_estado: options.estado,
    p_comentario: normalizeComment(options.comentario),
  });
}

export function agregarEmpresaNota(options: {
  empresaId: string;
  actor: EmpresaMutationActor;
  contenido: string;
}) {
  return callEmpresaLifecycleRpc("empresa_agregar_nota", {
    p_empresa_id: options.empresaId,
    p_actor_user_id: options.actor.userId,
    p_actor_profesional_id: options.actor.profesionalId,
    p_contenido: normalizeComment(options.contenido),
  });
}
