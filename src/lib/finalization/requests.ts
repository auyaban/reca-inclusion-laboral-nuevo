import type { FinalizationSuccessResponse } from "@/lib/finalization/idempotency";
import type {
  DraftGooglePrewarmState,
  DraftGooglePrewarmTimingStep,
  FinalizationPrewarmOutcome,
  PreparedFinalizationSpreadsheet,
} from "@/lib/finalization/prewarmTypes";
import { reportFinalizationStaleProcessingReclaimed } from "@/lib/observability/finalization";
import {
  FINALIZATION_PROCESSING_TTL_MS as SHARED_FINALIZATION_PROCESSING_TTL_MS,
  buildStaleThresholdIso,
  classifyStaleArtifactStateFromRawExternalArtifacts,
  type FinalizationArtifactState,
} from "@/lib/finalization/staleProcessing";
import type { FooterActaRef } from "@/lib/google/sheets";
import { isRecord } from "@/lib/finalization/valueUtils";

export const FINALIZATION_IN_PROGRESS_CODE = "finalization_in_progress";
export const FINALIZATION_CLAIM_EXHAUSTED_CODE =
  "finalization_claim_exhausted";
export const FINALIZATION_CLAIM_EXHAUSTED_RETRY_AFTER_SECONDS = 5;
export const FINALIZATION_PROCESSING_TTL_MS =
  SHARED_FINALIZATION_PROCESSING_TTL_MS;
const FINALIZATION_REQUESTS_TABLE = "form_finalization_requests";
const MAX_CLAIM_ATTEMPTS = 3;
export const FINALIZATION_EXTERNAL_STAGES = [
  "spreadsheet.prepared",
  "spreadsheet.footer_marker_written",
  "spreadsheet.structure_insertions_done",
  "spreadsheet.apply_mutation_done",
  "spreadsheet.hide_unused_sheets_done",
  "drive.upload_pdf",
] as const;

export type FinalizationExternalStage =
  (typeof FINALIZATION_EXTERNAL_STAGES)[number];

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
  external_artifacts: Record<string, unknown> | null;
  external_stage: string | null;
  externalized_at: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

export type FooterMutationMarker = {
  sheetName: string;
  actaRef: string;
  initialRowIndex: number;
  expectedFinalRowIndex: number;
};

export type FinalizationExternalArtifacts = {
  sheetLink: string;
  spreadsheetId: string;
  companyFolderId: string;
  activeSheetName: string;
  actaRef?: string | null;
  footerActaRefs: FooterActaRef[];
  footerMutationMarkers: FooterMutationMarker[];
  effectiveSheetReplacements: Record<string, string> | null;
  footerMarkerWrittenAt?: string | null;
  structureInsertionsAppliedAt?: string | null;
  mutationAppliedAt?: string | null;
  hiddenSheetsAppliedAt?: string | null;
  pdfLink?: string | null;
  spreadsheetResourceMode: PreparedFinalizationSpreadsheet["spreadsheetResourceMode"];
  prewarmStateSnapshot: DraftGooglePrewarmState | null;
  prewarmStatus: FinalizationPrewarmOutcome;
  prewarmReused: boolean;
  prewarmStructureSignature: string | null;
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
  lt: (field: string, value: unknown) => SelectQuery<TData>;
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

function isFinalizationExternalStage(value: unknown): value is FinalizationExternalStage {
  return (
    typeof value === "string" &&
    (FINALIZATION_EXTERNAL_STAGES as readonly string[]).includes(value)
  );
}

function isValidFooterActaRef(value: unknown): value is FooterActaRef {
  return (
    isRecord(value) &&
    typeof value.sheetName === "string" &&
    value.sheetName.trim().length > 0 &&
    typeof value.actaRef === "string" &&
    value.actaRef.trim().length > 0
  );
}

function isValidFooterMutationMarker(
  value: unknown
): value is FooterMutationMarker {
  if (!isRecord(value)) {
    return false;
  }

  const initialRowIndex =
    typeof value.initialRowIndex === "number" ? value.initialRowIndex : null;
  const expectedFinalRowIndex =
    typeof value.expectedFinalRowIndex === "number"
      ? value.expectedFinalRowIndex
      : null;

  return (
    typeof value.sheetName === "string" &&
    value.sheetName.trim().length > 0 &&
    typeof value.actaRef === "string" &&
    value.actaRef.trim().length > 0 &&
    initialRowIndex !== null &&
    Number.isInteger(initialRowIndex) &&
    initialRowIndex >= 0 &&
    expectedFinalRowIndex !== null &&
    Number.isInteger(expectedFinalRowIndex) &&
    expectedFinalRowIndex >= initialRowIndex
  );
}

function extractSheetReplacements(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const entries = Object.entries(value).filter((entry): entry is [string, string] => {
    return (
      typeof entry[0] === "string" &&
      entry[0].trim().length > 0 &&
      typeof entry[1] === "string" &&
      entry[1].trim().length > 0
    );
  });

  if (entries.length === 0) {
    return null;
  }

  return Object.fromEntries(entries);
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

function isDraftPrewarmState(value: unknown): value is DraftGooglePrewarmState {
  return (
    isRecord(value) &&
    typeof value.version === "number" &&
    Array.isArray(value.bundleSheetNames) &&
    typeof value.status === "string"
  );
}

export function extractFinalizationExternalArtifacts(
  row:
    | Pick<FinalizationRequestRow, "external_artifacts">
    | { external_artifacts?: Record<string, unknown> | null }
    | null
) {
  const candidate = isRecord(row?.external_artifacts)
    ? row.external_artifacts
    : null;

  if (
    !candidate ||
    typeof candidate.sheetLink !== "string" ||
    candidate.sheetLink.trim().length === 0 ||
    typeof candidate.spreadsheetId !== "string" ||
    candidate.spreadsheetId.trim().length === 0 ||
    typeof candidate.companyFolderId !== "string" ||
    candidate.companyFolderId.trim().length === 0 ||
    typeof candidate.activeSheetName !== "string" ||
    candidate.activeSheetName.trim().length === 0 ||
    (candidate.spreadsheetResourceMode !== "draft_prewarm" &&
      candidate.spreadsheetResourceMode !== "legacy_company")
  ) {
    return null;
  }

  const prewarmStateSnapshot = isDraftPrewarmState(candidate.prewarmStateSnapshot)
    ? candidate.prewarmStateSnapshot
    : null;

  return {
    sheetLink: candidate.sheetLink,
    spreadsheetId: candidate.spreadsheetId,
    companyFolderId: candidate.companyFolderId,
    activeSheetName: candidate.activeSheetName,
    actaRef:
      typeof candidate.actaRef === "string" && candidate.actaRef.trim().length > 0
        ? candidate.actaRef
        : null,
    footerActaRefs: Array.isArray(candidate.footerActaRefs)
      ? candidate.footerActaRefs.filter(isValidFooterActaRef)
      : [],
    footerMutationMarkers: Array.isArray(candidate.footerMutationMarkers)
      ? candidate.footerMutationMarkers.filter(isValidFooterMutationMarker)
      : [],
    effectiveSheetReplacements: extractSheetReplacements(
      candidate.effectiveSheetReplacements
    ),
    footerMarkerWrittenAt:
      typeof candidate.footerMarkerWrittenAt === "string" &&
      candidate.footerMarkerWrittenAt.trim().length > 0
        ? candidate.footerMarkerWrittenAt
        : null,
    structureInsertionsAppliedAt:
      typeof candidate.structureInsertionsAppliedAt === "string" &&
      candidate.structureInsertionsAppliedAt.trim().length > 0
        ? candidate.structureInsertionsAppliedAt
        : null,
    mutationAppliedAt:
      typeof candidate.mutationAppliedAt === "string" &&
      candidate.mutationAppliedAt.trim().length > 0
        ? candidate.mutationAppliedAt
        : null,
    hiddenSheetsAppliedAt:
      typeof candidate.hiddenSheetsAppliedAt === "string" &&
      candidate.hiddenSheetsAppliedAt.trim().length > 0
        ? candidate.hiddenSheetsAppliedAt
        : null,
    pdfLink:
      typeof candidate.pdfLink === "string" && candidate.pdfLink.trim().length > 0
        ? candidate.pdfLink
        : null,
    spreadsheetResourceMode: candidate.spreadsheetResourceMode,
    prewarmStateSnapshot,
    prewarmStatus:
      typeof candidate.prewarmStatus === "string"
        ? (candidate.prewarmStatus as FinalizationPrewarmOutcome)
        : "disabled",
    prewarmReused: candidate.prewarmReused === true,
    prewarmStructureSignature:
      typeof candidate.prewarmStructureSignature === "string"
        ? candidate.prewarmStructureSignature
        : null,
  } satisfies FinalizationExternalArtifacts;
}

export function buildFinalizationExternalArtifacts(options: {
  preparedSpreadsheet: Pick<
    PreparedFinalizationSpreadsheet,
    | "sheetLink"
    | "spreadsheetId"
      | "companyFolderId"
      | "activeSheetName"
      | "spreadsheetResourceMode"
      | "prewarmStateSnapshot"
      | "effectiveSheetReplacements"
      | "prewarmStatus"
      | "prewarmReused"
      | "prewarmStructureSignature"
  >;
  actaRef: string;
  footerActaRefs: FooterActaRef[];
  footerMutationMarkers?: FooterMutationMarker[];
  pdfLink?: string | null;
  footerMarkerWrittenAt?: string | Date | null;
  structureInsertionsAppliedAt?: string | Date | null;
  mutationAppliedAt?: string | Date | null;
  hiddenSheetsAppliedAt?: string | Date | null;
}): FinalizationExternalArtifacts {
  return {
    sheetLink: options.preparedSpreadsheet.sheetLink,
    spreadsheetId: options.preparedSpreadsheet.spreadsheetId,
    companyFolderId: options.preparedSpreadsheet.companyFolderId,
    activeSheetName: options.preparedSpreadsheet.activeSheetName,
    actaRef: options.actaRef,
    footerActaRefs: options.footerActaRefs,
    footerMutationMarkers: options.footerMutationMarkers ?? [],
    effectiveSheetReplacements:
      options.preparedSpreadsheet.effectiveSheetReplacements,
    ...(options.footerMarkerWrittenAt
      ? { footerMarkerWrittenAt: asIsoDate(options.footerMarkerWrittenAt) }
      : {}),
    ...(options.structureInsertionsAppliedAt
      ? {
          structureInsertionsAppliedAt: asIsoDate(
            options.structureInsertionsAppliedAt
          ),
        }
      : {}),
    ...(options.mutationAppliedAt
      ? { mutationAppliedAt: asIsoDate(options.mutationAppliedAt) }
      : {}),
    ...(options.hiddenSheetsAppliedAt
      ? { hiddenSheetsAppliedAt: asIsoDate(options.hiddenSheetsAppliedAt) }
      : {}),
    ...(options.pdfLink ? { pdfLink: options.pdfLink } : {}),
    spreadsheetResourceMode: options.preparedSpreadsheet.spreadsheetResourceMode,
    prewarmStateSnapshot: options.preparedSpreadsheet.prewarmStateSnapshot,
    prewarmStatus: options.preparedSpreadsheet.prewarmStatus,
    prewarmReused: options.preparedSpreadsheet.prewarmReused,
    prewarmStructureSignature:
      options.preparedSpreadsheet.prewarmStructureSignature,
  };
}

export function classifyFinalizationArtifactStateFromArtifacts(
  artifacts: FinalizationExternalArtifacts | null | undefined
): FinalizationArtifactState {
  return classifyStaleArtifactStateFromRawExternalArtifacts(
    (artifacts ?? null) as Record<string, unknown> | null
  );
}

export function classifyFinalizationArtifactState(
  row:
    | Pick<FinalizationRequestRow, "external_artifacts">
    | { external_artifacts?: Record<string, unknown> | null }
    | null
) {
  return classifyFinalizationArtifactStateFromArtifacts(
    extractFinalizationExternalArtifacts(row)
  );
}

export function normalizeFinalizationExternalStage(
  value: unknown,
  artifacts: Partial<
    Pick<
      FinalizationExternalArtifacts,
      | "spreadsheetId"
      | "sheetLink"
      | "companyFolderId"
      | "activeSheetName"
      | "pdfLink"
      | "hiddenSheetsAppliedAt"
      | "mutationAppliedAt"
      | "structureInsertionsAppliedAt"
      | "footerMarkerWrittenAt"
    >
  > | null
): FinalizationExternalStage | null {
  if (isFinalizationExternalStage(value)) {
    return value;
  }

  if (typeof artifacts?.pdfLink === "string" && artifacts.pdfLink.trim().length > 0) {
    return "drive.upload_pdf";
  }

  if (
    typeof artifacts?.hiddenSheetsAppliedAt === "string" &&
    artifacts.hiddenSheetsAppliedAt.trim().length > 0
  ) {
    return "spreadsheet.hide_unused_sheets_done";
  }

  if (
    typeof artifacts?.mutationAppliedAt === "string" &&
    artifacts.mutationAppliedAt.trim().length > 0
  ) {
    return "spreadsheet.apply_mutation_done";
  }

  if (
    typeof artifacts?.structureInsertionsAppliedAt === "string" &&
    artifacts.structureInsertionsAppliedAt.trim().length > 0
  ) {
    return "spreadsheet.structure_insertions_done";
  }

  if (
    typeof artifacts?.footerMarkerWrittenAt === "string" &&
    artifacts.footerMarkerWrittenAt.trim().length > 0
  ) {
    return "spreadsheet.footer_marker_written";
  }

  if (
    typeof artifacts?.spreadsheetId === "string" &&
    artifacts.spreadsheetId.trim().length > 0 &&
    typeof artifacts?.sheetLink === "string" &&
    artifacts.sheetLink.trim().length > 0 &&
    typeof artifacts?.companyFolderId === "string" &&
    artifacts.companyFolderId.trim().length > 0 &&
    typeof artifacts?.activeSheetName === "string" &&
    artifacts.activeSheetName.trim().length > 0
  ) {
    return "spreadsheet.prepared";
  }

  return null;
}

export function hasReachedFinalizationExternalStage(
  currentStage: FinalizationExternalStage | null | undefined,
  targetStage: FinalizationExternalStage
) {
  const currentIndex = currentStage
    ? FINALIZATION_EXTERNAL_STAGES.indexOf(currentStage)
    : -1;
  const targetIndex = FINALIZATION_EXTERNAL_STAGES.indexOf(targetStage);
  return currentIndex >= targetIndex;
}

export function markFinalizationExternalArtifactsMutationApplied(
  artifacts: FinalizationExternalArtifacts,
  at: string | Date = new Date()
): FinalizationExternalArtifacts {
  return {
    ...artifacts,
    mutationAppliedAt: asIsoDate(at),
  };
}

export function markFinalizationExternalArtifactsFooterMarkerWritten(
  artifacts: FinalizationExternalArtifacts,
  at: string | Date = new Date()
): FinalizationExternalArtifacts {
  return {
    ...artifacts,
    footerMarkerWrittenAt: asIsoDate(at),
  };
}

export function markFinalizationExternalArtifactsStructureInsertionsApplied(
  artifacts: FinalizationExternalArtifacts,
  at: string | Date = new Date()
): FinalizationExternalArtifacts {
  return {
    ...artifacts,
    structureInsertionsAppliedAt: asIsoDate(at),
  };
}

export function markFinalizationExternalArtifactsHiddenSheetsApplied(
  artifacts: FinalizationExternalArtifacts,
  at: string | Date = new Date()
): FinalizationExternalArtifacts {
  return {
    ...artifacts,
    hiddenSheetsAppliedAt: asIsoDate(at),
  };
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

export async function listStaleFinalizationRequests(options: {
  supabase: FinalizationRequestsSupabaseClient;
  now?: number | Date;
  olderThanMs?: number;
  limit?: number;
  formSlug?: string | null;
  userId?: string | null;
  idempotencyKey?: string | null;
}) {
  const nowMs =
    options.now instanceof Date
      ? options.now.getTime()
      : typeof options.now === "number"
        ? options.now
        : Date.now();
  const olderThanMs = options.olderThanMs ?? FINALIZATION_PROCESSING_TTL_MS;
  const thresholdIso = buildStaleThresholdIso(nowMs, olderThanMs);

  let query = options.supabase
    .from(FINALIZATION_REQUESTS_TABLE)
    .select("*")
    .eq("status", "processing")
    .lt("updated_at", thresholdIso);

  if (options.formSlug) {
    query = query.eq("form_slug", options.formSlug);
  }

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  if (options.idempotencyKey) {
    query = query.eq("idempotency_key", options.idempotencyKey);
  }

  query = query.order("updated_at", { ascending: true }).limit(options.limit ?? 100);

  const { data, error } = await (query as unknown as Promise<{
    data: FinalizationRequestRow[] | null;
    error: unknown;
  }>);

  if (error) {
    throw error;
  }

  return (data ?? []) as FinalizationRequestRow[];
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
    const staleClaimSourceRow =
      decision.kind === "claim" && decision.reason === "stale_processing"
        ? existing
        : null;

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
          external_artifacts: null,
          external_stage: null,
          externalized_at: null,
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
      if (staleClaimSourceRow) {
        reportFinalizationStaleProcessingReclaimed({
          formSlug,
          idempotencyKey,
          userId,
          previousStage: staleClaimSourceRow.stage,
          previousExternalStage: staleClaimSourceRow.external_stage,
          ageMs: now.getTime() - parseTimestamp(staleClaimSourceRow.updated_at),
          artifactState: classifyFinalizationArtifactState(staleClaimSourceRow),
        });
      }

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

export async function persistFinalizationExternalArtifacts(options: {
  supabase: FinalizationRequestsSupabaseClient;
  idempotencyKey: string;
  userId: string;
  stage: string;
  artifacts: FinalizationExternalArtifacts;
  externalizedAt?: Date;
}) {
  const { data, error } = await options.supabase
    .from(FINALIZATION_REQUESTS_TABLE)
    .update({
      stage: options.stage,
      stage_started_at: asIsoDate(new Date()),
      external_artifacts: options.artifacts,
      external_stage: options.stage,
      externalized_at: asIsoDate(options.externalizedAt ?? new Date()),
    })
    .eq("idempotency_key", options.idempotencyKey)
    .eq("user_id", options.userId)
    .select("idempotency_key")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No se pudo persistir el estado externo de finalizacion.");
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
