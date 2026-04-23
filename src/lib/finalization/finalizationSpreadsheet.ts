import {
  markDraftGooglePrewarmStatus,
  type DraftPrewarmSupabaseClient,
} from "@/lib/drafts/serverDraftPrewarm";
import type { ExecutionTimingTracker } from "@/lib/finalization/executionTiming";
import type { FinalizationFormSlug } from "@/lib/finalization/formSlugs";
import type { FinalizationIdentity } from "@/lib/finalization/idempotencyCore";
import { isFinalizationPrewarmEnabled } from "@/lib/finalization/prewarmConfig";
import type {
  FinalizationPrewarmOutcome,
  PrewarmHint,
  PreparedFinalizationSpreadsheet,
} from "@/lib/finalization/prewarmTypes";
import { prepareCompanySpreadsheet } from "@/lib/google/companySpreadsheet";
import { prepareDraftSpreadsheet } from "@/lib/google/draftSpreadsheet";
import { getOrCreateFolder, renameDriveFile, sanitizeFileName } from "@/lib/google/drive";
import type { FormSheetMutation } from "@/lib/google/sheets";

export type FinalizationSpreadsheetSupabaseClient = DraftPrewarmSupabaseClient;

export const FINALIZATION_MAX_DURATION_SECONDS = 60;
export const FINALIZATION_TOTAL_BUDGET_MS =
  FINALIZATION_MAX_DURATION_SECONDS * 1_000;
export const FINALIZATION_PREWARM_RISK_ZONE_REMAINING_MS = 30_000;
export const FINALIZATION_LEGACY_FALLBACK_MIN_REMAINING_MS = 25_000;

export type FinalizationBudgetSnapshot = {
  totalBudgetMs: number;
  elapsedMs: number;
  remainingMs: number;
  riskZoneRemainingMs: number;
  legacyFallbackMinRemainingMs: number;
};

type FinalizationPrewarmErrorContext = {
  prewarmStatus: FinalizationPrewarmOutcome;
  prewarmReused: boolean;
  prewarmStructureSignature: string | null;
  budget: FinalizationBudgetSnapshot | null;
};

export type FinalizationSpreadsheetTrackingContext = {
  prewarmStatus: FinalizationPrewarmOutcome;
  prewarmReused: boolean;
  prewarmStructureSignature: string | null;
};

export type FinalizationSpreadsheetPipeline = {
  preparedSpreadsheet: PreparedFinalizationSpreadsheet;
  trackingContext: FinalizationSpreadsheetTrackingContext;
  sealAfterPersistence: (options: {
    supabase?: FinalizationSpreadsheetSupabaseClient;
    userId: string;
    identity: FinalizationIdentity;
    hint: Pick<PrewarmHint, "bundleKey" | "structureSignature">;
    finalDocumentBaseName: string;
  }) => Promise<void>;
};

export class FinalizationPrewarmPreparationError extends Error {
  readonly context: FinalizationPrewarmErrorContext;

  constructor(message: string, context: FinalizationPrewarmErrorContext) {
    super(message);
    this.name = "FinalizationPrewarmPreparationError";
    this.context = context;
  }
}

export function getFinalizationPrewarmErrorContext(error: unknown) {
  return error instanceof FinalizationPrewarmPreparationError
    ? error.context
    : null;
}

function buildFinalizationBudgetSnapshot(elapsedMs: number): FinalizationBudgetSnapshot {
  return {
    totalBudgetMs: FINALIZATION_TOTAL_BUDGET_MS,
    elapsedMs,
    remainingMs: Math.max(0, FINALIZATION_TOTAL_BUDGET_MS - elapsedMs),
    riskZoneRemainingMs: FINALIZATION_PREWARM_RISK_ZONE_REMAINING_MS,
    legacyFallbackMinRemainingMs:
      FINALIZATION_LEGACY_FALLBACK_MIN_REMAINING_MS,
  };
}

function stripStructuralMutation(mutation: FormSheetMutation): FormSheetMutation {
  return {
    writes: mutation.writes,
    footerActaRefs: mutation.footerActaRefs,
    autoResizeExcludedRows: mutation.autoResizeExcludedRows,
  };
}

/**
 * El path legacy reusa o crea un spreadsheet historico por empresa.
 * El path draft_prewarm usa un spreadsheet provisional por draft y lo renombra
 * al publicar. La divergencia es intencional y ambas rutas conviven por
 * compatibilidad operativa.
 */
async function prepareLegacyCompanySpreadsheet(options: {
  masterTemplateId: string;
  sheetsFolderId: string;
  empresaNombre: string;
  fallbackSpreadsheetName: string;
  activeSheetName: string;
  extraVisibleSheetNames?: string[];
  mutation: FormSheetMutation;
  onStep?: (label: string) => void;
  companyFolderId?: string | null;
  prewarmStatus: FinalizationPrewarmOutcome;
  prewarmStructureSignature: string | null;
}): Promise<PreparedFinalizationSpreadsheet> {
  const companyFolderId =
    options.companyFolderId ??
    (await getOrCreateFolder(
      options.sheetsFolderId,
      sanitizeFileName(options.empresaNombre)
    ));

  const prepared = await prepareCompanySpreadsheet({
    masterTemplateId: options.masterTemplateId,
    companyFolderId,
    spreadsheetName: options.fallbackSpreadsheetName,
    activeSheetName: options.activeSheetName,
    extraVisibleSheetNames: options.extraVisibleSheetNames,
    mutation: options.mutation,
    onStep: options.onStep,
  });

  if (prepared.activeSheetId == null) {
    throw new Error(
      `No se pudo resolver la hoja activa "${prepared.activeSheetName}" en el spreadsheet final.`
    );
  }

  return {
    spreadsheetId: prepared.spreadsheetId,
    companyFolderId,
    spreadsheetResourceMode: "legacy_company",
    prewarmStateSnapshot: null,
    effectiveMutation: prepared.effectiveMutation,
    activeSheetName: prepared.activeSheetName,
    activeSheetId: prepared.activeSheetId,
    sheetLink: prepared.sheetLink,
    reusedSpreadsheet: prepared.reusedSpreadsheet,
    prewarmStatus: options.prewarmStatus,
    prewarmReused: false,
    prewarmStructureSignature: options.prewarmStructureSignature,
  };
}

export async function prepareSpreadsheetForFinalization(options: {
  supabase?: FinalizationSpreadsheetSupabaseClient;
  userId: string;
  formSlug: FinalizationFormSlug;
  masterTemplateId: string;
  sheetsFolderId: string;
  empresaNombre: string;
  identity: FinalizationIdentity;
  hint: PrewarmHint;
  fallbackSpreadsheetName: string;
  activeSheetName: string;
  extraVisibleSheetNames?: string[];
  mutation: FormSheetMutation;
  onStep?: (label: string) => void;
}): Promise<PreparedFinalizationSpreadsheet> {
  const canUsePrewarm =
    isFinalizationPrewarmEnabled(options.formSlug) &&
    Boolean(options.supabase?.rpc) &&
    Boolean(options.identity.draft_id);

  if (!canUsePrewarm) {
    return prepareLegacyCompanySpreadsheet({
      masterTemplateId: options.masterTemplateId,
      sheetsFolderId: options.sheetsFolderId,
      empresaNombre: options.empresaNombre,
      fallbackSpreadsheetName: options.fallbackSpreadsheetName,
      activeSheetName: options.activeSheetName,
      extraVisibleSheetNames: options.extraVisibleSheetNames,
      mutation: options.mutation,
      onStep: options.onStep,
      prewarmStatus: "disabled",
      prewarmStructureSignature: null,
    });
  }

  let prewarm;
  try {
    prewarm = await prepareDraftSpreadsheet({
      supabase: options.supabase,
      userId: options.userId,
      draftId: options.identity.draft_id,
      formSlug: options.formSlug,
      masterTemplateId: options.masterTemplateId,
      sheetsFolderId: options.sheetsFolderId,
      empresaNombre: options.empresaNombre,
      hint: options.hint,
      onStep: options.onStep,
      mode: "finalization",
    });
  } catch (error) {
    throw new FinalizationPrewarmPreparationError(
      error instanceof Error && error.message.trim()
        ? error.message
        : "No se pudo preparar Google antes de finalizar.",
      {
        prewarmStatus: "inline_cold",
        prewarmReused: false,
        prewarmStructureSignature: options.hint.structureSignature,
        budget: null,
      }
    );
  }

  if (prewarm.kind === "unavailable") {
    console.warn("[finalization.prewarm_draft_missing]", {
      formSlug: options.formSlug,
      draftId: options.identity.draft_id ?? null,
      reason: prewarm.reason,
      prewarmStructureSignature: prewarm.prewarmStructureSignature,
    });

    try {
      return await prepareLegacyCompanySpreadsheet({
        masterTemplateId: options.masterTemplateId,
        sheetsFolderId: options.sheetsFolderId,
        empresaNombre: options.empresaNombre,
        fallbackSpreadsheetName: options.fallbackSpreadsheetName,
        activeSheetName: options.activeSheetName,
        extraVisibleSheetNames: options.extraVisibleSheetNames,
        mutation: options.mutation,
        onStep: options.onStep,
        prewarmStatus: "inline_missing_draft",
        prewarmStructureSignature: options.hint.structureSignature,
      });
    } catch (error) {
      throw new FinalizationPrewarmPreparationError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "No se pudo continuar con la finalizacion sin borrador remoto.",
        {
          prewarmStatus: "inline_missing_draft",
          prewarmReused: false,
          prewarmStructureSignature: options.hint.structureSignature,
          budget: null,
        }
      );
    }
  }

  if (prewarm.kind === "busy") {
    const budget = buildFinalizationBudgetSnapshot(prewarm.timing.totalMs);

    if (budget.remainingMs < FINALIZATION_PREWARM_RISK_ZONE_REMAINING_MS) {
      console.warn("[finalization.prewarm_budget_risk]", {
        formSlug: options.formSlug,
        draftId: options.identity.draft_id ?? null,
        elapsedMs: budget.elapsedMs,
        remainingMs: budget.remainingMs,
        prewarmStatus: prewarm.prewarmStatus,
        leaseOwner: prewarm.leaseOwner,
        leaseExpiresAt: prewarm.leaseExpiresAt,
        companyFolderId: prewarm.summary?.folderId ?? null,
      });
    }

    if (budget.remainingMs < FINALIZATION_LEGACY_FALLBACK_MIN_REMAINING_MS) {
      console.warn("[finalization.prewarm_budget_guard_blocked]", {
        formSlug: options.formSlug,
        draftId: options.identity.draft_id ?? null,
        elapsedMs: budget.elapsedMs,
        remainingMs: budget.remainingMs,
        prewarmStatus: prewarm.prewarmStatus,
        leaseOwner: prewarm.leaseOwner,
        leaseExpiresAt: prewarm.leaseExpiresAt,
        companyFolderId: prewarm.summary?.folderId ?? null,
      });
      throw new FinalizationPrewarmPreparationError(
        "No hay tiempo suficiente para continuar con la preparacion de Google dentro del presupuesto de la solicitud.",
        {
          prewarmStatus: "inline_skipped_low_budget",
          prewarmReused: false,
          prewarmStructureSignature: options.hint.structureSignature,
          budget,
        }
      );
    }

    try {
      return await prepareLegacyCompanySpreadsheet({
        masterTemplateId: options.masterTemplateId,
        sheetsFolderId: options.sheetsFolderId,
        empresaNombre: options.empresaNombre,
        fallbackSpreadsheetName: options.fallbackSpreadsheetName,
        activeSheetName: options.activeSheetName,
        extraVisibleSheetNames: options.extraVisibleSheetNames,
        mutation: options.mutation,
        onStep: options.onStep,
        companyFolderId: prewarm.summary?.folderId ?? null,
        prewarmStatus: "inline_after_busy",
        prewarmStructureSignature: options.hint.structureSignature,
      });
    } catch (error) {
      throw new FinalizationPrewarmPreparationError(
        error instanceof Error && error.message.trim()
          ? error.message
          : "No se pudo continuar con la finalizacion despues de la contencion de Google.",
        {
          prewarmStatus: "inline_after_busy",
          prewarmReused: false,
          prewarmStructureSignature: options.hint.structureSignature,
          budget,
        }
      );
    }
  }

  const prewarmOutcome: FinalizationPrewarmOutcome = prewarm.prewarmReused
    ? "reused_ready"
    : prewarm.resolution === "after_busy"
      ? "inline_after_busy"
      : prewarm.resolution === "after_stale"
        ? "inline_after_stale"
        : prewarm.resolution === "after_failed"
          ? "inline_after_failed"
          : prewarm.resolution === "after_incomplete"
            ? "inline_after_incomplete"
            : "inline_cold";

  return {
    spreadsheetId: prewarm.spreadsheetId,
    companyFolderId: prewarm.companyFolderId,
    spreadsheetResourceMode: "draft_prewarm",
    prewarmStateSnapshot: prewarm.stateSnapshot,
    effectiveMutation: stripStructuralMutation(options.mutation),
    activeSheetName: prewarm.activeSheetName,
    activeSheetId: prewarm.activeSheetId,
    sheetLink: prewarm.sheetLink,
    reusedSpreadsheet: prewarm.prewarmReused,
    prewarmStatus: prewarmOutcome,
    prewarmReused: prewarm.prewarmReused,
    prewarmStructureSignature: options.hint.structureSignature,
  };
}

export function buildFinalizationProfilerPersistence(options: {
  profiler: ExecutionTimingTracker;
}) {
  return {
    totalDurationMs: options.profiler.getTotalMs(),
    profilingSteps: options.profiler.getSteps(),
  };
}

export async function sealPreparedSpreadsheetAfterPersistence(options: {
  supabase?: FinalizationSpreadsheetSupabaseClient;
  userId: string;
  identity: FinalizationIdentity;
  preparedSpreadsheet: Pick<
    PreparedFinalizationSpreadsheet,
    | "companyFolderId"
    | "spreadsheetId"
    | "spreadsheetResourceMode"
    | "prewarmStateSnapshot"
  >;
  hint: Pick<PrewarmHint, "bundleKey" | "structureSignature">;
  finalDocumentBaseName: string;
  runRename?: (operation: () => Promise<unknown>) => Promise<unknown>;
  onRenameFailure?: (error: unknown) => Promise<void> | void;
}) {
  if (options.preparedSpreadsheet.spreadsheetResourceMode === "draft_prewarm") {
    if (!options.supabase) {
      throw new Error(
        "Se requiere un cliente de Supabase para sellar un spreadsheet draft prewarm."
      );
    }

    await markDraftGooglePrewarmStatus({
      supabase: options.supabase,
      draftId: options.identity.draft_id,
      userId: options.userId,
      status: "finalized",
      baseState: options.preparedSpreadsheet.prewarmStateSnapshot ?? undefined,
      statePatch: {
        folderId: options.preparedSpreadsheet.companyFolderId,
        spreadsheetId: options.preparedSpreadsheet.spreadsheetId,
        structureSignature: options.hint.structureSignature,
        bundleKey: options.hint.bundleKey,
        lastError: null,
      },
    });
  }

  try {
    if (options.runRename) {
      await options.runRename(() =>
        renameDriveFile(
          options.preparedSpreadsheet.spreadsheetId,
          options.finalDocumentBaseName
        )
      );
      return;
    }

    await renameDriveFile(
      options.preparedSpreadsheet.spreadsheetId,
      options.finalDocumentBaseName
    );
  } catch (error) {
    await options.onRenameFailure?.(error);
  }
}

export async function prepareFinalizationSpreadsheetPipeline(options: {
  supabase?: FinalizationSpreadsheetSupabaseClient;
  userId: string;
  formSlug: FinalizationFormSlug;
  masterTemplateId: string;
  sheetsFolderId: string;
  empresaNombre: string;
  identity: FinalizationIdentity;
  hint: PrewarmHint;
  fallbackSpreadsheetName: string;
  activeSheetName: string;
  extraVisibleSheetNames?: string[];
  mutation: FormSheetMutation;
  runGoogleStep: <T>(
    stage: string,
    operation: () => Promise<T>,
    successLabel?: string
  ) => Promise<T>;
  markStage: (stage: string) => Promise<void>;
  tracker: Pick<ExecutionTimingTracker, "mark">;
  logPrefix: string;
}): Promise<FinalizationSpreadsheetPipeline> {
  const preparedSpreadsheet = await options.runGoogleStep(
    "prewarm.reuse_or_inline_prepare",
    () =>
      prepareSpreadsheetForFinalization({
        supabase: options.supabase,
        userId: options.userId,
        formSlug: options.formSlug,
        masterTemplateId: options.masterTemplateId,
        sheetsFolderId: options.sheetsFolderId,
        empresaNombre: options.empresaNombre,
        identity: options.identity,
        hint: options.hint,
        fallbackSpreadsheetName: options.fallbackSpreadsheetName,
        activeSheetName: options.activeSheetName,
        extraVisibleSheetNames: options.extraVisibleSheetNames,
        mutation: options.mutation,
        onStep: options.tracker.mark,
      })
  );

  const trackingContext: FinalizationSpreadsheetTrackingContext = {
    prewarmStatus: preparedSpreadsheet.prewarmStatus,
    prewarmReused: preparedSpreadsheet.prewarmReused,
    prewarmStructureSignature: preparedSpreadsheet.prewarmStructureSignature,
  };

  return {
    preparedSpreadsheet,
    trackingContext,
    sealAfterPersistence: async (sealOptions) =>
      sealPreparedSpreadsheetAfterPersistence({
        supabase: sealOptions.supabase,
        userId: sealOptions.userId,
        identity: sealOptions.identity,
        preparedSpreadsheet,
        hint: sealOptions.hint,
        finalDocumentBaseName: sealOptions.finalDocumentBaseName,
        runRename: (operation) =>
          options.runGoogleStep("drive.rename_final_file", operation),
        onRenameFailure: async (renameError) => {
          options.tracker.mark("drive.rename_final_file_failed");
          try {
            await options.markStage("drive.rename_final_file_failed");
          } catch (stageError) {
            console.error(`[${options.logPrefix}.rename_final_file_stage] failed`, {
              stageError,
            });
          }
          console.error(`[${options.logPrefix}.rename_final_file] failed`, {
            spreadsheetId: preparedSpreadsheet.spreadsheetId,
            finalDocumentBaseName: sealOptions.finalDocumentBaseName,
            renameError,
          });
        },
      }),
  };
}
