import type { FinalizationSuccessResponse } from "@/lib/finalization/idempotency";
import type { DraftGooglePrewarmTimingStep } from "@/lib/finalization/prewarmTypes";
import { isRecord } from "@/lib/finalization/valueUtils";

export const FINALIZATION_IN_PROGRESS_CODE = "finalization_in_progress";
export const FINALIZATION_CLAIM_EXHAUSTED_CODE =
  "finalization_claim_exhausted";
export const FINALIZATION_CLAIM_EXHAUSTED_RETRY_AFTER_SECONDS = 5;
export const FINALIZATION_PROCESSING_TTL_MS = 360_000;
const FINALIZATION_REQUESTS_TABLE = "form_finalization_requests";
const MAX_CLAIM_ATTEMPTS = 3;

export type FinalizationRequestStatus = "processing" | "succeeded" | "failed";

export type FinalizationRequestRow = {
  idempotency_key: string;
  form_slug: string;
  user_id: string;
  identity_key: string | null;
  status: FinalizationRequestStatus;
  stage: string;
  stage_started_at: string | null;
  request_hash: string;
  response_payload: FinalizationSuccessResponse | null;
  last_error: string | null;
  total_duration_ms: number | null;
  profiling_steps: DraftGooglePrewarmTimingStep[] | null;
  prewarm_status: string | null;
  prewarm_reused: boolean | null;
  prewarm_structure_signature: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

export type FinalizationRequestDecision =
  | { kind: "claimed"; row: FinalizationRequestRow }
  | { kind: "claim"; reason: "missing" | "failed" | "stale_processing" | "missing_response" }
  | { kind: "in_progress"; stage: string; retryAfterSeconds: number }
  | { kind: "replay"; responsePayload: FinalizationSuccessResponse };

type SingleResult<TData> = Promise<{ data: TData | null; error: unknown }>;
type SingleRequiredResult<TData> = Promise<{ data: TData; error: unknown }>;

type SelectQuery<TData> = {
  eq: (field: string, value: unknown) => SelectQuery<TData>;
  order: (
    field: string,
    options?: { ascending?: boolean }
  ) => SelectQuery<TData>;
  limit: (count: number) => SelectQuery<TData>;
  maybeSingle: () => SingleResult<TData>;
  single: () => SingleRequiredResult<TData>;
};

type MutationQuery<TData> = {
  eq: (field: string, value: unknown) => MutationQuery<TData>;
  select: (fields?: string) => SelectQuery<TData>;
};

type FinalizationRequestsTable = {
  select: (fields?: string) => SelectQuery<FinalizationRequestRow>;
  insert: (value: Record<string, unknown>) => {
    select: (fields?: string) => SelectQuery<FinalizationRequestRow>;
  };
  update: (value: Record<string, unknown>) => MutationQuery<FinalizationRequestRow>;
};

export type FinalizationRequestsSupabaseClient = {
  from: (table: typeof FINALIZATION_REQUESTS_TABLE) => FinalizationRequestsTable;
};

function isUniqueViolation(error: unknown) {
  return isRecord(error) && error.code === "23505";
}

export class FinalizationClaimExhaustedError extends Error {
  code: typeof FINALIZATION_CLAIM_EXHAUSTED_CODE =
    FINALIZATION_CLAIM_EXHAUSTED_CODE;

  constructor(
    message = "Conflicto temporal de coordinacion en la finalizacion."
  ) {
    super(message);
    this.name = "FinalizationClaimExhaustedError";
  }
}

function asIsoDate(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}

function parseTimestamp(value: string | null | undefined) {
  const timestamp = Date.parse(String(value ?? ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function hasReplayPayload(
  value: unknown
): value is FinalizationSuccessResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    typeof value.sheetLink === "string" &&
    value.sheetLink.trim().length > 0
  );
}

export function isProcessingRequestStale(
  row: Pick<FinalizationRequestRow, "status" | "updated_at">,
  now = Date.now()
) {
  return (
    row.status === "processing" &&
    parseTimestamp(row.updated_at) <= now - FINALIZATION_PROCESSING_TTL_MS
  );
}

export function getProcessingRetryAfterSeconds(
  row: Pick<FinalizationRequestRow, "updated_at">,
  now = Date.now()
) {
  const remainingMs =
    parseTimestamp(row.updated_at) + FINALIZATION_PROCESSING_TTL_MS - now;

  return Math.max(1, Math.ceil(Math.max(remainingMs, 0) / 1000));
}

export function resolveFinalizationRequestDecision(
  row: FinalizationRequestRow | null,
  now = Date.now()
): FinalizationRequestDecision {
  if (!row) {
    return { kind: "claim", reason: "missing" };
  }

  if (row.status === "succeeded") {
    if (hasReplayPayload(row.response_payload)) {
      return {
        kind: "replay",
        responsePayload: row.response_payload,
      };
    }

    return { kind: "claim", reason: "missing_response" };
  }

  if (row.status === "processing") {
    if (isProcessingRequestStale(row, now)) {
      return { kind: "claim", reason: "stale_processing" };
    }

    return {
      kind: "in_progress",
      stage: row.stage,
      retryAfterSeconds: getProcessingRetryAfterSeconds(row, now),
    };
  }

  return { kind: "claim", reason: "failed" };
}

export async function readFinalizationRequest(
  supabase: FinalizationRequestsSupabaseClient,
  idempotencyKey: string,
  userId: string
) {
  const { data, error } = await supabase
    .from(FINALIZATION_REQUESTS_TABLE)
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as FinalizationRequestRow | null) ?? null;
}

export async function readLatestFinalizationRequestByIdentity(options: {
  supabase: FinalizationRequestsSupabaseClient;
  formSlug: string;
  userId: string;
  identityKey: string;
}) {
  const { data, error } = await options.supabase
    .from(FINALIZATION_REQUESTS_TABLE)
    .select("*")
    .eq("form_slug", options.formSlug)
    .eq("user_id", options.userId)
    .eq("identity_key", options.identityKey)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as FinalizationRequestRow | null) ?? null;
}

export async function beginFinalizationRequest(options: {
  supabase: FinalizationRequestsSupabaseClient;
  idempotencyKey: string;
  formSlug: string;
  userId: string;
  identityKey?: string | null;
  requestHash: string;
  initialStage: string;
  now?: Date;
}) {
  const {
    supabase,
    idempotencyKey,
    formSlug,
    userId,
    requestHash,
    initialStage,
  } = options;
  const now = options.now ?? new Date();

  for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt += 1) {
    const existing = await readFinalizationRequest(supabase, idempotencyKey, userId);
    const decision = resolveFinalizationRequestDecision(existing, now.getTime());

    if (decision.kind === "replay" || decision.kind === "in_progress") {
      return decision;
    }

    if (!existing) {
      const { data, error } = await supabase
        .from(FINALIZATION_REQUESTS_TABLE)
        .insert({
          idempotency_key: idempotencyKey,
          form_slug: formSlug,
          user_id: userId,
          identity_key: options.identityKey ?? null,
          status: "processing",
          stage: initialStage,
          stage_started_at: asIsoDate(now),
          request_hash: requestHash,
          response_payload: null,
          last_error: null,
          total_duration_ms: null,
          profiling_steps: null,
          prewarm_status: null,
          prewarm_reused: null,
          prewarm_structure_signature: null,
          started_at: asIsoDate(now),
          completed_at: null,
        })
        .select()
        .single();

      if (!error) {
        return {
          kind: "claimed" as const,
          row: data as FinalizationRequestRow,
        };
      }

      if (isUniqueViolation(error)) {
        continue;
      }

      throw error;
    }

    const { data, error } = await supabase
      .from(FINALIZATION_REQUESTS_TABLE)
      .update({
        status: "processing",
        stage: initialStage,
        stage_started_at: asIsoDate(now),
        request_hash: requestHash,
        response_payload: null,
        last_error: null,
        identity_key: options.identityKey ?? existing.identity_key ?? null,
        total_duration_ms: null,
        profiling_steps: null,
        prewarm_status: null,
        prewarm_reused: null,
        prewarm_structure_signature: null,
        started_at: asIsoDate(now),
        completed_at: null,
      })
      .eq("idempotency_key", idempotencyKey)
      .eq("user_id", userId)
      .eq("updated_at", existing.updated_at)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return {
        kind: "claimed" as const,
        row: data as FinalizationRequestRow,
      };
    }
  }

  throw new FinalizationClaimExhaustedError();
}

export async function markFinalizationRequestStage(options: {
  supabase: FinalizationRequestsSupabaseClient;
  idempotencyKey: string;
  userId: string;
  stage: string;
  stageStartedAt?: Date;
}) {
  const { data, error } = await options.supabase
    .from(FINALIZATION_REQUESTS_TABLE)
    .update({
      stage: options.stage,
      stage_started_at: asIsoDate(options.stageStartedAt ?? new Date()),
    })
    .eq("idempotency_key", options.idempotencyKey)
    .eq("user_id", options.userId)
    .select("idempotency_key")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No se pudo actualizar la etapa de finalización.");
  }
}

export async function markFinalizationRequestSucceeded(options: {
  supabase: FinalizationRequestsSupabaseClient;
  idempotencyKey: string;
  userId: string;
  stage: string;
  responsePayload: FinalizationSuccessResponse;
  completedAt?: Date;
  totalDurationMs?: number | null;
  profilingSteps?: DraftGooglePrewarmTimingStep[] | null;
  prewarmStatus?: string | null;
  prewarmReused?: boolean | null;
  prewarmStructureSignature?: string | null;
}) {
  const { data, error } = await options.supabase
    .from(FINALIZATION_REQUESTS_TABLE)
    .update({
      status: "succeeded",
      stage: options.stage,
      stage_started_at: asIsoDate(options.completedAt ?? new Date()),
      response_payload: options.responsePayload,
      last_error: null,
      total_duration_ms: options.totalDurationMs ?? null,
      profiling_steps: options.profilingSteps ?? null,
      prewarm_status: options.prewarmStatus ?? null,
      prewarm_reused: options.prewarmReused ?? null,
      prewarm_structure_signature: options.prewarmStructureSignature ?? null,
      completed_at: asIsoDate(options.completedAt ?? new Date()),
    })
    .eq("idempotency_key", options.idempotencyKey)
    .eq("user_id", options.userId)
    .select("idempotency_key")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No se pudo marcar la finalización como exitosa.");
  }
}

export async function markFinalizationRequestFailed(options: {
  supabase: FinalizationRequestsSupabaseClient;
  idempotencyKey: string;
  userId: string;
  stage: string;
  errorMessage: string;
  totalDurationMs?: number | null;
  profilingSteps?: DraftGooglePrewarmTimingStep[] | null;
  prewarmStatus?: string | null;
  prewarmReused?: boolean | null;
  prewarmStructureSignature?: string | null;
}) {
  const { data, error } = await options.supabase
    .from(FINALIZATION_REQUESTS_TABLE)
    .update({
      status: "failed",
      stage: options.stage,
      stage_started_at: asIsoDate(new Date()),
      last_error: options.errorMessage,
      total_duration_ms: options.totalDurationMs ?? null,
      profiling_steps: options.profilingSteps ?? null,
      prewarm_status: options.prewarmStatus ?? null,
      prewarm_reused: options.prewarmReused ?? null,
      prewarm_structure_signature: options.prewarmStructureSignature ?? null,
      completed_at: null,
    })
    .eq("idempotency_key", options.idempotencyKey)
    .eq("user_id", options.userId)
    .select("idempotency_key")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No se pudo marcar la finalización como fallida.");
  }
}
