import type {
  FinalizationIdentity,
  FinalizationSuccessResponse,
} from "@/lib/finalization/idempotency";
import { getFinalizationIdentityKey } from "@/lib/finalization/idempotencyCore";
import {
  FINALIZATION_FORM_SLUGS,
  buildRegisteredFinalizationIdempotencyKey,
} from "@/lib/finalization/formRegistry";
import type { FinalizationStatusFormSlug } from "@/lib/finalization/formSlugs";
import {
  buildFinalizationFailurePayload,
  buildFinalizationProcessingPayload,
} from "@/lib/finalization/finalizationFeedback";
import { coerceTrimmedText } from "@/lib/finalization/valueUtils";
import {
  getProcessingRetryAfterSeconds,
  readFinalizationRequest,
  type FinalizationRequestRow,
} from "@/lib/finalization/requests";
import {
  recoverPersistedFinalizationResponse,
  type FinalizedRecordsSupabaseClient,
} from "@/lib/finalization/persistedRecovery";

export const FINALIZATION_STATUS_FORM_SLUGS = FINALIZATION_FORM_SLUGS;
export type { FinalizationStatusFormSlug };
export type { FinalizedRecordsSupabaseClient };

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

function hasSuccessResponse(
  value: unknown
): value is FinalizationSuccessResponse {
  const candidate =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null;

  return (
    candidate?.success === true &&
    typeof candidate.sheetLink === "string" &&
    candidate.sheetLink.trim().length > 0
  );
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

  const recoveredResponse = await recoverPersistedFinalizationResponse({
    supabase: options.supabase,
    formSlug: options.formSlug,
    idempotencyKey: options.idempotencyKey,
    userId: options.userId,
    source: "finalization.status",
  });

  if (recoveredResponse) {
    return {
      status: "succeeded",
      responsePayload: recoveredResponse,
      recovered: true,
    } satisfies FinalizationStatusSucceededResponse;
  }

  if (requestRow.status === "failed") {
    const feedback = buildFinalizationFailurePayload(requestRow.stage);

    return {
      status: "failed",
      stage: requestRow.stage,
      errorMessage:
        coerceTrimmedText(requestRow.last_error) ||
        "No se pudo confirmar la publicación.",
      displayStage: feedback.displayStage,
      displayMessage: feedback.displayMessage,
      retryAction: feedback.retryAction,
    } satisfies FinalizationStatusFailedResponse;
  }

  return buildProcessingResponse(requestRow);
}
