import * as Sentry from "@sentry/nextjs";

export type FinalizationEventKind = "started" | "succeeded" | "failed";
export type FinalizationConfirmationEventKind =
  | "confirmation_timeout_started"
  | "confirmation_recovered"
  | "confirmation_timeout_unresolved"
  | "confirmation_failed_after_poll";
export type FinalizationArtifactState = "none" | "spreadsheet_only" | "pdf_ready";

export type FinalizationUiLockSuppressionReason =
  | "route_hydration_redirect"
  | "session_to_draft_promotion"
  | "save_draft_redirect"
  | "invalid_submission_promotion";

export type FinalizationTelemetry = {
  requestId: string;
  formSlug: string;
  durationMs: number;
  stepCount: number;
  lastStep: string | null;
  writes?: number;
  asistentes?: number;
  spreadsheetReused?: boolean;
  targetSheetName?: string;
  rawPayloadArtifactStatus?: string;
  textReviewStatus?: string;
  textReviewReason?: string;
  textReviewReviewedCount?: number;
  textReviewModel?: string;
};

export type FinalizationConfirmationTelemetry = {
  formSlug: string;
  requestHash: string;
  pollAttempts: number;
  retryAfterSeconds?: number;
  stage?: string | null;
};

export type FinalizationStaleProcessingReclaimedTelemetry = {
  formSlug: string;
  idempotencyKey: string;
  userId: string;
  previousStage: string;
  previousExternalStage?: string | null;
  ageMs: number;
  artifactState: FinalizationArtifactState;
};

export type FinalizationUiLockSuppressionTelemetry = {
  formSlug: string;
  reason: FinalizationUiLockSuppressionReason;
  currentRoute?: string | null;
};

type FinalizationExtra = FinalizationTelemetry & {
  errorMessage?: string;
  errorName?: string;
  errorCode?: string;
  errorDetails?: string;
  errorHint?: string;
  errorStatusCode?: number;
};

type NormalizedErrorSnapshot = {
  error: Error;
  extra: Pick<
    FinalizationExtra,
    | "errorMessage"
    | "errorName"
    | "errorCode"
    | "errorDetails"
    | "errorHint"
    | "errorStatusCode"
  >;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function serializeUnknownError(error: unknown) {
  try {
    const serialized = JSON.stringify(error);
    return readNonEmptyString(serialized);
  } catch {
    return undefined;
  }
}

function normalizeError(error: unknown): NormalizedErrorSnapshot {
  if (error instanceof Error) {
    const errorRecord = error as Error & Record<string, unknown>;

    return {
      error,
      extra: {
        errorMessage: readNonEmptyString(error.message) ?? error.message,
        errorName: readNonEmptyString(error.name) ?? error.name,
        errorCode: readNonEmptyString(errorRecord.code),
        errorDetails: readNonEmptyString(errorRecord.details),
        errorHint: readNonEmptyString(errorRecord.hint),
        errorStatusCode: readFiniteNumber(
          errorRecord.statusCode ?? errorRecord.status
        ),
      },
    };
  }

  if (isRecord(error)) {
    const errorMessage =
      readNonEmptyString(error.message) ??
      readNonEmptyString(error.error_description) ??
      readNonEmptyString(error.error) ??
      serializeUnknownError(error) ??
      String(error);
    const errorName = readNonEmptyString(error.name) ?? "NonErrorObject";
    const normalizedError = new Error(errorMessage);
    normalizedError.name = errorName;

    return {
      error: normalizedError,
      extra: {
        errorMessage,
        errorName,
        errorCode: readNonEmptyString(error.code),
        errorDetails: readNonEmptyString(error.details),
        errorHint: readNonEmptyString(error.hint),
        errorStatusCode: readFiniteNumber(error.statusCode ?? error.status),
      },
    };
  }

  const normalizedError = new Error(String(error));

  return {
    error: normalizedError,
    extra: {
      errorMessage: normalizedError.message,
      errorName: normalizedError.name,
    },
  };
}

function buildTags(telemetry: FinalizationTelemetry, kind: FinalizationEventKind) {
  return {
    domain: "finalization",
    finalization_event: kind,
    form_slug: telemetry.formSlug,
    request_id: telemetry.requestId,
  };
}

function buildExtra(
  telemetry: FinalizationTelemetry,
  normalizedError?: NormalizedErrorSnapshot | null
): FinalizationExtra {
  const extra: FinalizationExtra = {
    ...telemetry,
  };

  if (normalizedError) {
    extra.errorMessage = normalizedError.extra.errorMessage;
    extra.errorName = normalizedError.extra.errorName;
    extra.errorCode = normalizedError.extra.errorCode;
    extra.errorDetails = normalizedError.extra.errorDetails;
    extra.errorHint = normalizedError.extra.errorHint;
    extra.errorStatusCode = normalizedError.extra.errorStatusCode;
  }

  return extra;
}

function isSentryAttribute(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function buildAttributes(
  payload: Record<string, unknown>
): Record<string, string | number | boolean> {
  return Object.entries(payload).reduce<Record<string, string | number | boolean>>(
    (accumulator, [key, value]) => {
      if (isSentryAttribute(value)) {
        accumulator[key] = value;
      }

      return accumulator;
    },
    {}
  );
}

export function reportFinalizationEvent(
  kind: FinalizationEventKind,
  telemetry: FinalizationTelemetry,
  error?: unknown
) {
  const normalizedError = error === undefined ? null : normalizeError(error);
  const options = {
    level: kind === "failed" ? ("error" as const) : ("info" as const),
    tags: buildTags(telemetry, kind),
    extra: buildExtra(telemetry, normalizedError),
  };

  if (kind === "failed") {
    Sentry.addBreadcrumb({
      category: "finalization",
      level: "error",
      message: "[finalization] failed",
      data: buildAttributes({
        ...buildTags(telemetry, kind),
        ...buildExtra(telemetry, normalizedError),
      }),
    });
    Sentry.captureException(
      normalizedError?.error ?? new Error("Unknown finalization error"),
      options
    );
    return;
  }

  Sentry.addBreadcrumb({
    category: "finalization",
    level: "info",
    message: `[finalization] ${kind}`,
    data: buildAttributes({
      ...buildTags(telemetry, kind),
      ...buildExtra(telemetry, normalizedError),
    }),
  });
}

export function reportFinalizationConfirmationEvent(
  kind: FinalizationConfirmationEventKind,
  telemetry: FinalizationConfirmationTelemetry
) {
  const attributes = buildAttributes({
      domain: "finalization",
      finalization_confirmation_event: kind,
      form_slug: telemetry.formSlug,
      request_hash: telemetry.requestHash,
      poll_attempts: telemetry.pollAttempts,
      retry_after_seconds: telemetry.retryAfterSeconds,
      stage: telemetry.stage ?? undefined,
    });
  Sentry.addBreadcrumb({
    category: "finalization",
    level:
      kind === "confirmation_timeout_unresolved" ||
      kind === "confirmation_failed_after_poll"
        ? "warning"
        : "info",
    message: `[finalization] ${kind}`,
    data: attributes,
  });

  if (kind === "confirmation_timeout_unresolved") {
    Sentry.captureMessage(`[finalization] ${kind}`, {
      level: "warning",
      tags: {
        domain: "finalization",
        finalization_confirmation_event: kind,
        form_slug: telemetry.formSlug,
      },
      extra: {
        requestHash: telemetry.requestHash,
        pollAttempts: telemetry.pollAttempts,
        retryAfterSeconds: telemetry.retryAfterSeconds,
        stage: telemetry.stage ?? null,
      },
    });
    return;
  }

  if (kind !== "confirmation_failed_after_poll") {
    return;
  }

  Sentry.captureMessage(`[finalization] ${kind}`, {
    level: "error",
    tags: {
      domain: "finalization",
      finalization_confirmation_event: kind,
      form_slug: telemetry.formSlug,
    },
    extra: {
      requestHash: telemetry.requestHash,
      pollAttempts: telemetry.pollAttempts,
      retryAfterSeconds: telemetry.retryAfterSeconds,
      stage: telemetry.stage ?? null,
    },
  });
}

export function reportFinalizationStaleProcessingReclaimed(
  telemetry: FinalizationStaleProcessingReclaimedTelemetry
) {
  const attributes = buildAttributes({
    domain: "finalization",
    finalization_event: "stale_processing_reclaimed",
    form_slug: telemetry.formSlug,
    idempotency_key: telemetry.idempotencyKey,
    user_id: telemetry.userId,
    previous_stage: telemetry.previousStage,
    previous_external_stage: telemetry.previousExternalStage ?? "none",
    age_ms: telemetry.ageMs,
    artifact_state: telemetry.artifactState,
  });

  Sentry.addBreadcrumb({
    category: "finalization",
    level: "warning",
    message: "[finalization] stale_processing_reclaimed",
    data: attributes,
  });

  Sentry.captureMessage("[finalization] stale_processing_reclaimed", {
    level: "warning",
    tags: {
      domain: "finalization",
      finalization_event: "stale_processing_reclaimed",
      form_slug: telemetry.formSlug,
    },
    extra: {
      idempotencyKey: telemetry.idempotencyKey,
      userId: telemetry.userId,
      previousStage: telemetry.previousStage,
      previousExternalStage: telemetry.previousExternalStage ?? null,
      ageMs: telemetry.ageMs,
      artifactState: telemetry.artifactState,
    },
  });
}

export function reportFinalizationUiLockSuppressed(
  telemetry: FinalizationUiLockSuppressionTelemetry
) {
  const attributes = buildAttributes({
      domain: "finalization",
      finalization_ui_lock_event: "draft_navigation_suppressed",
      form_slug: telemetry.formSlug,
      reason: telemetry.reason,
      current_route: telemetry.currentRoute ?? undefined,
    });
  Sentry.addBreadcrumb({
    category: "finalization",
    level: "info",
    message: "[finalization] draft_navigation_suppressed",
    data: attributes,
  });
}
