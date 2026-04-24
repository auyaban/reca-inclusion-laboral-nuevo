import type { FinalizationSuccessResponse } from "@/lib/finalization/idempotency";
import type { FinalizationStatusFormSlug } from "@/lib/finalization/formSlugs";
import {
  extractFinalizationExternalArtifacts,
  normalizeFinalizationExternalStage,
  markFinalizationRequestSucceeded,
  type FinalizationExternalStage,
  type FinalizationExternalArtifacts,
  type FinalizationRequestRow,
  type FinalizationRequestsSupabaseClient,
} from "@/lib/finalization/requests";
import type { DraftGooglePrewarmTimingStep } from "@/lib/finalization/prewarmTypes";
import { isRecord, stringTrimmedText } from "@/lib/finalization/valueUtils";

export const POST_PERSISTENCE_CONFIRMATION_STAGE =
  "confirming.persisted_record_written";

type FinalizedRecordRow = {
  path_formato: string | null;
  payload_normalized: Record<string, unknown> | null;
  payload_generated_at: string | null;
};

type FinalizedRecordSelectQuery<TData> = {
  contains: (
    column: string,
    value: Record<string, unknown>
  ) => FinalizedRecordSelectQuery<TData>;
  order: (
    column: string,
    options: { ascending: boolean }
  ) => FinalizedRecordSelectQuery<TData>;
  limit: (count: number) => FinalizedRecordSelectQuery<TData>;
  maybeSingle: () => Promise<{ data: TData | null; error: unknown }>;
};

export type FinalizedRecordsSupabaseClient = FinalizationRequestsSupabaseClient & {
  from: (
    table: "formatos_finalizados_il"
  ) => {
    select: (fields?: string) => FinalizedRecordSelectQuery<FinalizedRecordRow>;
  };
};

export function extractRecoveredFinalizationResponse(
  record: FinalizedRecordRow | null
): FinalizationSuccessResponse | null {
  if (!record) {
    return null;
  }

  const payloadNormalized = isRecord(record.payload_normalized)
    ? record.payload_normalized
    : null;
  const parsedRaw = payloadNormalized && isRecord(payloadNormalized.parsed_raw)
    ? payloadNormalized.parsed_raw
    : null;

  const sheetLink =
    stringTrimmedText(record.path_formato) ||
    stringTrimmedText(parsedRaw?.sheet_link);
  const pdfLink = stringTrimmedText(parsedRaw?.pdf_link);

  if (!sheetLink) {
    return null;
  }

  return {
    success: true,
    sheetLink,
    ...(pdfLink ? { pdfLink } : {}),
  };
}

async function readRecoveredFinalizedRecord(options: {
  supabase: FinalizedRecordsSupabaseClient;
  formSlug: FinalizationStatusFormSlug;
  idempotencyKey: string;
}) {
  const { data, error } = await options.supabase
    .from("formatos_finalizados_il")
    .select("path_formato,payload_normalized,payload_generated_at")
    .contains("payload_normalized", {
      metadata: {
        finalization: {
          form_slug: options.formSlug,
          idempotency_key: options.idempotencyKey,
        },
      },
    })
    .order("payload_generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as FinalizedRecordRow | null) ?? null;
}

export async function recoverPersistedFinalizationResponse(options: {
  supabase: FinalizedRecordsSupabaseClient;
  formSlug: FinalizationStatusFormSlug;
  idempotencyKey: string;
  userId: string;
  stage?: string;
  source?: string;
  totalDurationMs?: number | null;
  profilingSteps?: DraftGooglePrewarmTimingStep[] | null;
  prewarmStatus?: string | null;
  prewarmReused?: boolean | null;
  prewarmStructureSignature?: string | null;
}) {
  const recoveredRecord = await readRecoveredFinalizedRecord({
    supabase: options.supabase,
    formSlug: options.formSlug,
    idempotencyKey: options.idempotencyKey,
  });
  const recoveredResponse = extractRecoveredFinalizationResponse(recoveredRecord);

  if (!recoveredResponse) {
    return null;
  }

  try {
    await markFinalizationRequestSucceeded({
      supabase: options.supabase,
      idempotencyKey: options.idempotencyKey,
      userId: options.userId,
      stage: options.stage ?? "succeeded",
      responsePayload: recoveredResponse,
      totalDurationMs: options.totalDurationMs,
      profilingSteps: options.profilingSteps,
      prewarmStatus: options.prewarmStatus,
      prewarmReused: options.prewarmReused,
      prewarmStructureSignature: options.prewarmStructureSignature,
    });
  } catch (error) {
    if (options.source) {
      console.error(`[${options.source}] failed_to_backfill_succeeded`, {
        error,
        idempotencyKey: options.idempotencyKey,
        userId: options.userId,
      });
    }
  }

  return recoveredResponse;
}

export type FinalizationRecoveryDecision =
  | {
      kind: "replay";
      responsePayload: FinalizationSuccessResponse;
      recovered: boolean;
    }
  | {
      kind: "resume";
      externalArtifacts: FinalizationExternalArtifacts;
      externalStage: FinalizationExternalStage;
    }
  | {
      kind: "cold";
    };

export async function resolveFinalizationRecoveryDecision(options: {
  supabase: FinalizedRecordsSupabaseClient;
  requestRow: FinalizationRequestRow;
  formSlug: FinalizationStatusFormSlug;
  idempotencyKey: string;
  userId: string;
  stage?: string;
  source?: string;
  totalDurationMs?: number | null;
  profilingSteps?: DraftGooglePrewarmTimingStep[] | null;
  prewarmStatus?: string | null;
  prewarmReused?: boolean | null;
  prewarmStructureSignature?: string | null;
}): Promise<FinalizationRecoveryDecision> {
  const recoveredResponse = await recoverPersistedFinalizationResponse({
    supabase: options.supabase,
    formSlug: options.formSlug,
    idempotencyKey: options.idempotencyKey,
    userId: options.userId,
    stage: options.stage,
    source: options.source,
    totalDurationMs: options.totalDurationMs,
    profilingSteps: options.profilingSteps,
    prewarmStatus: options.prewarmStatus,
    prewarmReused: options.prewarmReused,
    prewarmStructureSignature: options.prewarmStructureSignature,
  });

  if (recoveredResponse) {
    return {
      kind: "replay",
      responsePayload: recoveredResponse,
      recovered: true,
    };
  }

  const externalArtifacts = extractFinalizationExternalArtifacts(options.requestRow);
  if (externalArtifacts) {
    const externalStage = normalizeFinalizationExternalStage(
      options.requestRow.external_stage,
      externalArtifacts
    );
    if (!externalStage) {
      return {
        kind: "cold",
      };
    }

    return {
      kind: "resume",
      externalArtifacts,
      externalStage,
    };
  }

  return {
    kind: "cold",
  };
}
