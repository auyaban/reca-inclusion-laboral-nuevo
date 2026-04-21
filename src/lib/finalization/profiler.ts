import { reportFinalizationEvent } from "@/lib/observability/finalization";
import type {
  ExecutionTimingStep,
  ExecutionTimingTracker,
} from "@/lib/finalization/executionTiming";

export type FinalizationStep = ExecutionTimingStep;

export type FinalizationProfiler = ExecutionTimingTracker & {
  finish: (metadata?: Record<string, unknown>) => void;
  fail: (error: unknown, metadata?: Record<string, unknown>) => void;
};

type FinalizationTelemetryMetadata = {
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

function shouldLogFinalizationProfiler() {
  return process.env.NODE_ENV === "development";
}

export function createFinalizationProfiler(
  formSlug: string
): FinalizationProfiler {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  let lastMarkAt = startedAt;
  const steps: FinalizationStep[] = [];

  function buildSummary(metadata?: Record<string, unknown>) {
    return {
      requestId,
      formSlug,
      totalMs: Date.now() - startedAt,
      stepCount: steps.length,
      lastStep: steps.at(-1)?.label ?? null,
      steps,
      ...metadata,
    };
  }

  function buildTelemetry(metadata?: Record<string, unknown>) {
    const summary = buildSummary(metadata);
    const metadataRecord = (metadata ?? {}) as FinalizationTelemetryMetadata;

    return {
      requestId: summary.requestId,
      formSlug: summary.formSlug,
      durationMs: summary.totalMs,
      stepCount: summary.stepCount,
      lastStep: summary.lastStep,
      writes:
        typeof metadataRecord.writes === "number" ? metadataRecord.writes : undefined,
      asistentes:
        typeof metadataRecord.asistentes === "number"
          ? metadataRecord.asistentes
          : undefined,
      spreadsheetReused:
        typeof metadataRecord.spreadsheetReused === "boolean"
          ? metadataRecord.spreadsheetReused
          : undefined,
      targetSheetName:
        typeof metadataRecord.targetSheetName === "string"
          ? metadataRecord.targetSheetName
          : undefined,
      rawPayloadArtifactStatus:
        typeof metadataRecord.rawPayloadArtifactStatus === "string"
          ? metadataRecord.rawPayloadArtifactStatus
          : undefined,
      textReviewStatus:
        typeof metadataRecord.textReviewStatus === "string"
          ? metadataRecord.textReviewStatus
          : undefined,
      textReviewReason:
        typeof metadataRecord.textReviewReason === "string"
          ? metadataRecord.textReviewReason
          : undefined,
      textReviewReviewedCount:
        typeof metadataRecord.textReviewReviewedCount === "number"
          ? metadataRecord.textReviewReviewedCount
          : undefined,
      textReviewModel:
        typeof metadataRecord.textReviewModel === "string"
          ? metadataRecord.textReviewModel
          : undefined,
    };
  }

  reportFinalizationEvent("started", buildTelemetry());

  return {
    requestId,
    mark(label) {
      const now = Date.now();
      steps.push({
        label,
        durationMs: now - lastMarkAt,
        totalMs: now - startedAt,
      });
      lastMarkAt = now;
    },
    getSteps() {
      return [...steps];
    },
    getTotalMs() {
      return Date.now() - startedAt;
    },
    finish(metadata) {
      reportFinalizationEvent("succeeded", buildTelemetry(metadata));
      if (!shouldLogFinalizationProfiler()) {
        return;
      }

      console.info(
        `[finalization:${formSlug}:${requestId}] success`,
        buildSummary(metadata)
      );
    },
    fail(error, metadata) {
      reportFinalizationEvent("failed", buildTelemetry(metadata), error);
      if (!shouldLogFinalizationProfiler()) {
        return;
      }

      console.error(
        `[finalization:${formSlug}:${requestId}] failed`,
        buildSummary({
          ...metadata,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    },
  };
}
