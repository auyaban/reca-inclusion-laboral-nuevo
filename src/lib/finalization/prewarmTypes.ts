import type { FormSheetMutation } from "@/lib/google/sheets";
import type { FinalizationFormSlug } from "@/lib/finalization/formSlugs";

export const DRAFT_GOOGLE_PREWARM_VERSION = 1;

export const DRAFT_GOOGLE_PREWARM_STATUSES = [
  "idle",
  "preparing",
  "ready",
  "failed",
  "stale",
  "finalized",
] as const;

export type DraftGooglePrewarmStatus =
  (typeof DRAFT_GOOGLE_PREWARM_STATUSES)[number];

export type DraftGooglePrewarmTimingStep = {
  label: string;
  durationMs: number;
  totalMs: number;
};

export type DraftGooglePrewarmTiming = {
  requestId: string;
  startedAt: string;
  totalMs: number;
  steps: DraftGooglePrewarmTimingStep[];
};

export const FINALIZATION_PREWARM_OUTCOMES = [
  "disabled",
  "reused_ready",
  "inline_cold",
  "inline_after_stale",
  "inline_after_failed",
  "inline_after_incomplete",
  "inline_after_busy",
  "inline_missing_draft",
  "inline_skipped_low_budget",
] as const;

export type FinalizationPrewarmOutcome =
  (typeof FINALIZATION_PREWARM_OUTCOMES)[number];

export type DraftGooglePrewarmState = {
  version: number;
  folderId: string | null;
  spreadsheetId: string | null;
  provisionalName: string | null;
  bundleKey: string | null;
  structureSignature: string | null;
  templateRevision: string | null;
  validatedAt: string | null;
  activeSheetName: string | null;
  activeSheetId: number | null;
  bundleSheetNames: string[];
  status: DraftGooglePrewarmStatus;
  lastError: string | null;
  attemptCount: number;
  lastRunTiming: DraftGooglePrewarmTiming | null;
  lastSuccessfulTiming: DraftGooglePrewarmTiming | null;
};

export type DraftGooglePrewarmSummary = {
  folderId: string;
  spreadsheetId: string;
  bundleKey: string;
  structureSignature: string;
  templateRevision: string | null;
  validatedAt: string | null;
  activeSheetId: number | null;
  activeSheetName: string;
  updatedAt: string;
};

export type PrewarmHint = {
  bundleKey: string;
  structureSignature: string;
  templateRevision: string;
  variantKey: string;
  repeatedCounts: Record<string, number>;
  provisionalName: string;
};

export type PreparedDraftSpreadsheetResult = {
  kind: "prepared";
  resolution: DraftSpreadsheetResolution;
  spreadsheetId: string;
  companyFolderId: string;
  activeSheetName: string;
  activeSheetId: number;
  sheetLink: string;
  prewarmStatus: "ready" | "rebuilt";
  prewarmReused: boolean;
  prewarmStructureSignature: string;
  summary: DraftGooglePrewarmSummary;
  stateSnapshot: DraftGooglePrewarmState;
  structuralMutation: FormSheetMutation;
  timing: DraftGooglePrewarmTiming;
};

export type BusyDraftSpreadsheetResult = {
  kind: "busy";
  prewarmStatus: "busy";
  prewarmReused: false;
  prewarmStructureSignature: string;
  timing: DraftGooglePrewarmTiming;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  summary: DraftGooglePrewarmSummary | null;
};

export type UnavailableDraftSpreadsheetResult = {
  kind: "unavailable";
  reason: "draft_not_found";
  prewarmStatus: "unavailable";
  prewarmReused: false;
  prewarmStructureSignature: string;
  timing: DraftGooglePrewarmTiming;
};

export type DraftSpreadsheetPreparationResult =
  | PreparedDraftSpreadsheetResult
  | BusyDraftSpreadsheetResult
  | UnavailableDraftSpreadsheetResult;

export type PrewarmRouteResponse =
  | {
      success: true;
      status: "noop" | "ready" | "rebuilt";
      prewarm: DraftGooglePrewarmSummary;
    }
  | {
      success: false;
      status: "busy" | "failed" | "throttled";
      error: string;
      retryAfterSeconds?: number;
    };

export type PreparedFinalizationSpreadsheet = {
  spreadsheetId: string;
  companyFolderId: string;
  spreadsheetResourceMode: "draft_prewarm" | "legacy_company";
  prewarmStateSnapshot: DraftGooglePrewarmState | null;
  effectiveSheetReplacements: Record<string, string> | null;
  effectiveMutation: FormSheetMutation;
  activeSheetName: string;
  activeSheetId: number;
  sheetLink: string;
  reusedSpreadsheet: boolean;
  prewarmStatus: FinalizationPrewarmOutcome;
  prewarmReused: boolean;
  prewarmStructureSignature: string | null;
};

export type PrewarmBuildContext = {
  formSlug: FinalizationFormSlug;
  bundleKey: string;
  variantKey: string;
  repeatedCounts: Record<string, number>;
};

export type DraftGooglePrewarmLeaseState = {
  claimed: boolean;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  status: string | null;
  updatedAt: string | null;
  state: DraftGooglePrewarmState;
};

export type DraftSpreadsheetResolution =
  | "reused"
  | "cold"
  | "after_stale"
  | "after_failed"
  | "after_incomplete"
  | "after_busy";
