import type {
  FinalizationIdentity,
  FinalizationSuccessResponse,
} from "@/lib/finalization/idempotency";
import {
  FINALIZATION_FORM_SLUGS,
  buildRegisteredFinalizationIdempotencyKey,
} from "@/lib/finalization/formRegistry";
import type { FinalizationStatusFormSlug } from "@/lib/finalization/formSlugs";
import {
  buildFinalizationFailurePayload,
  buildFinalizationProcessingPayload,
} from "@/lib/finalization/finalizationFeedback";
import {
  getProcessingRetryAfterSeconds,
  markFinalizationRequestSucceeded,
  readFinalizationRequest,
  type FinalizationRequestRow,
  type FinalizationRequestsSupabaseClient,
} from "@/lib/finalization/requests";
import {
  isRecord,
  stringTrimmedText,
} from "@/lib/finalization/valueUtils";

export const FINALIZATION_STATUS_FORM_SLUGS = FINALIZATION_FORM_SLUGS;
export type { FinalizationStatusFormSlug };

export type PersistedFinalizationMetadata = {
  form_slug: FinalizationStatusFormSlug;
  request_hash: string;
  idempotency_key: string;
  identity_key: string;
};

export type FinalizationStatusRequest = {
  formSlug: FinalizationStatusFormSlug;
  finalization_identity: FinalizationIdentity;
  requestHash: string;
};

export type FinalizationStatusSucceededResponse = {
  status: "succeeded";
  responsePayload: FinalizationSuccessResponse;
  recovered: boolean;
};

export type FinalizationStatusProcessingResponse = {
  status: "processing";
  stage: string;
  retryAfterSeconds: number;
} & ReturnType<typeof buildFinalizationProcessingPayload>;

export type FinalizationStatusFailedResponse = {
  status: "failed";
  stage: string;
  errorMessage: string;
} & ReturnType<typeof buildFinalizationFailurePayload>;

export type FinalizationStatusNotFoundResponse = {
  status: "not_found";
};

export type FinalizationStatusResponse =
  | FinalizationStatusSucceededResponse
  | FinalizationStatusProcessingResponse
  | FinalizationStatusFailedResponse
  | FinalizationStatusNotFoundResponse;

export const DEFAULT_FINALIZATION_STATUS_RETRY_AFTER_SECONDS = 5;

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

type FinalizedRecordsSupabaseClient = FinalizationRequestsSupabaseClient & {
  from: (table: "formatos_finalizados_il") => {
    select: (fields?: string) => FinalizedRecordSelectQuery<FinalizedRecordRow>;
  };
};

function hasSuccessResponse(
  value: unknown
): value is FinalizationSuccessResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    typeof value.sheetLink === "string" &&
    value.sheetLink.trim().length > 0
  );
}

export function getFinalizationIdentityKey(identity: FinalizationIdentity) {
  const draftId = stringTrimmedText(identity.draft_id);
  const sessionId = stringTrimmedText(identity.local_draft_session_id);

  return draftId || sessionId;
}

export function buildFinalizationStatusIdempotencyKey(options: {
  formSlug: FinalizationStatusFormSlug;
  userId: string;
  identity: FinalizationIdentity;
  requestHash: string;
}) {
  return buildRegisteredFinalizationIdempotencyKey(options);
}

export function buildPersistedFinalizationMetadata(options: {
  formSlug: FinalizationStatusFormSlug;
  identity: FinalizationIdentity;
  requestHash: string;
  idempotencyKey: string;
}): PersistedFinalizationMetadata {
  return {
    form_slug: options.formSlug,
    request_hash: options.requestHash,
    idempotency_key: options.idempotencyKey,
    identity_key: getFinalizationIdentityKey(options.identity),
  };
}

export function withPersistedFinalizationMetadata<
  TPayloadNormalized extends {
    metadata: Record<string, unknown>;
  },
>(
  payloadNormalized: TPayloadNormalized,
  finalization: PersistedFinalizationMetadata
): TPayloadNormalized {
  return {
    ...payloadNormalized,
    metadata: {
      ...payloadNormalized.metadata,
      finalization,
    },
  };
}

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

function buildProcessingResponse(
  row: Pick<FinalizationRequestRow, "status" | "stage" | "updated_at">
): FinalizationStatusProcessingResponse {
  const feedback = buildFinalizationProcessingPayload(row.stage);

  return {
    status: "processing",
    stage: row.stage,
    retryAfterSeconds:
      row.status === "processing"
        ? getProcessingRetryAfterSeconds({ updated_at: row.updated_at })
        : DEFAULT_FINALIZATION_STATUS_RETRY_AFTER_SECONDS,
    displayStage: feedback.displayStage,
    displayMessage: feedback.displayMessage,
    retryAction: feedback.retryAction,
  };
}

export async function resolvePersistedFinalizationStatus(options: {
  supabase: FinalizedRecordsSupabaseClient;
  userId: string;
  formSlug: FinalizationStatusFormSlug;
  idempotencyKey: string;
}) {
  const requestRow = await readFinalizationRequest(
    options.supabase,
    options.idempotencyKey,
    options.userId
  );

  if (!requestRow) {
    return {
      status: "not_found",
    } satisfies FinalizationStatusNotFoundResponse;
  }

  if (hasSuccessResponse(requestRow.response_payload)) {
    return {
      status: "succeeded",
      responsePayload: requestRow.response_payload,
      recovered: false,
    } satisfies FinalizationStatusSucceededResponse;
  }

  if (requestRow.status === "failed") {
    const feedback = buildFinalizationFailurePayload(requestRow.stage);

    return {
      status: "failed",
      stage: requestRow.stage,
      errorMessage:
        stringTrimmedText(requestRow.last_error) ||
        "No se pudo confirmar la publicación.",
      displayStage: feedback.displayStage,
      displayMessage: feedback.displayMessage,
      retryAction: feedback.retryAction,
    } satisfies FinalizationStatusFailedResponse;
  }

  const recoveredRecord = await readRecoveredFinalizedRecord({
    supabase: options.supabase,
    formSlug: options.formSlug,
    idempotencyKey: options.idempotencyKey,
  });
  const recoveredResponse = extractRecoveredFinalizationResponse(recoveredRecord);

  if (recoveredResponse) {
    await markFinalizationRequestSucceeded({
      supabase: options.supabase,
      idempotencyKey: options.idempotencyKey,
      userId: options.userId,
      stage: "succeeded",
      responsePayload: recoveredResponse,
    });

    return {
      status: "succeeded",
      responsePayload: recoveredResponse,
      recovered: true,
    } satisfies FinalizationStatusSucceededResponse;
  }

  return buildProcessingResponse(requestRow);
}
