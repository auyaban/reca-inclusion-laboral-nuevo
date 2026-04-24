import {
  createSpreadsheetFile,
  getOrCreateFolder,
  sanitizeFileName,
  trashDriveFile,
} from "@/lib/google/drive";
import {
  applyFormSheetMutation,
  buildSpreadsheetSheetLink,
  clearProtectedRanges,
  hideSheets,
  type FormSheetMutation,
} from "@/lib/google/sheets";
import {
  copySheetToSpreadsheet,
  findMatchingSheet,
  listSheets,
} from "@/lib/google/companySpreadsheet";
import {
  claimDraftGooglePrewarmLease,
  createEmptyDraftGooglePrewarmState,
  readDraftGooglePrewarm,
  renewDraftGooglePrewarmLease,
  releaseDraftGooglePrewarmLease,
  updateDraftGooglePrewarm,
} from "@/lib/drafts/serverDraftPrewarm";
import {
  buildStructuralMutationForForm,
  getPrewarmActiveSheetName,
  getPrewarmBundleSheetNames,
  getPrewarmSupportSheetNames,
} from "@/lib/finalization/prewarmRegistry";
import { createTimingTracker } from "@/lib/finalization/timingTracker";
import type {
  DraftGooglePrewarmLeaseState,
  DraftGooglePrewarmState,
  DraftGooglePrewarmSummary,
  DraftSpreadsheetResolution,
  DraftSpreadsheetPreparationResult,
  PrewarmHint,
} from "@/lib/finalization/prewarmTypes";
import type { FinalizationFormSlug } from "@/lib/finalization/formSlugs";

type DraftPrewarmSupabaseClient = Parameters<
  typeof readDraftGooglePrewarm
>[0]["supabase"];

const PREWARM_LEASE_TTL_SECONDS = 60;
const PREWARM_POLL_INTERVAL_MS = 500;
const PREWARM_BACKGROUND_WAIT_MS = 2_500;
const PREWARM_FINALIZATION_WAIT_BUDGET_MS = 35_000;
const PREWARM_MAX_LEASE_CLAIM_ATTEMPTS = 3;
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasStructuralOperations(mutation: FormSheetMutation) {
  return (
    (mutation.templateBlockInsertions?.length ?? 0) > 0 ||
    (mutation.rowInsertions?.length ?? 0) > 0 ||
    (mutation.checkboxValidations?.length ?? 0) > 0
  );
}

function buildPrewarmSummary(
  state: DraftGooglePrewarmState,
  updatedAt: string
): DraftGooglePrewarmSummary {
  if (
    !state.folderId ||
    !state.spreadsheetId ||
    !state.bundleKey ||
    !state.structureSignature ||
    !state.activeSheetName
  ) {
    throw new Error("El prewarm listo no contiene metadata suficiente.");
  }

  return {
    folderId: state.folderId,
    spreadsheetId: state.spreadsheetId,
    bundleKey: state.bundleKey,
    structureSignature: state.structureSignature,
    activeSheetName: state.activeSheetName,
    updatedAt,
  };
}

function getRequiredDraftSheetNames(
  bundleSheetNames: string[],
  supportSheetNames: string[]
) {
  return Array.from(new Set([...bundleSheetNames, ...supportSheetNames]));
}

function buildBestEffortSummary(
  state: DraftGooglePrewarmState,
  updatedAt: string | null | undefined
) {
  if (
    !updatedAt ||
    !state.folderId ||
    !state.spreadsheetId ||
    !state.bundleKey ||
    !state.structureSignature ||
    !state.activeSheetName
  ) {
    return null;
  }

  return buildPrewarmSummary(state, updatedAt);
}

async function trashPreviousSpreadsheetBestEffort(fileId: string | null) {
  if (!fileId) {
    return;
  }

  try {
    await trashDriveFile(fileId);
  } catch (error) {
    console.error("[draft_spreadsheet.trash_previous] failed", {
      fileId,
      error,
    });
  }
}

function getBundleValidation(sheets: Awaited<ReturnType<typeof listSheets>>, options: {
  activeSheetName: string;
  bundleSheetNames: string[];
  supportSheetNames: string[];
}) {
  const activeSheet = findMatchingSheet(sheets, options.activeSheetName);
  const missingBundleSheets = getRequiredDraftSheetNames(
    options.bundleSheetNames,
    options.supportSheetNames
  ).filter(
    (sheetName) => !findMatchingSheet(sheets, sheetName)
  );

  return {
    activeSheet,
    missingBundleSheets,
  };
}

function buildBusyResult(options: {
  tracker: ReturnType<typeof createTimingTracker>;
  hint: PrewarmHint;
  leaseState: DraftGooglePrewarmLeaseState | null;
}): DraftSpreadsheetPreparationResult {
  return {
    kind: "busy",
    prewarmStatus: "busy",
    prewarmReused: false,
    prewarmStructureSignature: options.hint.structureSignature,
    timing: options.tracker.finish(),
    leaseOwner: options.leaseState?.leaseOwner ?? null,
    leaseExpiresAt: options.leaseState?.leaseExpiresAt ?? null,
    summary: options.leaseState
      ? buildBestEffortSummary(options.leaseState.state, options.leaseState.updatedAt)
      : null,
  };
}

function buildUnavailableResult(options: {
  tracker: ReturnType<typeof createTimingTracker>;
  hint: PrewarmHint;
  reason: "draft_not_found";
}): DraftSpreadsheetPreparationResult {
  return {
    kind: "unavailable",
    reason: options.reason,
    prewarmStatus: "unavailable",
    prewarmReused: false,
    prewarmStructureSignature: options.hint.structureSignature,
    timing: options.tracker.finish(),
  };
}

async function waitForPreparedDraft(options: {
  supabase: DraftPrewarmSupabaseClient;
  draftId: string;
  userId: string;
  expectedStructureSignature: string;
  expectedFolderId: string;
  backgroundMode: boolean;
  maxWaitUntil?: number | null;
}) {
  const now = Date.now();
  let latest = await readDraftGooglePrewarm({
    supabase: options.supabase,
    draftId: options.draftId,
    userId: options.userId,
  });
  const leaseExpiry = Date.parse(String(latest?.leaseExpiresAt ?? ""));
  const defaultDeadline =
    options.maxWaitUntil ??
    now +
      (options.backgroundMode
        ? PREWARM_BACKGROUND_WAIT_MS
        : PREWARM_FINALIZATION_WAIT_BUDGET_MS);
  const waitUntil = latest?.leaseExpiresAt && Number.isFinite(leaseExpiry)
    ? leaseExpiry
    : defaultDeadline;
  const deadline = Math.min(waitUntil, defaultDeadline);

  while (Date.now() <= deadline) {
    if (
      latest?.state.status === "ready" &&
      latest.state.structureSignature === options.expectedStructureSignature &&
      latest.state.folderId === options.expectedFolderId &&
      latest.state.spreadsheetId &&
      latest.updatedAt
    ) {
      return {
        state: latest.state,
        updatedAt: latest.updatedAt,
      };
    }

    const leaseStillValid =
      latest?.leaseExpiresAt != null &&
      Date.parse(latest.leaseExpiresAt) > Date.now();

    if (!leaseStillValid) {
      break;
    }

    await sleep(PREWARM_POLL_INTERVAL_MS);
    latest = await readDraftGooglePrewarm({
      supabase: options.supabase,
      draftId: options.draftId,
      userId: options.userId,
    });
  }

  return null;
}

export async function prepareDraftSpreadsheet(options: {
  supabase?: DraftPrewarmSupabaseClient;
  userId?: string;
  draftId?: string | null;
  formSlug: FinalizationFormSlug;
  masterTemplateId: string;
  sheetsFolderId: string;
  empresaNombre: string;
  hint: PrewarmHint;
  onStep?: (label: string) => void;
  strictDraftPersistence?: boolean;
  mode?: "background" | "finalization";
}): Promise<DraftSpreadsheetPreparationResult> {
  const tracker = createTimingTracker();
  const strictDraftPersistence = options.strictDraftPersistence ?? false;
  const backgroundMode = options.mode !== "finalization";
  const sanitizedEmpresa = sanitizeFileName(options.empresaNombre);
  const structuralMutation = buildStructuralMutationForForm(
    options.formSlug,
    options.hint
  );
  const activeSheetName = getPrewarmActiveSheetName(options.formSlug, options.hint);
  const bundleSheetNames = getPrewarmBundleSheetNames(options.formSlug, options.hint);
  const supportSheetNames = getPrewarmSupportSheetNames(options.formSlug);
  const requiredDraftSheetNames = getRequiredDraftSheetNames(
    bundleSheetNames,
    supportSheetNames
  );
  const nowIso = new Date().toISOString();
  const finalizationWaitDeadline = backgroundMode
    ? null
    : Date.now() + PREWARM_FINALIZATION_WAIT_BUDGET_MS;
  let createdSpreadsheetId: string | null = null;
  let companyFolderId: string | null = null;
  let leaseClaimed = false;
  const leaseRequestId = tracker.requestId;

  tracker.mark("draft.ensure_identity");
  options.onStep?.("prewarm.identity_resolved");

  const persistState = async (
    state: DraftGooglePrewarmState,
    status: DraftGooglePrewarmState["status"],
    updatedAt = new Date().toISOString(),
    clearLease = false
  ) => {
    if (!options.supabase || !options.userId || !options.draftId) {
      return {
        state: {
          ...state,
          status,
        },
        updatedAt,
      };
    }

    try {
      const persisted = await updateDraftGooglePrewarm({
        supabase: options.supabase,
        draftId: options.draftId,
        userId: options.userId,
        state,
        status,
        updatedAt,
        clearLease,
      });

      return {
        state: persisted?.state ?? { ...state, status },
        updatedAt: persisted?.updatedAt ?? updatedAt,
      };
    } catch (error) {
      if (strictDraftPersistence) {
        throw error;
      }

      console.error("[draft_spreadsheet.persist_state] failed", {
        draftId: options.draftId,
        status,
        error,
      });

      return {
        state: { ...state, status },
        updatedAt,
      };
    }
  };

  const canUseLease = Boolean(options.supabase && options.userId && options.draftId);
  let observedLeaseState: DraftGooglePrewarmLeaseState | null = null;
  let existingState: DraftGooglePrewarmState | null = null;
  let encounteredBusyLease = false;
  let encounteredIncompleteBundle = false;
  let knownInvalidReadySpreadsheetId: string | null = null;
  let rebuildResolution: DraftSpreadsheetResolution = "cold";
  const resolveCompanyFolderId = async (
    draftState: DraftGooglePrewarmState | null
  ) => {
    if (companyFolderId) {
      return companyFolderId;
    }

    if (draftState?.folderId) {
      companyFolderId = draftState.folderId;
      return companyFolderId;
    }

    companyFolderId = await getOrCreateFolder(
      options.sheetsFolderId,
      sanitizedEmpresa
    );
    tracker.mark("drive.resolve_company_folder");
    options.onStep?.("prewarm.drive.resolve_company_folder");
    return companyFolderId;
  };
  const renewLease = async () => {
    if (!leaseClaimed || !options.supabase || !options.draftId) {
      return;
    }

    const renewed = await renewDraftGooglePrewarmLease({
      supabase: options.supabase,
      draftId: options.draftId,
      ttlSeconds: PREWARM_LEASE_TTL_SECONDS,
      requestId: leaseRequestId,
    });

    if (!renewed?.claimed) {
      throw new Error(
        "Se perdio la exclusividad del prewarm antes de completar la preparacion."
      );
    }

    observedLeaseState = renewed;
  };

  try {
    if (canUseLease) {
      let attempt = 0;
      while (
        backgroundMode
          ? attempt < PREWARM_MAX_LEASE_CLAIM_ATTEMPTS
          : finalizationWaitDeadline == null || Date.now() < finalizationWaitDeadline
      ) {
        attempt += 1;
        observedLeaseState = await claimDraftGooglePrewarmLease({
          supabase: options.supabase!,
          draftId: options.draftId!,
          ttlSeconds: PREWARM_LEASE_TTL_SECONDS,
          requestId: leaseRequestId,
        });

        if (!observedLeaseState) {
          console.warn("[draft_spreadsheet.draft_not_found]", {
            formSlug: options.formSlug,
            draftId: options.draftId ?? null,
            userId: options.userId ?? null,
            mode: options.mode ?? "background",
          });
          return buildUnavailableResult({
            tracker,
            hint: options.hint,
            reason: "draft_not_found",
          });
        }

        if (observedLeaseState.claimed) {
          leaseClaimed = true;
          existingState = observedLeaseState.state;
          break;
        }

        encounteredBusyLease = true;
        const expectedFolderId = await resolveCompanyFolderId(
          observedLeaseState.state
        );

        if (!encounteredIncompleteBundle) {
          const waited = await waitForPreparedDraft({
            supabase: options.supabase!,
            draftId: options.draftId!,
            userId: options.userId!,
            expectedStructureSignature: options.hint.structureSignature,
            expectedFolderId,
            backgroundMode,
            maxWaitUntil: finalizationWaitDeadline,
          });

          if (waited?.state.spreadsheetId) {
            const reusedSheets = await listSheets(waited.state.spreadsheetId);
            const validation = getBundleValidation(reusedSheets, {
              activeSheetName,
              bundleSheetNames,
              supportSheetNames,
            });

            if (
              validation.activeSheet &&
              validation.missingBundleSheets.length === 0
            ) {
              return {
                kind: "prepared",
                resolution: "reused",
                spreadsheetId: waited.state.spreadsheetId,
                companyFolderId: expectedFolderId,
                activeSheetName,
                activeSheetId: validation.activeSheet.sheetId,
                sheetLink: buildSpreadsheetSheetLink(
                  waited.state.spreadsheetId,
                  validation.activeSheet.sheetId
                ),
                prewarmStatus: "ready",
                prewarmReused: true,
                prewarmStructureSignature: options.hint.structureSignature,
                summary: buildPrewarmSummary(waited.state, waited.updatedAt),
                stateSnapshot: waited.state,
                structuralMutation,
                timing: tracker.snapshot(),
              };
            }

            encounteredIncompleteBundle = true;
            knownInvalidReadySpreadsheetId = waited.state.spreadsheetId;
          }
        } else {
          await sleep(PREWARM_POLL_INTERVAL_MS);
        }
      }

      if (!leaseClaimed) {
        return buildBusyResult({
          tracker,
          hint: options.hint,
          leaseState: observedLeaseState,
        });
      }
    } else {
      existingState = null;
    }

    const existingDraftPrewarm =
      existingState ?? (canUseLease ? observedLeaseState?.state ?? null : null);
    const resolvedCompanyFolderId = await resolveCompanyFolderId(
      existingDraftPrewarm
    );
    companyFolderId = resolvedCompanyFolderId;
    const nextStateBase = existingDraftPrewarm ?? createEmptyDraftGooglePrewarmState();
    let nextState: DraftGooglePrewarmState = {
      ...nextStateBase,
      attemptCount: nextStateBase.attemptCount + 1,
      folderId: resolvedCompanyFolderId,
      provisionalName: options.hint.provisionalName,
      bundleKey: options.hint.bundleKey,
      structureSignature: options.hint.structureSignature,
      activeSheetName,
      bundleSheetNames,
      lastError: null,
    };

    const sameSignature =
      existingDraftPrewarm?.status === "ready" &&
      existingDraftPrewarm.structureSignature === options.hint.structureSignature &&
      existingDraftPrewarm.spreadsheetId &&
      existingDraftPrewarm.folderId === resolvedCompanyFolderId;

    if (sameSignature && existingDraftPrewarm?.spreadsheetId) {
      const shouldValidateExistingReadySheet =
        existingDraftPrewarm.spreadsheetId !== knownInvalidReadySpreadsheetId;
      let validation:
        | ReturnType<typeof getBundleValidation>
        | null = null;

      if (shouldValidateExistingReadySheet) {
        const reusedSheets = await listSheets(existingDraftPrewarm.spreadsheetId);
        validation = getBundleValidation(reusedSheets, {
          activeSheetName,
          bundleSheetNames,
          supportSheetNames,
        });
      } else {
        encounteredIncompleteBundle = true;
      }

      if (
        validation?.activeSheet &&
        validation.missingBundleSheets.length === 0
      ) {
        nextState = {
          ...existingDraftPrewarm,
          folderId: resolvedCompanyFolderId,
          activeSheetName,
          bundleKey: options.hint.bundleKey,
          bundleSheetNames,
          structureSignature: options.hint.structureSignature,
        };
        const timingBeforePersist = tracker.snapshot();
        nextState.lastRunTiming = timingBeforePersist;
        const initialPersisted = await persistState(nextState, "ready", nowIso);
        tracker.mark("draft.persist_prewarm_state");
        options.onStep?.("prewarm.draft.persist_prewarm_state");
        const finalTiming = tracker.finish();
        let persisted = initialPersisted;

        if (options.supabase && options.userId && options.draftId) {
          try {
            const repersisted = await updateDraftGooglePrewarm({
              supabase: options.supabase,
              draftId: options.draftId,
              userId: options.userId,
              state: {
                ...initialPersisted.state,
                lastRunTiming: finalTiming,
                lastSuccessfulTiming:
                  initialPersisted.state.lastSuccessfulTiming ?? finalTiming,
              },
              status: "ready",
              updatedAt: initialPersisted.updatedAt,
            });
            if (repersisted) {
              persisted = {
                ...repersisted,
                updatedAt: repersisted.updatedAt ?? initialPersisted.updatedAt,
              };
            }
          } catch (error) {
            console.error("[draft_spreadsheet.repersist_reused_timing] failed", {
              draftId: options.draftId,
              error,
            });
          }
        }

        return {
          kind: "prepared",
          resolution: "reused",
          spreadsheetId: existingDraftPrewarm.spreadsheetId,
          companyFolderId: resolvedCompanyFolderId,
          activeSheetName,
          activeSheetId: validation.activeSheet.sheetId,
          sheetLink: buildSpreadsheetSheetLink(
            existingDraftPrewarm.spreadsheetId,
            validation.activeSheet.sheetId
          ),
          prewarmStatus: "ready",
          prewarmReused: true,
          prewarmStructureSignature: options.hint.structureSignature,
          summary: buildPrewarmSummary(persisted.state, persisted.updatedAt),
          stateSnapshot: persisted.state,
          structuralMutation,
          timing: finalTiming,
        };
      }

      if (!validation || validation.missingBundleSheets.length > 0) {
        encounteredIncompleteBundle = true;
        knownInvalidReadySpreadsheetId = existingDraftPrewarm.spreadsheetId;
      }
    }

    const shouldTrashPrevious =
      existingDraftPrewarm?.spreadsheetId &&
      existingDraftPrewarm.status !== "finalized";

    if (encounteredIncompleteBundle) {
      rebuildResolution = "after_incomplete";
    } else if (encounteredBusyLease) {
      rebuildResolution = "after_busy";
    } else if (existingDraftPrewarm?.status === "failed") {
      rebuildResolution = "after_failed";
    } else if (shouldTrashPrevious) {
      rebuildResolution = "after_stale";
    }

    if (shouldTrashPrevious && existingDraftPrewarm?.spreadsheetId) {
      const staleState: DraftGooglePrewarmState = {
        ...existingDraftPrewarm,
        status: "stale",
        lastError: null,
        lastRunTiming: tracker.snapshot(),
      };
      await persistState(staleState, "stale", nowIso);
      await trashPreviousSpreadsheetBestEffort(existingDraftPrewarm.spreadsheetId);
    }

    const preparingState: DraftGooglePrewarmState = {
      ...nextState,
      status: "preparing",
      spreadsheetId: null,
    };
    await persistState(preparingState, "preparing", nowIso);

    await renewLease();
    const createdSpreadsheet = await createSpreadsheetFile(
      options.hint.provisionalName,
      resolvedCompanyFolderId
    );
    createdSpreadsheetId = createdSpreadsheet.fileId;
    tracker.mark("spreadsheet.create_provisional_file");
    options.onStep?.("prewarm.spreadsheet.create_provisional_file");

    if (requiredDraftSheetNames.length > 0) {
      await renewLease();
    }

    for (const sheetName of requiredDraftSheetNames) {
      await copySheetToSpreadsheet(
        options.masterTemplateId,
        sheetName,
        createdSpreadsheet.fileId,
        sheetName
      );
    }

    if (requiredDraftSheetNames.length > 1) {
      await renewLease();
    }
    tracker.mark("spreadsheet.copy_bundle");
    options.onStep?.("prewarm.spreadsheet.copy_bundle");

    await renewLease();
    await clearProtectedRanges(createdSpreadsheet.fileId);

    if (hasStructuralOperations(structuralMutation)) {
      await renewLease();
      await applyFormSheetMutation(createdSpreadsheet.fileId, structuralMutation, {
        onStep: options.onStep,
      });
      await renewLease();
    }
    tracker.mark("spreadsheet.apply_structural_mutation");
    options.onStep?.("prewarm.spreadsheet.apply_structural_mutation");

    await renewLease();
    const destinationSheets = await listSheets(createdSpreadsheet.fileId);
    const validation = getBundleValidation(destinationSheets, {
      activeSheetName,
      bundleSheetNames,
      supportSheetNames,
    });

    if (!validation.activeSheet || validation.missingBundleSheets.length > 0) {
      throw new Error(
        `El spreadsheet provisional no quedo completo. Faltan hojas: ${validation.missingBundleSheets.join(", ") || activeSheetName}.`
      );
    }

    const visibleSheets = await hideSheets(createdSpreadsheet.fileId, bundleSheetNames);
    tracker.mark("spreadsheet.hide_unused_sheets");
    options.onStep?.("prewarm.spreadsheet.hide_unused_sheets");
    const activeSheetId =
      visibleSheets.get(validation.activeSheet.title) ?? validation.activeSheet.sheetId;

    const timingBeforePersist = tracker.snapshot();
    const readyState: DraftGooglePrewarmState = {
      ...nextState,
      spreadsheetId: createdSpreadsheet.fileId,
      activeSheetName,
      bundleSheetNames,
      lastError: null,
      lastRunTiming: timingBeforePersist,
      lastSuccessfulTiming: timingBeforePersist,
    };
    const initialPersisted = await persistState(readyState, "ready", nowIso);
    tracker.mark("draft.persist_prewarm_state");
    options.onStep?.("prewarm.draft.persist_prewarm_state");
    const finalTiming = tracker.finish();
    let persisted = initialPersisted;

    if (options.supabase && options.userId && options.draftId) {
      try {
        const repersisted = await updateDraftGooglePrewarm({
          supabase: options.supabase,
          draftId: options.draftId,
          userId: options.userId,
          state: {
            ...initialPersisted.state,
            lastRunTiming: finalTiming,
            lastSuccessfulTiming: finalTiming,
          },
          status: "ready",
          updatedAt: initialPersisted.updatedAt,
        });
        if (repersisted) {
          persisted = {
            ...repersisted,
            updatedAt: repersisted.updatedAt ?? initialPersisted.updatedAt,
          };
        }
      } catch (error) {
        console.error("[draft_spreadsheet.repersist_ready_timing] failed", {
          draftId: options.draftId,
          error,
        });
      }
    }

    return {
      kind: "prepared",
      resolution: rebuildResolution,
      spreadsheetId: createdSpreadsheet.fileId,
      companyFolderId: resolvedCompanyFolderId,
      activeSheetName,
      activeSheetId,
      sheetLink: buildSpreadsheetSheetLink(
        createdSpreadsheet.fileId,
        activeSheetId
      ),
      prewarmStatus: shouldTrashPrevious ? "rebuilt" : "ready",
      prewarmReused: false,
      prewarmStructureSignature: options.hint.structureSignature,
      summary: buildPrewarmSummary(persisted.state, persisted.updatedAt),
      stateSnapshot: persisted.state,
      structuralMutation,
      timing: finalTiming,
    };
  } catch (error) {
    let retainedFailureSpreadsheetId = createdSpreadsheetId;

    if (createdSpreadsheetId) {
      try {
        await trashDriveFile(createdSpreadsheetId);
        retainedFailureSpreadsheetId = null;
      } catch (cleanupError) {
        console.error("[draft_spreadsheet.cleanup_failed_preparation] failed", {
          draftId: options.draftId ?? null,
          spreadsheetId: createdSpreadsheetId,
          cleanupError,
        });
      }
    }

    const errorMessage =
      error instanceof Error && error.message.trim()
        ? error.message
        : "No se pudo preparar Google.";
    const failureState: DraftGooglePrewarmState = {
      ...(existingState ?? createEmptyDraftGooglePrewarmState()),
      folderId: companyFolderId,
      spreadsheetId: retainedFailureSpreadsheetId,
      provisionalName: options.hint.provisionalName,
      bundleKey: options.hint.bundleKey,
      structureSignature: options.hint.structureSignature,
      activeSheetName,
      bundleSheetNames,
      attemptCount: (existingState?.attemptCount ?? 0) + 1,
      lastError: errorMessage,
      lastRunTiming: tracker.finish(),
      lastSuccessfulTiming: existingState?.lastSuccessfulTiming ?? null,
      status: "failed",
    };

    try {
      await persistState(failureState, "failed", new Date().toISOString());
    } catch (persistError) {
      console.error("[draft_spreadsheet.persist_failed_state] failed", {
        draftId: options.draftId ?? null,
        requestId: leaseRequestId,
        spreadsheetId: retainedFailureSpreadsheetId,
        persistError,
        rootError: errorMessage,
      });
    }

    throw error;
  } finally {
    if (leaseClaimed && options.supabase && options.draftId) {
      try {
        await releaseDraftGooglePrewarmLease({
          supabase: options.supabase,
          draftId: options.draftId,
          requestId: leaseRequestId,
        });
      } catch (error) {
        console.error("[draft_spreadsheet.release_lease] failed", {
          draftId: options.draftId,
          requestId: leaseRequestId,
          error,
        });
      }
    }
  }
}
