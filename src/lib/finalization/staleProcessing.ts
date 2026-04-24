import {
  FINALIZATION_PROCESSING_TTL_MS as FINALIZATION_PROCESSING_TTL_MS_VALUE,
  buildStaleFinalizationReport as buildStaleFinalizationReportValue,
  buildStaleThresholdIso as buildStaleThresholdIsoValue,
  classifyStaleArtifactStateFromRawExternalArtifacts as classifyStaleArtifactStateFromRawExternalArtifactsValue,
} from "./staleProcessing.mjs";

export type FinalizationArtifactState = "none" | "spreadsheet_only" | "pdf_ready";

export type StaleFinalizationSourceRow = {
  idempotency_key: string;
  form_slug: string;
  user_id: string;
  stage: string;
  external_artifacts: Record<string, unknown> | null;
  external_stage: string | null;
  started_at: string;
  updated_at: string;
};

export type StaleFinalizationReportRow = {
  idempotencyKey: string;
  formSlug: string;
  userId: string;
  stage: string;
  externalStage: string | null;
  startedAt: string;
  updatedAt: string;
  ageMs: number;
  artifactState: FinalizationArtifactState;
  hasExternalArtifacts: boolean;
};

export type StaleFinalizationReport = {
  generatedAt: string;
  ttlMs: number;
  thresholdIso: string;
  staleCount: number;
  byFormSlug: Record<string, number>;
  byStage: Record<string, number>;
  byExternalStage: Record<string, number>;
  byArtifactState: Record<FinalizationArtifactState, number>;
  rows: StaleFinalizationReportRow[];
};

export const FINALIZATION_PROCESSING_TTL_MS =
  FINALIZATION_PROCESSING_TTL_MS_VALUE as number;
export const buildStaleThresholdIso =
  buildStaleThresholdIsoValue as (
    now?: number | Date,
    olderThanMs?: number
  ) => string;
export const classifyStaleArtifactStateFromRawExternalArtifacts =
  classifyStaleArtifactStateFromRawExternalArtifactsValue as (
    externalArtifacts: Record<string, unknown> | null | undefined
  ) => FinalizationArtifactState;
export const buildStaleFinalizationReport =
  buildStaleFinalizationReportValue as (
    rows: StaleFinalizationSourceRow[],
    options?: {
      now?: number | Date;
      ttlMs?: number;
    }
  ) => StaleFinalizationReport;
