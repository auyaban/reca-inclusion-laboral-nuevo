import * as Sentry from "@sentry/nextjs";

export type FinalizationEventKind = "started" | "succeeded" | "failed";
export type FinalizationConfirmationEventKind =
  | "confirmation_timeout_started"
  | "confirmation_recovered"
  | "confirmation_timeout_unresolved"
  | "confirmation_failed_after_poll";

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

type FinalizationExtra = FinalizationTelemetry & {
  errorMessage?: string;
  errorName?: string;
};

type SentryLogAttribute = string | number | boolean;

function toError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
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
  error?: unknown
): FinalizationExtra {
  const extra: FinalizationExtra = {
    ...telemetry,
  };

  if (error !== undefined) {
    const normalizedError = toError(error);
    extra.errorMessage = normalizedError.message;
    extra.errorName = normalizedError.name;
  }

  return extra;
}

function isSentryLogAttribute(value: unknown): value is SentryLogAttribute {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function buildLogAttributes(
  telemetry: FinalizationTelemetry,
  kind: FinalizationEventKind,
  error?: unknown
) {
  return Object.fromEntries(
    Object.entries({
      ...buildTags(telemetry, kind),
      ...buildExtra(telemetry, error),
    }).filter(([, value]) => isSentryLogAttribute(value))
  );
}

export function reportFinalizationEvent(
  kind: FinalizationEventKind,
  telemetry: FinalizationTelemetry,
  error?: unknown
) {
  const options = {
    level: kind === "failed" ? ("error" as const) : ("info" as const),
    tags: buildTags(telemetry, kind),
    extra: buildExtra(telemetry, error),
  };

  if (kind === "failed") {
    Sentry.logger.error("[finalization] failed", buildLogAttributes(telemetry, kind, error));
    Sentry.captureException(toError(error), options);
    return;
  }

  Sentry.logger.info(`[finalization] ${kind}`, buildLogAttributes(telemetry, kind));

  Sentry.captureMessage(`[finalization] ${kind}`, options);
}

export function reportFinalizationConfirmationEvent(
  kind: FinalizationConfirmationEventKind,
  telemetry: FinalizationConfirmationTelemetry
) {
  const attributes = Object.fromEntries(
    Object.entries({
      domain: "finalization",
      finalization_confirmation_event: kind,
      form_slug: telemetry.formSlug,
      request_hash: telemetry.requestHash,
      poll_attempts: telemetry.pollAttempts,
      retry_after_seconds: telemetry.retryAfterSeconds,
      stage: telemetry.stage ?? undefined,
    }).filter(([, value]) => isSentryLogAttribute(value))
  );

  Sentry.logger.info(`[finalization] ${kind}`, attributes);
  Sentry.captureMessage(`[finalization] ${kind}`, {
    level: kind === "confirmation_timeout_unresolved" ? "warning" : "info",
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
