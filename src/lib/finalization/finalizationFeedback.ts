import type { FinalizationSuccessResponse } from "@/lib/finalization/idempotency";
import type { DraftGooglePrewarmTimingStep } from "@/lib/finalization/prewarmTypes";
import type { LongFormFinalizationRetryAction } from "@/lib/longFormFinalization";
import {
  FINALIZATION_CLAIM_EXHAUSTED_CODE,
  FINALIZATION_CLAIM_EXHAUSTED_RETRY_AFTER_SECONDS,
  markFinalizationRequestFailed,
  markFinalizationRequestSucceeded,
  type FinalizationRequestsSupabaseClient,
} from "@/lib/finalization/requests";

type FinalizationDisplayStageKey =
  | "preparing"
  | "google_sheets"
  | "pdf"
  | "registering"
  | "confirming";

export type FinalizationDisplayPayload = {
  stage: string;
  displayStage: string;
  displayMessage: string;
  retryAction: LongFormFinalizationRetryAction;
};

const DISPLAY_STAGE_LABELS: Record<FinalizationDisplayStageKey, string> = {
  preparing: "Preparando publicación",
  google_sheets: "Creando acta en Google Sheets",
  pdf: "Generando PDF",
  registering: "Guardando registro final",
  confirming: "Confirmando publicación",
};

function getDisplayStageKey(stage: string | null | undefined): FinalizationDisplayStageKey {
  const normalizedStage = typeof stage === "string" ? stage : "";

  if (
    normalizedStage === "request.validated" ||
    normalizedStage.startsWith("text_review.") ||
    normalizedStage === "request.received"
  ) {
    return "preparing";
  }

  if (
    normalizedStage === "drive.resolve_sheet_folder" ||
    normalizedStage === "prewarm.reuse_or_inline_prepare" ||
    normalizedStage.startsWith("prewarm.") ||
    normalizedStage.startsWith("spreadsheet.")
  ) {
    return "google_sheets";
  }

  if (
    normalizedStage === "drive.rename_final_file" ||
    normalizedStage === "drive.resolve_pdf_folder" ||
    normalizedStage === "drive.export_pdf" ||
    normalizedStage === "drive.upload_pdf"
  ) {
    return "pdf";
  }

  if (
    normalizedStage === "drive.resolve_raw_payload_folder" ||
    normalizedStage === "drive.upload_raw_payload" ||
    normalizedStage === "supabase.insert_finalized"
  ) {
    return "registering";
  }

  return "confirming";
}

export function getFinalizationDisplayStage(stage: string) {
  return DISPLAY_STAGE_LABELS[getDisplayStageKey(stage)];
}

export function buildFinalizationProcessingPayload(
  stage: string
): FinalizationDisplayPayload {
  const displayStage = getFinalizationDisplayStage(stage);

  return {
    stage,
    displayStage,
    displayMessage: `Estamos trabajando en: ${displayStage}.`,
    retryAction: "check_status",
  };
}

export function buildFinalizationFailurePayload(
  stage: string
): FinalizationDisplayPayload {
  const displayStage = getFinalizationDisplayStage(stage);

  return {
    stage,
    displayStage,
    displayMessage: `La publicación falló mientras ${displayStage.toLowerCase()}.`,
    retryAction: "submit",
  };
}

export function buildFinalizationUncertainPayload(
  stage = "confirming.unknown"
): FinalizationDisplayPayload {
  return {
    stage,
    displayStage: DISPLAY_STAGE_LABELS.confirming,
    displayMessage:
      "No pudimos confirmar la publicación. Puede que el acta ya esté guardada.",
    retryAction: "check_status",
  };
}

export function buildFinalizationInProgressBody(options: {
  stage: string;
  error: string;
}) {
  return {
    error: options.error,
    ...buildFinalizationProcessingPayload(options.stage),
  };
}

export function buildFinalizationRouteErrorBody(options: {
  stage: string;
  error: string;
}) {
  return {
    error: options.error,
    ...buildFinalizationFailurePayload(options.stage),
  };
}

export function isFinalizationClaimExhaustedError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === FINALIZATION_CLAIM_EXHAUSTED_CODE
  );
}

export function buildFinalizationClaimExhaustedBody(options?: {
  error?: string;
  stage?: string;
}) {
  const stage = options?.stage ?? "request.validated";

  return {
    error:
      options?.error ??
      "Conflicto temporal de coordinacion. Verifica el estado antes de reenviarla.",
    ...buildFinalizationProcessingPayload(stage),
    code: FINALIZATION_CLAIM_EXHAUSTED_CODE,
  };
}

export function getFinalizationClaimExhaustedRetryAfterSeconds() {
  return FINALIZATION_CLAIM_EXHAUSTED_RETRY_AFTER_SECONDS;
}

export async function markFinalizationRequestFailedSafely(options: {
  supabase: FinalizationRequestsSupabaseClient;
  idempotencyKey: string;
  userId: string;
  stage: string;
  errorMessage: string;
  source: string;
  totalDurationMs?: number | null;
  profilingSteps?: DraftGooglePrewarmTimingStep[] | null;
  prewarmStatus?: string | null;
  prewarmReused?: boolean | null;
  prewarmStructureSignature?: string | null;
}) {
  try {
    await markFinalizationRequestFailed({
      supabase: options.supabase,
      idempotencyKey: options.idempotencyKey,
      userId: options.userId,
      stage: options.stage,
      errorMessage: options.errorMessage,
      totalDurationMs: options.totalDurationMs,
      profilingSteps: options.profilingSteps,
      prewarmStatus: options.prewarmStatus,
      prewarmReused: options.prewarmReused,
      prewarmStructureSignature: options.prewarmStructureSignature,
    });
  } catch (error) {
    console.error(`[${options.source}] failed_to_mark_failed`, error);
  }
}

export async function markFinalizationRequestSucceededSafely(options: {
  supabase: FinalizationRequestsSupabaseClient;
  idempotencyKey: string;
  userId: string;
  stage: string;
  responsePayload: FinalizationSuccessResponse;
  source: string;
  totalDurationMs?: number | null;
  profilingSteps?: DraftGooglePrewarmTimingStep[] | null;
  prewarmStatus?: string | null;
  prewarmReused?: boolean | null;
  prewarmStructureSignature?: string | null;
}) {
  try {
    await markFinalizationRequestSucceeded({
      supabase: options.supabase,
      idempotencyKey: options.idempotencyKey,
      userId: options.userId,
      stage: options.stage,
      responsePayload: options.responsePayload,
      totalDurationMs: options.totalDurationMs,
      profilingSteps: options.profilingSteps,
      prewarmStatus: options.prewarmStatus,
      prewarmReused: options.prewarmReused,
      prewarmStructureSignature: options.prewarmStructureSignature,
    });
  } catch (error) {
    console.error(`[${options.source}] failed_to_mark_succeeded`, {
      error,
      stage: options.stage,
      idempotencyKey: options.idempotencyKey,
      userId: options.userId,
    });
  }
}
