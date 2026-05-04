"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInitialLocalDraftSeed } from "@/hooks/formDraft/useInitialLocalDraftSeed";
import { useLongFormDraftController } from "@/hooks/useLongFormDraftController";
import { buildFormEditorUrl } from "@/lib/forms";
import { focusFieldByNameAfterPaint } from "@/lib/focusField";
import {
  normalizeInvisibleDraftRouteParams,
  setDraftAlias,
} from "@/lib/drafts";
import { isInvisibleDraftPilotEnabled } from "@/lib/drafts/invisibleDraftConfig";
import { resolveInvisibleDraftBootstrapId } from "@/lib/drafts/invisibleDrafts";
import {
  SEGUIMIENTOS_BOOTSTRAP_PROGRESS_STEPS,
  buildSeguimientosDraftData,
  buildSeguimientosHydrationFromDraftData,
  type SeguimientosCaseLoadResponse,
  getSeguimientosStepFromStageId,
  parseSeguimientosDraftData,
  type SeguimientosBootstrapProgressStep,
  type SeguimientosBaseStageSaveResponse,
  type SeguimientosBootstrapResponse,
  type SeguimientosCaseHydration,
  type SeguimientosDraftData,
  type SeguimientosEmpresaAssignmentResolution,
  type SeguimientosOverrideGrant,
  type SeguimientosOverrideGrantWithExpiry,
  type SeguimientosPdfExportResponse,
  type SeguimientosResultRefreshResponse,
  type SeguimientosStageOverrideResponse,
  type SeguimientosStagesSaveResponse,
} from "@/lib/seguimientosRuntime";
import type {
  SeguimientosAutoSeededFirstAsistente,
  SeguimientosBaseValues,
  SeguimientosCompanyType,
  SeguimientosEditableStageId,
  SeguimientosFollowupIndex,
  SeguimientosFollowupValues,
  SeguimientosStageDraftState,
  SeguimientosStageId,
} from "@/lib/seguimientos";
import {
  buildSeguimientosFollowupStageId,
  createEmptySeguimientosStageDraftState,
  normalizeSeguimientosBaseValues,
  normalizeSeguimientosFollowupValues,
  SEGUIMIENTOS_BASE_STAGE_ID,
  SEGUIMIENTOS_FINAL_STAGE_ID,
  parseSeguimientosFollowupStageId,
} from "@/lib/seguimientos";
import {
  buildSeguimientosBaseProgress,
  buildSeguimientosWorkflow,
  isSeguimientosBaseConfirmable,
  syncBaseTimelineWithFollowup,
  type SeguimientosWorkflow,
} from "@/lib/seguimientosStages";
import {
  buildSeguimientosModifiedFieldIdsByStageId,
  listSeguimientosDirtyStageIds,
  mergeSeguimientosBaseTimelineFromFollowups,
} from "@/lib/seguimientosStageState";
import {
  commitHydrationStateWithRef,
  resetLastCommittedUpdatedAtRef,
  resolveExpectedCaseUpdatedAt,
} from "@/hooks/seguimientosCaseStateSync";

export {
  commitHydrationStateWithRef,
  resetLastCommittedUpdatedAtRef,
  resolveExpectedCaseUpdatedAt,
} from "@/hooks/seguimientosCaseStateSync";

type SeguimientosSaveSuccessState = {
  key: number;
  savedStageId: SeguimientosEditableStageId;
  message: string;
  nextStageId: SeguimientosStageId | null;
} | null;

function findNextSeguimientosVisibleStageId(
  workflow: SeguimientosWorkflow,
  stageId: SeguimientosStageId
) {
  const stageIndex = workflow.visibleStageIds.indexOf(stageId as never);
  if (
    stageIndex < 0 ||
    stageIndex >= workflow.visibleStageIds.length - 1
  ) {
    return null;
  }

  return workflow.visibleStageIds[stageIndex + 1] ?? null;
}

function isBaseAlreadyConfirmedInSheets(currentDraftData: SeguimientosDraftData) {
  return isSeguimientosBaseConfirmable(
    buildSeguimientosBaseProgress(currentDraftData.persistedBase)
  );
}

function listLocallyChangedSeguimientosStageIds(
  latestDraftData: SeguimientosDraftData,
  baselineDraftData: SeguimientosDraftData
): SeguimientosEditableStageId[] {
  const stageIds = new Set<SeguimientosEditableStageId>();

  if (JSON.stringify(latestDraftData.base) !== JSON.stringify(baselineDraftData.base)) {
    stageIds.add(SEGUIMIENTOS_BASE_STAGE_ID);
  }

  const followupIndexes = new Set<SeguimientosFollowupIndex>();
  for (const key of [
    ...Object.keys(latestDraftData.followups),
    ...Object.keys(baselineDraftData.followups),
  ]) {
    const followupIndex = Number.parseInt(key, 10) as SeguimientosFollowupIndex;
    if (followupIndex) {
      followupIndexes.add(followupIndex);
    }
  }

  for (const followupIndex of followupIndexes) {
    if (
      JSON.stringify(
        normalizeSeguimientosFollowupValues(
          latestDraftData.followups[followupIndex] ?? {},
          followupIndex
        )
      ) !==
      JSON.stringify(
        normalizeSeguimientosFollowupValues(
          baselineDraftData.followups[followupIndex] ?? {},
          followupIndex
        )
      )
    ) {
      stageIds.add(buildSeguimientosFollowupStageId(followupIndex));
    }
  }

  for (const stageId of [
    ...Object.keys(latestDraftData.stageDraftStateByStageId),
    ...Object.keys(baselineDraftData.stageDraftStateByStageId),
  ] as SeguimientosEditableStageId[]) {
    if (
      JSON.stringify(latestDraftData.stageDraftStateByStageId[stageId]) !==
      JSON.stringify(baselineDraftData.stageDraftStateByStageId[stageId])
    ) {
      stageIds.add(stageId);
    }
  }

  return [...stageIds];
}

function buildSeguimientosSessionRouteKey(sessionId: string) {
  return `seguimientos:${sessionId.trim()}`;
}

function buildSeguimientosOverrideStorageKey(caseId: string) {
  return `reca:seguimientos:override-grants:${caseId.trim()}`;
}

function listSeguimientosUnlockedStageIdsFromOverrideGrants(
  overrideGrantsByStageId: Partial<
    Record<SeguimientosEditableStageId, SeguimientosOverrideGrantState>
  >
) {
  return Object.keys(overrideGrantsByStageId) as SeguimientosEditableStageId[];
}

function readSeguimientosOverrideSessionState(
  caseId: string
): Partial<Record<SeguimientosEditableStageId, SeguimientosOverrideGrantState>> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.sessionStorage.getItem(
      buildSeguimientosOverrideStorageKey(caseId)
    );
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return {};
    }

    return parsed.reduce<
      Partial<Record<SeguimientosEditableStageId, SeguimientosOverrideGrantState>>
    >((accumulator, candidate) => {
      const record = candidate as Record<string, unknown>;
      if (
        !candidate ||
        typeof candidate !== "object" ||
        typeof record.stageId !== "string" ||
        typeof record.token !== "string" ||
        typeof record.expiresAt !== "string"
      ) {
        return accumulator;
      }

      accumulator[record.stageId as SeguimientosEditableStageId] = {
        stageId: record.stageId as SeguimientosEditableStageId,
        token: record.token,
        expiresAt: record.expiresAt,
      };
      return accumulator;
    }, {});
  } catch {
    return {};
  }
}

function writeSeguimientosOverrideSessionState(
  caseId: string,
  overrideGrantsByStageId: Partial<
    Record<SeguimientosEditableStageId, SeguimientosOverrideGrantState>
  >
) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = buildSeguimientosOverrideStorageKey(caseId);
  const grants = Object.values(overrideGrantsByStageId);
  if (grants.length === 0) {
    window.sessionStorage.removeItem(storageKey);
    return;
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(grants));
}

function humanizeSeguimientosFieldPathSegment(segment: string) {
  if (!segment) {
    return segment;
  }

  if (/^\d+$/.test(segment)) {
    return segment;
  }

  return segment.replaceAll("_", " ");
}

function formatSeguimientosServerFieldPath(fieldPath: string) {
  const trimmed = fieldPath.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("baseValues.")) {
    const rest = trimmed.slice("baseValues.".length);
    if (!rest) {
      return "Ficha inicial";
    }

    return `Ficha inicial > ${rest
      .split(".")
      .map(humanizeSeguimientosFieldPathSegment)
      .join(" > ")}`;
  }

  if (trimmed.startsWith("followupValuesByIndex.")) {
    const [, , followupIndex, ...rest] = trimmed.split(".");
    if (!followupIndex) {
      return null;
    }

    const followupLabel = `Seguimiento ${followupIndex}`;
    if (rest.length === 0) {
      return followupLabel;
    }

    return `${followupLabel} > ${rest
      .map(humanizeSeguimientosFieldPathSegment)
      .join(" > ")}`;
  }

  return trimmed
    .split(".")
    .map(humanizeSeguimientosFieldPathSegment)
    .join(" > ");
}

function resolveSeguimientosServerFieldNameForActiveStage(options: {
  activeStageId: SeguimientosStageId | null;
  fieldPath: string | null | undefined;
}) {
  const trimmedFieldPath = options.fieldPath?.trim() ?? "";
  if (!trimmedFieldPath || !options.activeStageId) {
    return null;
  }

  if (
    options.activeStageId === SEGUIMIENTOS_BASE_STAGE_ID &&
    trimmedFieldPath.startsWith("baseValues.")
  ) {
    return trimmedFieldPath.slice("baseValues.".length) || null;
  }

  if (trimmedFieldPath.startsWith("followupValuesByIndex.")) {
    const [, , followupIndexRaw, ...rest] = trimmedFieldPath.split(".");
    const followupIndex = Number.parseInt(followupIndexRaw ?? "", 10);
    if (
      !Number.isInteger(followupIndex) ||
      buildSeguimientosFollowupStageId(
        followupIndex as SeguimientosFollowupIndex
      ) !== options.activeStageId
    ) {
      return null;
    }

    return rest.join(".") || null;
  }

  return null;
}

type CompanyTypeResolutionState = {
  cedula: string;
  context: Record<string, unknown>;
} | null;

type SyncRecoveryState =
  | {
      caseId: string;
      savedStageIds: SeguimientosEditableStageId[];
      message: string;
    }
  | {
      kind: "post_save_checkpoint_failed";
      message: string;
    }
  | null;

function getSyncRecoveryKind(
  state: SyncRecoveryState
): "post_save_checkpoint_failed" | null {
  if (state && "kind" in state && state.kind === "post_save_checkpoint_failed") {
    return state.kind;
  }
  return null;
}

function isPostSaveCheckpointFailed(
  state: SyncRecoveryState
): state is { kind: "post_save_checkpoint_failed"; message: string } {
  return Boolean(state && "kind" in state && state.kind === "post_save_checkpoint_failed");
}

type CaseConflictState = {
  currentCaseUpdatedAt: string | null;
} | null;

type PendingOverrideRequest = {
  reason: "required" | "expired";
  stageIds: SeguimientosEditableStageId[];
} | null;

type SeguimientosOverrideGrantState = SeguimientosOverrideGrantWithExpiry;

function pruneSeguimientosOverrideSessionState(options: {
  workflow: SeguimientosDraftData["workflow"];
  overrideGrantsByStageId: Partial<
    Record<SeguimientosEditableStageId, SeguimientosOverrideGrantState>
  >;
}) {
  const now = Date.now();
  const keepableStageIds = new Set(
    options.workflow.stageStates
      .filter(
        (stageState) =>
          stageState.kind !== "final" &&
          stageState.supportsOverride &&
          stageState.isProtectedByDefault
      )
      .map((stageState) => stageState.stageId as SeguimientosEditableStageId)
  );

  const nextOverrideGrantsByStageId = Object.entries(
    options.overrideGrantsByStageId
  ).reduce<Partial<Record<SeguimientosEditableStageId, SeguimientosOverrideGrantState>>>(
    (accumulator, [stageId, grant]) => {
      if (
        !grant ||
        !keepableStageIds.has(stageId as SeguimientosEditableStageId) ||
        Number.isNaN(Date.parse(grant.expiresAt)) ||
        Date.parse(grant.expiresAt) <= now
      ) {
        return accumulator;
      }

      accumulator[stageId as SeguimientosEditableStageId] = grant;
      return accumulator;
    },
    {}
  );

  const nextOverrideUnlockedStageIds =
    listSeguimientosUnlockedStageIdsFromOverrideGrants(
      nextOverrideGrantsByStageId
    );

  return {
    overrideUnlockedStageIds: nextOverrideUnlockedStageIds,
    overrideGrantsByStageId: nextOverrideGrantsByStageId,
  };
}

function removeSeguimientosOverrideGrantsByStageIds(options: {
  workflow: SeguimientosDraftData["workflow"];
  overrideGrantsByStageId: Partial<
    Record<SeguimientosEditableStageId, SeguimientosOverrideGrantState>
  >;
  stageIds: readonly SeguimientosEditableStageId[];
}) {
  const stageIdsToRemove = new Set(options.stageIds);

  return pruneSeguimientosOverrideSessionState({
    workflow: options.workflow,
    overrideGrantsByStageId: Object.entries(options.overrideGrantsByStageId)
      .filter(
        (entry): entry is [
          SeguimientosEditableStageId,
          SeguimientosOverrideGrantState,
        ] => {
          const [stageId, grant] = entry as [
            SeguimientosEditableStageId,
            SeguimientosOverrideGrantState | undefined,
          ];

          return Boolean(grant) && !stageIdsToRemove.has(stageId);
        }
      )
      .reduce<
        Partial<Record<SeguimientosEditableStageId, SeguimientosOverrideGrantState>>
      >((accumulator, [stageId, grant]) => {
        accumulator[stageId] = grant;
        return accumulator;
      }, {}),
  });
}

function removeSeguimientosPendingOverrideStageIds(
  currentRequest: PendingOverrideRequest,
  stageIds: readonly SeguimientosEditableStageId[]
): PendingOverrideRequest {
  if (!currentRequest) {
    return null;
  }

  const stageIdsToRemove = new Set(stageIds);
  const nextStageIds = currentRequest.stageIds.filter(
    (stageId) => !stageIdsToRemove.has(stageId)
  );

  if (nextStageIds.length === 0) {
    return null;
  }

  return {
    ...currentRequest,
    stageIds: nextStageIds,
  };
}

function normalizeSeguimientosAutoSeededFirstAsistente(
  value: {
    nombre: string;
    cargo: string;
  } | null
): SeguimientosAutoSeededFirstAsistente | null {
  if (!value) {
    return null;
  }

  const nombre = value.nombre.trim() || null;
  const cargo = value.cargo.trim() || null;
  if (!nombre && !cargo) {
    return null;
  }

  return {
    nombre,
    cargo,
    pendingConfirmation: true,
  };
}

export function useSeguimientosCaseState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawDraftParam = searchParams?.get("draft") ?? null;
  const rawSessionParam = searchParams?.get("session") ?? null;
  const routeParams = useMemo(
    () =>
      normalizeInvisibleDraftRouteParams({
        draftParam: rawDraftParam,
        sessionParam: rawSessionParam,
      }),
    [rawDraftParam, rawSessionParam]
  );
  const sessionParam = routeParams.sessionParam?.trim() || null;
  const invisibleDraftPilotEnabled = isInvisibleDraftPilotEnabled("seguimientos");
  const bootstrapDraftId = useMemo(
    () =>
      resolveInvisibleDraftBootstrapId({
        formSlug: "seguimientos",
        draftParam: routeParams.draftParam,
        sessionParam,
      }),
    [routeParams.draftParam, sessionParam]
  );

  const [hydration, setHydration] = useState<SeguimientosCaseHydration | null>(null);
  const [draftData, setDraftData] = useState<SeguimientosDraftData | null>(null);
  const [activeStageId, setActiveStageId] = useState<SeguimientosStageId | null>(null);
  const [restoring, setRestoring] = useState(Boolean(bootstrapDraftId || sessionParam));
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapStepIndex, setBootstrapStepIndex] = useState(0);
  const [baseEditorRevision, setBaseEditorRevision] = useState(0);
  const [savingBaseStage, setSavingBaseStage] = useState(false);
  const [savingFollowupStages, setSavingFollowupStages] = useState(false);
  const [refreshingResultSummary, setRefreshingResultSummary] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [saveSuccessState, setSaveSuccessState] =
    useState<SeguimientosSaveSuccessState>(null);
  const [completionLinks, setCompletionLinks] = useState<{
    sheetLink?: string;
    pdfLink?: string;
  } | null>(null);
  const [syncRecoveryState, setSyncRecoveryState] = useState<SyncRecoveryState>(null);
  const [caseConflictState, setCaseConflictState] =
    useState<CaseConflictState>(null);
  const [pendingOverrideRequest, setPendingOverrideRequest] =
    useState<PendingOverrideRequest>(null);
  const [overrideUnlockedStageIds, setOverrideUnlockedStageIds] = useState<
    SeguimientosEditableStageId[]
  >([]);
  const [overrideGrantsByStageId, setOverrideGrantsByStageId] = useState<
    Partial<Record<SeguimientosEditableStageId, SeguimientosOverrideGrantState>>
  >({});
  const [companyTypeResolution, setCompanyTypeResolution] =
    useState<CompanyTypeResolutionState>(null);
  const [empresaAssignmentResolution, setEmpresaAssignmentResolution] =
    useState<SeguimientosEmpresaAssignmentResolution | null>(null);
  const [reloadingConflictCase, setReloadingConflictCase] = useState(false);
  const bootstrapIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveSuccessKeyRef = useRef(0);
  const lastCommittedUpdatedAtRef = useRef<string | null>(null);
  const currentDraftDataRef = useRef<SeguimientosDraftData | null>(null);

  const draftController = useLongFormDraftController({
    slug: "seguimientos",
    empresa: hydration?.empresaSnapshot ?? null,
    initialDraftId: bootstrapDraftId,
    initialLocalDraftSessionId: sessionParam,
    initialRestoring: Boolean(bootstrapDraftId || sessionParam),
  });
  const {
    activeDraftId,
    localDraftSessionId,
    loadLocal,
    loadDraft,
    clearDraft,
    autosave,
    checkpointDraft,
    loadingDraft,
    hasPendingAutosave,
    hasLocalDirtyChanges,
    localDraftSavedAt,
    draftLifecycleSuspended,
    isReadonlyDraft,
    beginRouteHydration,
    buildDraftStatusProps,
    buildDraftLockBannerProps,
    isRouteHydrated,
    markRouteHydrated,
  } = draftController;
  const isSyncRecoveryBlocked = Boolean(syncRecoveryState);

  const currentDraftData = draftData;
  useEffect(() => {
    currentDraftDataRef.current = currentDraftData;
  }, [currentDraftData]);
  const currentWorkflow = useMemo(() => {
    if (!currentDraftData) {
      return hydration?.workflow ?? null;
    }

    return buildSeguimientosWorkflow({
      companyType: currentDraftData.caseMeta.companyType,
      baseValues: currentDraftData.base,
      persistedBaseValues: currentDraftData.persistedBase,
      followups: currentDraftData.followups,
      persistedFollowups: currentDraftData.persistedFollowups,
      activeStageId: currentDraftData.activeStageId,
      overrideUnlockedStageIds,
    });
  }, [currentDraftData, hydration?.workflow, overrideUnlockedStageIds]);
  const currentActiveStageId =
    currentWorkflow?.activeStageId ??
    currentDraftData?.activeStageId ??
    activeStageId ??
    hydration?.workflow.activeStageId ??
    null;

  const modifiedFieldIdsByStageId = useMemo(() => {
    if (!currentDraftData) {
      return {};
    }

    return buildSeguimientosModifiedFieldIdsByStageId({
      companyType: currentDraftData.caseMeta.companyType,
      currentBaseValues: currentDraftData.base,
      currentFollowupValuesByIndex: currentDraftData.followups,
      persistedBaseValues: currentDraftData.persistedBase,
      persistedFollowupValuesByIndex: currentDraftData.persistedFollowups,
      stageDraftStateByStageId: currentDraftData.stageDraftStateByStageId,
    });
  }, [currentDraftData]);

  const dirtyStageIds = useMemo(
    () => listSeguimientosDirtyStageIds(modifiedFieldIdsByStageId),
    [modifiedFieldIdsByStageId]
  );

  const bootstrapProgressStep: SeguimientosBootstrapProgressStep =
    SEGUIMIENTOS_BOOTSTRAP_PROGRESS_STEPS[bootstrapStepIndex] ??
    SEGUIMIENTOS_BOOTSTRAP_PROGRESS_STEPS[0];

  const stopBootstrapProgress = useCallback(() => {
    if (bootstrapIntervalRef.current) {
      clearInterval(bootstrapIntervalRef.current);
      bootstrapIntervalRef.current = null;
    }
    setBootstrapStepIndex(0);
  }, []);

  const commitOverrideState = useCallback(
    (
      caseId: string,
      nextOverrideState: ReturnType<typeof pruneSeguimientosOverrideSessionState>
    ) => {
      setOverrideUnlockedStageIds(nextOverrideState.overrideUnlockedStageIds);
      setOverrideGrantsByStageId(nextOverrideState.overrideGrantsByStageId);
      writeSeguimientosOverrideSessionState(
        caseId,
        nextOverrideState.overrideGrantsByStageId
      );
    },
    []
  );

  const normalizeDraftBootstrapToSessionRoute = useCallback(() => {
    if (
      !invisibleDraftPilotEnabled ||
      !routeParams.draftParam ||
      !localDraftSessionId.trim()
    ) {
      return;
    }

    const routeKey = buildSeguimientosSessionRouteKey(localDraftSessionId);
    markRouteHydrated(routeKey);
    router.replace(
      buildFormEditorUrl("seguimientos", {
        sessionId: localDraftSessionId,
      }),
      { scroll: false }
    );
  }, [
    invisibleDraftPilotEnabled,
    localDraftSessionId,
    markRouteHydrated,
    routeParams.draftParam,
    router,
  ]);

  const resetToCedulaGate = useCallback(
    async (message: string) => {
      await clearDraft(activeDraftId ?? undefined, {
        sessionId: localDraftSessionId,
      }).catch(() => undefined);
      setHydration(null);
      currentDraftDataRef.current = null;
      setDraftData(null);
      setActiveStageId(null);
      setBaseEditorRevision((current) => current + 1);
      setOverrideUnlockedStageIds([]);
      setOverrideGrantsByStageId({});
      setCompanyTypeResolution(null);
      setEmpresaAssignmentResolution(null);
      setCompletionLinks(null);
      setStatusNotice(null);
      setServerError(message);
      setDraftError(null);
      setSyncRecoveryState(null);
      setCaseConflictState(null);
      resetLastCommittedUpdatedAtRef(lastCommittedUpdatedAtRef);
      markRouteHydrated(null);
      router.replace(buildFormEditorUrl("seguimientos"), { scroll: false });
    },
    [activeDraftId, clearDraft, localDraftSessionId, markRouteHydrated, router]
  );

  const fetchCaseHydration = useCallback(async (caseId: string) => {
    const response = await fetch(`/api/seguimientos/case/${caseId}`);
    return (await response.json()) as SeguimientosCaseLoadResponse;
  }, []);

  const buildMergedDraftDataFromHydration = useCallback(
    (options: {
      nextHydration: SeguimientosCaseHydration;
      nextActiveStageId?: SeguimientosStageId | null;
      preserveLocalStageIds?: readonly SeguimientosEditableStageId[];
    }) => {
      const nextDraftData = buildSeguimientosDraftData(options.nextHydration, {
        activeStageId:
          options.nextActiveStageId ?? options.nextHydration.workflow.activeStageId,
      });

      const localDraftData = currentDraftDataRef.current ?? currentDraftData;

      if (!localDraftData || !options.preserveLocalStageIds?.length) {
        return nextDraftData;
      }

      const preserveLocalStageIds = new Set(options.preserveLocalStageIds);
      let nextBase = nextDraftData.base;
      const nextFollowups = { ...nextDraftData.followups };
      const nextStageDraftStateByStageId = {
        ...nextDraftData.stageDraftStateByStageId,
      };

      for (const stageId of preserveLocalStageIds) {
        if (stageId === SEGUIMIENTOS_BASE_STAGE_ID) {
          nextBase = localDraftData.base;
        } else {
          const followupIndex = parseSeguimientosFollowupStageId(stageId);
          if (!followupIndex) {
            continue;
          }

          nextFollowups[followupIndex] =
            localDraftData.followups[followupIndex] ?? nextFollowups[followupIndex];
        }

        const nextStageDraftState =
          nextStageDraftStateByStageId[stageId] ??
          createEmptySeguimientosStageDraftState();
        const currentStageDraftState =
          localDraftData.stageDraftStateByStageId[stageId] ??
          createEmptySeguimientosStageDraftState();

        nextStageDraftStateByStageId[stageId] = {
          ...nextStageDraftState,
          ...currentStageDraftState,
        } satisfies SeguimientosStageDraftState;
      }

      for (const [stageId, currentStageDraftState] of Object.entries(
        localDraftData.stageDraftStateByStageId
      ) as Array<[SeguimientosEditableStageId, SeguimientosStageDraftState]>) {
        if (!currentStageDraftState.failedVisitAppliedAt) {
          continue;
        }

        const nextStageDraftState =
          nextStageDraftStateByStageId[stageId] ??
          createEmptySeguimientosStageDraftState();
        nextStageDraftStateByStageId[stageId] = {
          ...nextStageDraftState,
          failedVisitAppliedAt:
            nextStageDraftState.failedVisitAppliedAt ??
            currentStageDraftState.failedVisitAppliedAt,
        };
      }

      for (const [stageId, currentStageDraftState] of Object.entries(
        localDraftData.stageDraftStateByStageId
      ) as Array<[SeguimientosEditableStageId, SeguimientosStageDraftState]>) {
        const autoSeededFirstAsistente =
          currentStageDraftState.autoSeededFirstAsistente;
        if (!autoSeededFirstAsistente?.pendingConfirmation) {
          continue;
        }

        const followupIndex = parseSeguimientosFollowupStageId(stageId);
        if (!followupIndex) {
          continue;
        }

        const persistedFirstAsistente =
          nextDraftData.persistedFollowups[followupIndex]?.asistentes?.[0] ?? null;
        const persistedNombre = String(persistedFirstAsistente?.nombre ?? "").trim();
        const persistedCargo = String(persistedFirstAsistente?.cargo ?? "").trim();
        const shouldCarryAutoSeededBaseline =
          (Boolean(autoSeededFirstAsistente.nombre) && !persistedNombre) ||
          (Boolean(autoSeededFirstAsistente.cargo) && !persistedCargo);

        if (!shouldCarryAutoSeededBaseline) {
          continue;
        }

        nextFollowups[followupIndex] =
          localDraftData.followups[followupIndex] ?? nextFollowups[followupIndex];

        const nextStageDraftState =
          nextStageDraftStateByStageId[stageId] ??
          createEmptySeguimientosStageDraftState();
        nextStageDraftStateByStageId[stageId] = {
          ...nextStageDraftState,
          autoSeededFirstAsistente,
        };
      }

      nextBase = mergeSeguimientosBaseTimelineFromFollowups({
        baseValues: nextBase,
        followupValuesByIndex: nextFollowups,
        companyType: nextDraftData.caseMeta.companyType,
      });

      const workflow = buildSeguimientosWorkflow({
        companyType: nextDraftData.caseMeta.companyType,
        baseValues: nextBase,
        persistedBaseValues: nextDraftData.persistedBase,
        followups: nextFollowups,
        persistedFollowups: nextDraftData.persistedFollowups,
        activeStageId: nextDraftData.activeStageId,
      });

      return {
        ...nextDraftData,
        activeStageId: workflow.activeStageId,
        workflow,
        base: nextBase,
        followups: nextFollowups,
        stageDraftStateByStageId: nextStageDraftStateByStageId,
      } satisfies SeguimientosDraftData;
    },
    [currentDraftData]
  );

  const applyHydrationState = useCallback(
    (
      nextHydration: SeguimientosCaseHydration,
      options?: {
        nextActiveStageId?: SeguimientosStageId | null;
        preserveLocalStageIds?: readonly SeguimientosEditableStageId[];
      }
    ) => {
      const nextDraftData = buildMergedDraftDataFromHydration({
        nextHydration,
        nextActiveStageId: options?.nextActiveStageId,
        preserveLocalStageIds: options?.preserveLocalStageIds,
      });
      const restoredOverrideGrantsByStageId =
        readSeguimientosOverrideSessionState(nextDraftData.caseMeta.caseId);
      const currentCaseId =
        currentDraftData?.caseMeta.caseId ?? hydration?.caseMeta.caseId ?? null;
      const currentOverrideGrantsByStageId =
        currentCaseId === nextDraftData.caseMeta.caseId
          ? overrideGrantsByStageId
          : {};

      setHydration(nextHydration);
      commitHydrationStateWithRef(nextHydration, lastCommittedUpdatedAtRef);
      currentDraftDataRef.current = nextDraftData;
      setDraftData(nextDraftData);
      setActiveStageId(nextDraftData.activeStageId);
      setBaseEditorRevision((current) => current + 1);
      const nextOverrideState = pruneSeguimientosOverrideSessionState({
        workflow: nextDraftData.workflow,
        overrideGrantsByStageId: {
          ...restoredOverrideGrantsByStageId,
          ...currentOverrideGrantsByStageId,
        },
      });
      commitOverrideState(nextDraftData.caseMeta.caseId, nextOverrideState);
      setCompanyTypeResolution(null);
      setEmpresaAssignmentResolution(null);
      setDraftError(null);
      setSyncRecoveryState(null);
      setCaseConflictState(null);

      return nextDraftData;
    },
    [
      buildMergedDraftDataFromHydration,
      commitOverrideState,
      currentDraftData?.caseMeta.caseId,
      hydration?.caseMeta.caseId,
      overrideGrantsByStageId,
    ]
  );

  const orderStageIdsByWorkflow = useCallback(
    (
      stageIds: readonly SeguimientosEditableStageId[],
      sourceWorkflow: SeguimientosWorkflow
    ) => {
      const uniqueStageIds = [...new Set(stageIds)];
      const orderedStageIds = sourceWorkflow.stageStates
        .filter((stageState) => stageState.kind !== "final")
        .map((stageState) => stageState.stageId as SeguimientosEditableStageId)
        .filter((stageId) => uniqueStageIds.includes(stageId));

      return [
        ...orderedStageIds,
        ...uniqueStageIds.filter((stageId) => !orderedStageIds.includes(stageId)),
      ];
    },
    []
  );

  const describeStageIds = useCallback(
    (
      stageIds: readonly SeguimientosEditableStageId[],
      sourceWorkflow: SeguimientosWorkflow
    ) => {
      const labels = orderStageIdsByWorkflow(stageIds, sourceWorkflow)
        .map(
          (stageId) =>
            sourceWorkflow.stageStates.find(
              (stageState) => stageState.stageId === stageId
            )?.label ?? stageId
        )
        .filter(Boolean);

      return labels.join(", ");
    },
    [orderStageIdsByWorkflow]
  );

  const dismissSaveSuccessState = useCallback(() => {
    setSaveSuccessState(null);
  }, []);

  const buildSaveSuccessState = useCallback(
    (options: {
      corrected: boolean;
      savedStageIds: readonly SeguimientosEditableStageId[];
      savedStageId: SeguimientosEditableStageId;
      workflow: SeguimientosWorkflow;
    }) => {
      const nextStageId = findNextSeguimientosVisibleStageId(
        options.workflow,
        options.savedStageId
      );
      const describedStageIds = describeStageIds(
        options.savedStageIds,
        options.workflow
      );

      let message = options.corrected
        ? `Correccion guardada en Google Sheets: ${describedStageIds}.`
        : `Cambios guardados en Google Sheets: ${describedStageIds}.`;

      if (options.savedStageIds.length === 1) {
        if (options.savedStageId === SEGUIMIENTOS_BASE_STAGE_ID) {
          message = options.corrected
            ? "Correccion de la ficha inicial guardada en Google Sheets."
            : "Ficha inicial guardada en Google Sheets.";
        } else if (!options.corrected) {
          message = `${describedStageIds} guardado en Google Sheets.`;
        }
      }

      saveSuccessKeyRef.current += 1;

      return {
        key: saveSuccessKeyRef.current,
        savedStageId: options.savedStageId,
        message,
        nextStageId,
      } satisfies NonNullable<SeguimientosSaveSuccessState>;
    },
    [describeStageIds]
  );

  const syncHydrationToDraft = useCallback(
    (
      nextHydration: SeguimientosCaseHydration,
      nextActiveStageId?: SeguimientosStageId | null,
      preserveLocalStageIds?: readonly SeguimientosEditableStageId[]
    ) => {
      applyHydrationState(nextHydration, {
        nextActiveStageId,
        preserveLocalStageIds,
      });
      setPendingOverrideRequest(null);
      setServerError(null);
      setSaveSuccessState(null);
    },
    [applyHydrationState]
  );

  const handleSaveValidationError = useCallback(
    (options: {
      message: string;
      code?: string;
      missingOverrideStageIds?: SeguimientosEditableStageId[];
      expiredOverrideStageIds?: SeguimientosEditableStageId[];
      currentCaseUpdatedAt?: string | null;
      fieldPath?: string | null;
      activeStageId: SeguimientosStageId | null;
    }) => {
      const missingOverrideStageIds = options.missingOverrideStageIds ?? [];
      const expiredOverrideStageIds = options.expiredOverrideStageIds ?? [];

      if (options.code === "case_conflict") {
        setPendingOverrideRequest(null);
        setCaseConflictState({
          currentCaseUpdatedAt: options.currentCaseUpdatedAt ?? null,
        });
        setServerError(
          "Este caso cambio en otra pestaña o sesion. Recargalo antes de guardar."
        );
        return;
      }

      if (
        (options.code === "override_required" ||
          options.code === "override_expired") &&
        currentWorkflow &&
        (missingOverrideStageIds.length > 0 ||
          expiredOverrideStageIds.length > 0)
      ) {
        const orderedMissingStageIds = orderStageIdsByWorkflow(
          missingOverrideStageIds,
          currentWorkflow
        );
        const orderedExpiredStageIds = orderStageIdsByWorkflow(
          expiredOverrideStageIds,
          currentWorkflow
        );

        setPendingOverrideRequest({
          reason:
            options.code === "override_expired" ? "expired" : "required",
          stageIds: orderStageIdsByWorkflow(
            [...orderedExpiredStageIds, ...orderedMissingStageIds],
            currentWorkflow
          ),
        });

        if (options.code === "override_expired" && orderedExpiredStageIds.length > 0) {
          setServerError(
            orderedMissingStageIds.length > 0
              ? `El desbloqueo de ${describeStageIds(
                  orderedExpiredStageIds,
                  currentWorkflow
                )} vencio. Tambien debes desbloquear: ${describeStageIds(
                  orderedMissingStageIds,
                  currentWorkflow
                )}.`
              : `El desbloqueo de ${describeStageIds(
                  orderedExpiredStageIds,
                  currentWorkflow
                )} vencio. Debes renovarlo para guardar.`
          );
          return;
        }

        setCaseConflictState(null);
        setServerError(
          `Para guardar primero debes desbloquear: ${describeStageIds(
            orderedMissingStageIds,
            currentWorkflow
          )}.`
        );
        return;
      }

      setPendingOverrideRequest(null);
      setCaseConflictState(null);

      const targetFieldName = resolveSeguimientosServerFieldNameForActiveStage({
        activeStageId: options.activeStageId,
        fieldPath: options.fieldPath,
      });
      const formattedFieldPath = options.fieldPath
        ? formatSeguimientosServerFieldPath(options.fieldPath)
        : null;

      setServerError(
        formattedFieldPath
          ? `${options.message} Campo: ${formattedFieldPath}.`
          : options.message
      );

      if (!targetFieldName) {
        return;
      }

      focusFieldByNameAfterPaint(
        targetFieldName,
        { scroll: true, behavior: "smooth", block: "center" },
        4
      );
    },
    [currentWorkflow, describeStageIds, orderStageIdsByWorkflow]
  );

  const restoreFromDraftData = useCallback((draftData: SeguimientosDraftData) => {
    const nextHydration = buildSeguimientosHydrationFromDraftData(draftData);
    const nextOverrideState = pruneSeguimientosOverrideSessionState({
      workflow: draftData.workflow,
      overrideGrantsByStageId: readSeguimientosOverrideSessionState(
        draftData.caseMeta.caseId
      ),
    });
    setHydration(nextHydration);
    currentDraftDataRef.current = draftData;
    setDraftData(draftData);
    setActiveStageId(draftData.activeStageId);
    setBaseEditorRevision((current) => current + 1);
    commitOverrideState(draftData.caseMeta.caseId, nextOverrideState);
    setCompanyTypeResolution(null);
    setEmpresaAssignmentResolution(null);
    setServerError(null);
    setPendingOverrideRequest(null);
    setDraftError(null);
    setStatusNotice(null);
    setSaveSuccessState(null);
    setCompletionLinks(null);
    setSyncRecoveryState(null);
    resetLastCommittedUpdatedAtRef(lastCommittedUpdatedAtRef);
  }, [commitOverrideState]);

  const prepareCase = useCallback(
    async (cedula: string, companyTypeOverride?: SeguimientosCompanyType) => {
      stopBootstrapProgress();
      setBootstrapStepIndex(0);
      setBootstrapping(true);
      setServerError(null);
      setDraftError(null);
      setCompanyTypeResolution(null);
      setEmpresaAssignmentResolution(null);
      setSyncRecoveryState(null);
      bootstrapIntervalRef.current = setInterval(() => {
        setBootstrapStepIndex((current) =>
          Math.min(current + 1, SEGUIMIENTOS_BOOTSTRAP_PROGRESS_STEPS.length - 1)
        );
      }, 350);

      try {
        const response = await fetch("/api/seguimientos/case/bootstrap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cedula,
            companyTypeOverride,
          }),
        });

        const payload = (await response.json()) as SeguimientosBootstrapResponse;
        if (payload.status === "ready") {
          syncHydrationToDraft(
            payload.hydration,
            payload.hydration.workflow.activeStageId
          );
          setStatusNotice(null);
          setCompletionLinks(null);
          return true;
        }

        if (payload.status === "requires_empresa_assignment") {
          setEmpresaAssignmentResolution({
            kind: "new",
            cedula: payload.cedula,
            nombreVinculado: payload.nombreVinculado,
            initialNit: payload.initialNit ?? null,
            ...(payload.message ? { message: payload.message } : {}),
          });
          return false;
        }

        if (payload.status === "requires_disambiguation") {
          setEmpresaAssignmentResolution({
            kind: "disambiguate",
            cedula: payload.cedula,
            nombreVinculado: payload.nombreVinculado,
            nit: payload.nit,
            options: payload.options,
            preselected:
              payload.options.find(
                (option) => option.id === payload.preselectedEmpresaId
              ) ?? null,
          });
          return false;
        }

        if (
          payload.status === "resolution_required" &&
          payload.reason === "company_type"
        ) {
          setCompanyTypeResolution({
            cedula,
            context: payload.context,
          });
          return false;
        }

        if (payload.status === "resolution_required") {
          setServerError(
            payload.reason === "case_conflict"
              ? "El caso ya existe, pero los datos actuales de empresa o tipo no coinciden con la metadata persistida."
              : "No fue posible resolver la empresa asociada a la cédula."
          );
          return false;
        }

        setServerError(
          payload.message || "No fue posible preparar el caso de Seguimientos."
        );
        return false;
      } catch (error) {
        setServerError(
          error instanceof Error
            ? error.message
            : "No fue posible preparar el caso de Seguimientos."
        );
        return false;
      } finally {
        stopBootstrapProgress();
        setBootstrapping(false);
      }
    },
    [stopBootstrapProgress, syncHydrationToDraft]
  );

  useEffect(() => {
    let cancelled = false;

    async function restoreRouteState() {
      if (!bootstrapDraftId && !sessionParam) {
        setRestoring(false);
        return;
      }

      setRestoring(true);
      setDraftError(null);
      const routeKey = sessionParam
        ? buildSeguimientosSessionRouteKey(sessionParam)
        : null;

      if (routeKey && isRouteHydrated(routeKey)) {
        setRestoring(false);
        return;
      }

      if (routeKey) {
        beginRouteHydration(routeKey);
      }

      async function validateDraftAccess(caseId: string) {
        try {
          const payload = await fetchCaseHydration(caseId);
          if (
            payload.status === "error" &&
            (payload.code === "case_reclaim_required" ||
              payload.code === "case_access_denied")
          ) {
            if (!cancelled) {
              await resetToCedulaGate(payload.message);
              setRestoring(false);
            }
            return false;
          }
        } catch {
          return true;
        }

        return true;
      }

      const localDraft = sessionParam ? await loadLocal() : null;
      const localDraftData = parseSeguimientosDraftData(localDraft?.data);
      if (cancelled) {
        return;
      }

      if (localDraftData) {
        const canRestoreLocal = await validateDraftAccess(
          localDraftData.caseMeta.caseId
        );
        if (cancelled || !canRestoreLocal) {
          return;
        }
        restoreFromDraftData(localDraftData);
        if (routeKey) {
          markRouteHydrated(routeKey);
        }
        setRestoring(false);
        return;
      }

      if (bootstrapDraftId) {
        const remoteDraft = await loadDraft(bootstrapDraftId);
        if (cancelled) {
          return;
        }

        const remoteDraftData = parseSeguimientosDraftData(remoteDraft.draft?.data);
        if (!remoteDraftData) {
          setDraftError(
            remoteDraft.error ??
              "El borrador solicitado no contiene una snapshot válida del caso."
          );
          setRestoring(false);
          return;
        }

        const canRestoreRemote = await validateDraftAccess(
          remoteDraftData.caseMeta.caseId
        );
        if (cancelled || !canRestoreRemote) {
          return;
        }
        if (invisibleDraftPilotEnabled) {
          setDraftAlias("seguimientos", localDraftSessionId, bootstrapDraftId);
        }
        restoreFromDraftData(remoteDraftData);
        if (routeKey) {
          markRouteHydrated(routeKey);
        }
        setRestoring(false);
        normalizeDraftBootstrapToSessionRoute();
        return;
      }

      setRestoring(false);
    }

    void restoreRouteState();

    return () => {
      cancelled = true;
      stopBootstrapProgress();
    };
  }, [
    beginRouteHydration,
    bootstrapDraftId,
    loadDraft,
    fetchCaseHydration,
    invisibleDraftPilotEnabled,
    isRouteHydrated,
    loadLocal,
    localDraftSessionId,
    markRouteHydrated,
    normalizeDraftBootstrapToSessionRoute,
    resetToCedulaGate,
    restoreFromDraftData,
    sessionParam,
    stopBootstrapProgress,
  ]);

  useEffect(() => {
    if (!hydration || routeParams.draftParam || sessionParam) {
      return;
    }

    const nextSessionId = localDraftSessionId.trim();
    if (!nextSessionId) {
      return;
    }

    markRouteHydrated(buildSeguimientosSessionRouteKey(nextSessionId));
    router.replace(
      buildFormEditorUrl("seguimientos", {
        sessionId: nextSessionId,
      }),
      { scroll: false }
    );
  }, [
    localDraftSessionId,
    hydration,
    markRouteHydrated,
    routeParams.draftParam,
    router,
    sessionParam,
  ]);

  useInitialLocalDraftSeed({
    enabled:
      Boolean(currentDraftData) &&
      !restoring &&
      !loadingDraft &&
      !draftLifecycleSuspended &&
      !isReadonlyDraft,
    hydrationSettled: Boolean(currentDraftData) && !restoring,
    seedKey: currentDraftData
      ? `${activeDraftId ?? localDraftSessionId}:${currentDraftData.caseMeta.caseId}`
      : null,
    step: getSeguimientosStepFromStageId(
      currentDraftData?.activeStageId ?? hydration?.workflow.activeStageId ?? "base_process"
    ),
    getValues: () => (currentDraftData ?? {}) as Record<string, unknown>,
    autosave,
    localDraftSavedAt,
    hasPendingAutosave,
    hasLocalDirtyChanges,
  });

  const promoteDraftRoute = useCallback(
    (draftId: string | null | undefined) => {
      if (!draftId) {
        return;
      }

      if (invisibleDraftPilotEnabled) {
        setDraftAlias("seguimientos", localDraftSessionId, draftId);
        normalizeDraftBootstrapToSessionRoute();

        if (!sessionParam && localDraftSessionId.trim()) {
          const routeKey = buildSeguimientosSessionRouteKey(localDraftSessionId);
          markRouteHydrated(routeKey);
          router.replace(
            buildFormEditorUrl("seguimientos", {
              sessionId: localDraftSessionId,
            }),
            { scroll: false }
          );
        }
        return;
      }

      if (routeParams.draftParam === draftId) {
        return;
      }

      router.replace(
        buildFormEditorUrl("seguimientos", {
          draftId,
          sessionId: localDraftSessionId,
        }),
        { scroll: false }
      );
    },
    [
      invisibleDraftPilotEnabled,
      localDraftSessionId,
      markRouteHydrated,
      normalizeDraftBootstrapToSessionRoute,
      routeParams.draftParam,
      router,
      sessionParam,
    ]
  );

  const checkpointCurrentDraftData = useCallback(
    async (nextDraftData: SeguimientosDraftData) => {
      const checkpointResult = await checkpointDraft(
        getSeguimientosStepFromStageId(nextDraftData.activeStageId),
        nextDraftData as unknown as Record<string, unknown>,
        "manual"
      );

      if (checkpointResult.ok) {
        promoteDraftRoute(checkpointResult.draftId);
      }

      return checkpointResult;
    },
    [checkpointDraft, promoteDraftRoute]
  );

  const buildNextDraftData = useCallback(
    (options: {
      base?: SeguimientosBaseValues;
      followups?: Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>;
      activeStageId?: SeguimientosStageId;
    }) => {
      if (!currentDraftData) {
        return null;
      }

      const nextWorkflow = buildSeguimientosWorkflow({
        companyType: currentDraftData.caseMeta.companyType,
        baseValues: options.base ?? currentDraftData.base,
        persistedBaseValues: currentDraftData.persistedBase,
        followups: options.followups ?? currentDraftData.followups,
        persistedFollowups: currentDraftData.persistedFollowups,
        activeStageId: options.activeStageId ?? currentDraftData.activeStageId,
      });

      return {
        ...currentDraftData,
        activeStageId: nextWorkflow.activeStageId,
        workflow: nextWorkflow,
        base: options.base ?? currentDraftData.base,
        followups: options.followups ?? currentDraftData.followups,
      } satisfies SeguimientosDraftData;
    },
    [currentDraftData]
  );

  const commitLocalDraftData = useCallback(
    (nextDraftData: SeguimientosDraftData) => {
      currentDraftDataRef.current = nextDraftData;
      setDraftData(nextDraftData);
      setActiveStageId(nextDraftData.activeStageId);
      autosave(
        getSeguimientosStepFromStageId(nextDraftData.activeStageId),
        nextDraftData as unknown as Record<string, unknown>
      );
    },
    [autosave]
  );

  const updateStageDraftState = useCallback(
    (
      stageId: SeguimientosEditableStageId,
      updater: (currentStageDraftState: SeguimientosStageDraftState) => SeguimientosStageDraftState
    ) => {
      if (!currentDraftData) {
        return;
      }

      const currentStageDraftState =
        currentDraftData.stageDraftStateByStageId[stageId] ??
        createEmptySeguimientosStageDraftState();
      const nextStageDraftState = updater(currentStageDraftState);

      if (
        JSON.stringify(nextStageDraftState) === JSON.stringify(currentStageDraftState)
      ) {
        return;
      }

      const nextDraftData = {
        ...currentDraftData,
        stageDraftStateByStageId: {
          ...currentDraftData.stageDraftStateByStageId,
          [stageId]: nextStageDraftState,
        },
      } satisfies SeguimientosDraftData;

      commitLocalDraftData(nextDraftData);
    },
    [commitLocalDraftData, currentDraftData]
  );

  const handleBaseValuesChange = useCallback(
    (nextBaseValues: SeguimientosBaseValues) => {
      if (!currentDraftData) {
        return;
      }

      const normalizedBase = normalizeSeguimientosBaseValues(
        nextBaseValues,
        currentDraftData.empresaSnapshot
      );
      const nextBaseSnapshot = JSON.stringify(normalizedBase);
      if (nextBaseSnapshot === JSON.stringify(currentDraftData.base)) {
        return;
      }

      const nextDraftData = buildNextDraftData({
        base: normalizedBase,
      });
      if (!nextDraftData) {
        return;
      }

      commitLocalDraftData(nextDraftData);
    },
    [buildNextDraftData, commitLocalDraftData, currentDraftData]
  );

  const handleFollowupValuesChange = useCallback(
    (
      followupIndex: SeguimientosFollowupIndex,
      nextFollowupValues: SeguimientosFollowupValues
    ) => {
      if (!currentDraftData) {
        return;
      }

      const normalizedFollowupValues = normalizeSeguimientosFollowupValues(
        nextFollowupValues,
        followupIndex
      );
      const currentFollowupValues = normalizeSeguimientosFollowupValues(
        currentDraftData.followups[followupIndex] ?? {},
        followupIndex
      );

      if (
        JSON.stringify(normalizedFollowupValues) ===
        JSON.stringify(currentFollowupValues)
      ) {
        return;
      }

      const nextFollowups = {
        ...currentDraftData.followups,
        [followupIndex]: normalizedFollowupValues,
      } satisfies Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>;
      const nextBaseValues = syncBaseTimelineWithFollowup(
        currentDraftData.base,
        followupIndex,
        normalizedFollowupValues
      );
      const nextDraftData = buildNextDraftData({
        base: nextBaseValues,
        followups: nextFollowups,
      });
      if (!nextDraftData) {
        return;
      }

      commitLocalDraftData(nextDraftData);
    },
    [buildNextDraftData, commitLocalDraftData, currentDraftData]
  );

  const handleFailedVisitApplied = useCallback(
    (
      followupIndex: SeguimientosFollowupIndex,
      nextFollowupValues: SeguimientosFollowupValues
    ) => {
      if (!currentDraftData) {
        return;
      }

      const stageId = buildSeguimientosFollowupStageId(followupIndex);
      const normalizedFollowupValues = normalizeSeguimientosFollowupValues(
        nextFollowupValues,
        followupIndex
      );
      const nextFollowups = {
        ...currentDraftData.followups,
        [followupIndex]: normalizedFollowupValues,
      } satisfies Partial<
        Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
      >;
      const nextBaseValues = syncBaseTimelineWithFollowup(
        currentDraftData.base,
        followupIndex,
        normalizedFollowupValues
      );
      const nextDraftData = buildNextDraftData({
        base: nextBaseValues,
        followups: nextFollowups,
      });
      if (!nextDraftData) {
        return;
      }

      const nextDraftDataWithFailedVisitFlag = {
        ...nextDraftData,
        stageDraftStateByStageId: {
          ...nextDraftData.stageDraftStateByStageId,
          [stageId]: {
            ...(nextDraftData.stageDraftStateByStageId[stageId] ??
              createEmptySeguimientosStageDraftState()),
            failedVisitAppliedAt: new Date().toISOString(),
          },
        },
      } satisfies SeguimientosDraftData;

      commitLocalDraftData(nextDraftDataWithFailedVisitFlag);
    },
    [buildNextDraftData, commitLocalDraftData, currentDraftData]
  );

  const handleAutoSeededFirstAsistente = useCallback(
    (
      followupIndex: SeguimientosFollowupIndex,
      values: {
        nombre: string;
        cargo: string;
      }
    ) => {
      const stageId = buildSeguimientosFollowupStageId(followupIndex);
      const normalizedBaseline =
        normalizeSeguimientosAutoSeededFirstAsistente(values);

      updateStageDraftState(stageId, (currentStageDraftState) => {
        if (!normalizedBaseline) {
          return {
            ...currentStageDraftState,
            autoSeededFirstAsistente: null,
          };
        }

        const currentBaseline = currentStageDraftState.autoSeededFirstAsistente;
        if (
          currentBaseline?.pendingConfirmation &&
          currentBaseline.nombre === normalizedBaseline.nombre &&
          currentBaseline.cargo === normalizedBaseline.cargo
        ) {
          return currentStageDraftState;
        }

        return {
          ...currentStageDraftState,
          autoSeededFirstAsistente: normalizedBaseline,
        };
      });
    },
    [updateStageDraftState]
  );

  const handleFollowupFirstAsistenteManualEdit = useCallback(
    (followupIndex: SeguimientosFollowupIndex) => {
      const stageId = buildSeguimientosFollowupStageId(followupIndex);
      updateStageDraftState(stageId, (currentStageDraftState) => {
        const currentBaseline = currentStageDraftState.autoSeededFirstAsistente;
        if (!currentBaseline?.pendingConfirmation) {
          return currentStageDraftState;
        }

        return {
          ...currentStageDraftState,
          autoSeededFirstAsistente: {
            ...currentBaseline,
            pendingConfirmation: false,
          },
        };
      });
    },
    [updateStageDraftState]
  );

  const handleStageSelect = useCallback(
    (nextStageId: string) => {
      if (
        !currentDraftData ||
        isSyncRecoveryBlocked ||
        nextStageId === currentActiveStageId
      ) {
        return;
      }

      const nextDraftData = buildNextDraftData({
        activeStageId: nextStageId as SeguimientosStageId,
      });
      if (!nextDraftData) {
        return;
      }

      commitLocalDraftData(nextDraftData);
    },
    [
      buildNextDraftData,
      commitLocalDraftData,
      currentActiveStageId,
      currentDraftData,
      isSyncRecoveryBlocked,
    ]
  );

  const handleStageOverride = useCallback(
    async (stageIds: SeguimientosEditableStageId[]) => {
      if (!currentDraftData || isReadonlyDraft || isSyncRecoveryBlocked) {
        return false;
      }

      const normalizedStageIds = [...new Set(stageIds)];
      if (normalizedStageIds.length === 0) {
        return false;
      }

      setServerError(null);
      setCaseConflictState(null);
      try {
        const response = await fetch(
          `/api/seguimientos/case/${currentDraftData.caseMeta.caseId}/stages/override`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              stageIds: normalizedStageIds,
            }),
          }
        );
        const payload =
          (await response.json()) as SeguimientosStageOverrideResponse;

        if (!response.ok || payload.status !== "ready") {
          setServerError(
            payload.status === "error"
              ? payload.message
              : "No se pudo autorizar el override de esta etapa."
          );
          return false;
        }

        const grantedStages =
          payload.grants ??
          ("grant" in payload && payload.grant ? [payload.grant] : []);

        const nextOverrideState = pruneSeguimientosOverrideSessionState({
          workflow: currentWorkflow ?? currentDraftData.workflow,
          overrideGrantsByStageId: grantedStages.reduce<
            Partial<Record<SeguimientosEditableStageId, SeguimientosOverrideGrantState>>
          >(
            (accumulator, grant) => ({
              ...accumulator,
              [grant.stageId]: grant,
            }),
            { ...overrideGrantsByStageId }
          ),
        });
        commitOverrideState(currentDraftData.caseMeta.caseId, nextOverrideState);
        setPendingOverrideRequest(null);
        setSaveSuccessState(null);
        setStatusNotice(
          normalizedStageIds.length > 1
            ? "Las etapas quedaron desbloqueadas temporalmente en esta sesion."
            : "La etapa quedo desbloqueada temporalmente en esta sesion."
        );
        const checkpointResult = await checkpointCurrentDraftData(currentDraftData);
        if (!checkpointResult.ok && checkpointResult.error) {
          setServerError(
            `La etapa se desbloqueo, pero no pudimos sincronizar el borrador remoto: ${checkpointResult.error}`
          );
        }
        return true;
      } catch (error) {
        setServerError(
          error instanceof Error
            ? error.message
            : "No se pudo autorizar el override de esta etapa."
        );
        return false;
      }
    },
    [
      currentDraftData,
      currentWorkflow,
      checkpointCurrentDraftData,
      commitOverrideState,
      isReadonlyDraft,
      isSyncRecoveryBlocked,
      overrideGrantsByStageId,
    ]
  );

  const handleStageLock = useCallback(
    async (
      stageId: SeguimientosEditableStageId,
      options?: {
        checkpointDraftData?: SeguimientosDraftData;
        statusNotice?: string;
      }
    ) => {
      if (!currentDraftData || isReadonlyDraft || isSyncRecoveryBlocked) {
        return;
      }

      const nextOverrideState = removeSeguimientosOverrideGrantsByStageIds({
        workflow: currentWorkflow ?? currentDraftData.workflow,
        overrideGrantsByStageId,
        stageIds: [stageId],
      });

      commitOverrideState(currentDraftData.caseMeta.caseId, nextOverrideState);
      setPendingOverrideRequest((currentRequest) =>
        removeSeguimientosPendingOverrideStageIds(currentRequest, [stageId])
      );
      setSaveSuccessState(null);
      setServerError(null);
      const checkpointResult = await checkpointCurrentDraftData(
        options?.checkpointDraftData ?? currentDraftData
      );
      if (!checkpointResult.ok && checkpointResult.error) {
        setServerError(
          `La etapa se bloqueo, pero no pudimos sincronizar el borrador remoto: ${checkpointResult.error}`
        );
      }
      setStatusNotice("La etapa volvió a quedar protegida en esta sesión.");
    },
    [
      checkpointCurrentDraftData,
      commitOverrideState,
      currentDraftData,
      currentWorkflow,
      isReadonlyDraft,
      isSyncRecoveryBlocked,
      overrideGrantsByStageId,
    ]
  );

  const handleStageLockWithDecision = useCallback(
    async (
      stageId: SeguimientosEditableStageId,
      options?: {
        discardChanges?: boolean;
      }
    ) => {
      if (!currentDraftData || isReadonlyDraft || isSyncRecoveryBlocked) {
        return;
      }

      if (!options?.discardChanges) {
        await handleStageLock(stageId);
        return;
      }

      let nextDraftData: SeguimientosDraftData | null = null;

      if (stageId === SEGUIMIENTOS_BASE_STAGE_ID) {
        const nextBase = mergeSeguimientosBaseTimelineFromFollowups({
          baseValues: currentDraftData.persistedBase,
          followupValuesByIndex: currentDraftData.followups,
          companyType: currentDraftData.caseMeta.companyType,
        });
        nextDraftData = buildNextDraftData({
          base: nextBase,
        });
      } else {
        const followupIndex = parseSeguimientosFollowupStageId(stageId);
        if (!followupIndex) {
          return;
        }

        const nextFollowups = {
          ...currentDraftData.followups,
          [followupIndex]:
            currentDraftData.persistedFollowups[followupIndex] ??
            normalizeSeguimientosFollowupValues({}, followupIndex),
        } satisfies Partial<
          Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
        >;
        const nextBase = mergeSeguimientosBaseTimelineFromFollowups({
          baseValues: currentDraftData.base,
          followupValuesByIndex: nextFollowups,
          companyType: currentDraftData.caseMeta.companyType,
        });
        nextDraftData = buildNextDraftData({
          base: nextBase,
          followups: nextFollowups,
        });
      }

      if (!nextDraftData) {
        return;
      }

      nextDraftData = {
        ...nextDraftData,
        stageDraftStateByStageId: {
          ...nextDraftData.stageDraftStateByStageId,
          [stageId]: {
            ...(nextDraftData.stageDraftStateByStageId[stageId] ??
              createEmptySeguimientosStageDraftState()),
            autoSeededFirstAsistente: null,
          },
        },
      } satisfies SeguimientosDraftData;

      commitLocalDraftData(nextDraftData);
      await handleStageLock(stageId, {
        checkpointDraftData: nextDraftData,
      });
      setStatusNotice(
        "Se descartaron los cambios locales y la etapa volvio a quedar protegida."
      );
    },
    [
      buildNextDraftData,
      commitLocalDraftData,
      currentDraftData,
      handleStageLock,
      isReadonlyDraft,
      isSyncRecoveryBlocked,
    ]
  );

  const savableDirtyStageIds = useMemo(() => {
    if (!currentWorkflow) {
      return [] as SeguimientosEditableStageId[];
    }

    const editableStageIds = new Set(
      currentWorkflow.stageStates
        .filter((stageState) => stageState.kind !== "final" && stageState.isEditable)
        .map((stageState) => stageState.stageId as SeguimientosEditableStageId)
    );

    return dirtyStageIds.filter((stageId) => editableStageIds.has(stageId));
  }, [currentWorkflow, dirtyStageIds]);

  const handleSaveDraft = useCallback(async () => {
    if (!currentDraftData || isReadonlyDraft || isSyncRecoveryBlocked) {
      return false;
    }

    const result = await checkpointDraft(
      getSeguimientosStepFromStageId(currentDraftData.activeStageId),
      currentDraftData as unknown as Record<string, unknown>,
      "manual"
    );

    if (result.ok) {
      promoteDraftRoute(result.draftId);
    }

    if (!result.ok && result.error) {
      setServerError(result.error);
    }

    return result.ok;
  }, [
    checkpointDraft,
    currentDraftData,
    isReadonlyDraft,
    isSyncRecoveryBlocked,
    promoteDraftRoute,
  ]);

  const handleSaveBaseStage = useCallback(async (submittedBaseValues?: SeguimientosBaseValues) => {
    if (!currentDraftData || isReadonlyDraft || isSyncRecoveryBlocked) {
      return false;
    }

    if (currentDraftData.activeStageId !== "base_process") {
      setServerError(
        "La ficha inicial solo puede guardarse cuando esa etapa esta activa."
      );
      return false;
    }

    setSavingBaseStage(true);
    setServerError(null);
    setStatusNotice(null);
    setSaveSuccessState(null);
    setCaseConflictState(null);

    try {
      const baseValuesToSave = normalizeSeguimientosBaseValues(
        submittedBaseValues ?? currentDraftData.base,
        currentDraftData.empresaSnapshot
      );
      const response = await fetch(
        `/api/seguimientos/case/${currentDraftData.caseMeta.caseId}/stage/base`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activeStageId: "base_process",
            baseValues: baseValuesToSave,
            overrideGrant: overrideGrantsByStageId.base_process ?? undefined,
            expectedCaseUpdatedAt:
              resolveExpectedCaseUpdatedAt(lastCommittedUpdatedAtRef, currentDraftData),
          }),
        }
      );
      const payload = (await response.json()) as SeguimientosBaseStageSaveResponse;

      if (!response.ok || (payload.status !== "ready" && payload.status !== "written_needs_reload")) {
        if (payload.status === "error") {
          handleSaveValidationError({
            message: payload.message,
            code: payload.code,
            missingOverrideStageIds: payload.missingOverrideStageIds,
            expiredOverrideStageIds: payload.expiredOverrideStageIds,
            currentCaseUpdatedAt: payload.currentCaseUpdatedAt,
            fieldPath: payload.fieldPath,
            activeStageId: SEGUIMIENTOS_BASE_STAGE_ID,
          });
        } else {
          setServerError("No se pudo guardar la ficha inicial.");
        }
        return false;
      }

      if (payload.status === "written_needs_reload") {
        setSyncRecoveryState({
          caseId: currentDraftData.caseMeta.caseId,
          savedStageIds: payload.savedStageIds,
          message: payload.message,
        });
        setSaveSuccessState(null);
        setPendingOverrideRequest(null);
        setServerError(null);
        setStatusNotice(null);
        commitOverrideState(
          currentDraftData.caseMeta.caseId,
          removeSeguimientosOverrideGrantsByStageIds({
            workflow: currentWorkflow ?? currentDraftData.workflow,
            overrideGrantsByStageId,
            stageIds: payload.savedStageIds,
          })
        );
        return true;
      }

      const preservedLocalStageIds = dirtyStageIds.filter(
        (stageId) => stageId !== SEGUIMIENTOS_BASE_STAGE_ID
      );
      const shouldOpenNextStageAfterFirstConfirmation =
        currentDraftData.activeStageId === SEGUIMIENTOS_BASE_STAGE_ID &&
        !isBaseAlreadyConfirmedInSheets(currentDraftData);
      const nextBaseActiveStageId =
        shouldOpenNextStageAfterFirstConfirmation
          ? findNextSeguimientosVisibleStageId(
              payload.hydration.workflow,
              SEGUIMIENTOS_BASE_STAGE_ID
            ) ?? currentDraftData.activeStageId
          : currentDraftData.activeStageId;
      const nextDraftData = applyHydrationState(payload.hydration, {
        nextActiveStageId: nextBaseActiveStageId,
        preserveLocalStageIds: preservedLocalStageIds,
      });
      commitOverrideState(
        currentDraftData.caseMeta.caseId,
        removeSeguimientosOverrideGrantsByStageIds({
          workflow: payload.hydration.workflow,
          overrideGrantsByStageId,
          stageIds: [SEGUIMIENTOS_BASE_STAGE_ID],
        })
      );
      const activeBaseOverrideActive =
        currentWorkflow?.stageStates.find(
          (stageState) => stageState.stageId === currentDraftData.activeStageId
        )?.overrideActive ?? false;
      setPendingOverrideRequest(null);
      setServerError(null);
      const nextSaveSuccessState = buildSaveSuccessState({
        corrected: activeBaseOverrideActive,
        savedStageIds: [SEGUIMIENTOS_BASE_STAGE_ID],
        savedStageId: SEGUIMIENTOS_BASE_STAGE_ID,
        workflow: payload.hydration.workflow,
      });
      setStatusNotice(nextSaveSuccessState.message);
      setSaveSuccessState(nextSaveSuccessState);
      const checkpointResult = await checkpointCurrentDraftData(nextDraftData);

      if (checkpointResult.ok) {
        return true;
      }

      if (checkpointResult.error) {
        setSyncRecoveryState({
          kind: "post_save_checkpoint_failed",
          message:
            "La ficha inicial se guardo en Google Sheets, pero no pudimos sincronizar el estado local. Recarga esta pestaña para continuar (perderas cambios no guardados solo de esta pestaña).",
        });
      }

      return false;
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la ficha inicial."
      );
      return false;
    } finally {
      setSavingBaseStage(false);
    }
  }, [
    applyHydrationState,
    buildSaveSuccessState,
    checkpointCurrentDraftData,
    commitOverrideState,
    currentDraftData,
    currentWorkflow,
    dirtyStageIds,
    handleSaveValidationError,
    isReadonlyDraft,
    isSyncRecoveryBlocked,
    overrideGrantsByStageId,
  ]);

  const handleSaveDirtyStages = useCallback(
    async (submittedFollowupValues?: SeguimientosFollowupValues) => {
      if (
        !currentDraftData ||
        !currentWorkflow ||
        isReadonlyDraft ||
        isSyncRecoveryBlocked
      ) {
        return false;
      }

      if (currentDraftData.activeStageId === SEGUIMIENTOS_FINAL_STAGE_ID) {
        return false;
      }

      const activeEditableStageId = currentDraftData.activeStageId;
      const activeFollowupIndex =
        activeEditableStageId === SEGUIMIENTOS_BASE_STAGE_ID
          ? null
          : parseSeguimientosFollowupStageId(activeEditableStageId);
      let draftDataForRequest = currentDraftData;
      let workflowForRequest = currentWorkflow;
      let effectiveDirtyStageIds = dirtyStageIds;
      let effectiveSavableDirtyStageIds = savableDirtyStageIds;

      if (activeFollowupIndex && submittedFollowupValues) {
        const normalizedSubmittedFollowupValues =
          normalizeSeguimientosFollowupValues(
            submittedFollowupValues,
            activeFollowupIndex
          );
        const currentFollowupValues = normalizeSeguimientosFollowupValues(
          currentDraftData.followups[activeFollowupIndex] ?? {},
          activeFollowupIndex
        );

        if (
          JSON.stringify(normalizedSubmittedFollowupValues) !==
          JSON.stringify(currentFollowupValues)
        ) {
          const nextFollowups = {
            ...currentDraftData.followups,
            [activeFollowupIndex]: normalizedSubmittedFollowupValues,
          } satisfies Partial<
            Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
          >;
          const nextBaseValues = syncBaseTimelineWithFollowup(
            currentDraftData.base,
            activeFollowupIndex,
            normalizedSubmittedFollowupValues
          );
          const nextDraftData = buildNextDraftData({
            base: nextBaseValues,
            followups: nextFollowups,
          });

          if (nextDraftData) {
            const activeStageId =
              activeEditableStageId as SeguimientosEditableStageId;
            commitLocalDraftData(nextDraftData);
            draftDataForRequest = nextDraftData;
            workflowForRequest = nextDraftData.workflow;
            effectiveDirtyStageIds = orderStageIdsByWorkflow(
              [...new Set([...dirtyStageIds, activeStageId])],
              nextDraftData.workflow
            );
            effectiveSavableDirtyStageIds = orderStageIdsByWorkflow(
              [...new Set([...savableDirtyStageIds, activeStageId])],
              nextDraftData.workflow
            );
          }
        }
      }

      if (effectiveSavableDirtyStageIds.length === 0) {
        return true;
      }

      if (
        activeEditableStageId === "base_process" &&
        effectiveSavableDirtyStageIds.every((stageId) => stageId === "base_process")
      ) {
        return handleSaveBaseStage(
          normalizeSeguimientosBaseValues(
            draftDataForRequest.base,
            draftDataForRequest.empresaSnapshot
          )
        );
      }

      setSavingFollowupStages(true);
      setServerError(null);
      setStatusNotice(null);
      setSaveSuccessState(null);
      setCaseConflictState(null);

      try {
        const normalizedBaseValues = normalizeSeguimientosBaseValues(
          draftDataForRequest.base,
          draftDataForRequest.empresaSnapshot
        );
        const normalizedFollowupValuesByIndex = Object.entries(
          draftDataForRequest.followups
        ).reduce<
          Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>
        >((accumulator, [key, followupValues]) => {
          const followupIndex = Number.parseInt(
            key,
            10
          ) as SeguimientosFollowupIndex;
          accumulator[followupIndex] = normalizeSeguimientosFollowupValues(
            followupValues,
            followupIndex
          );
          return accumulator;
        }, {});

        const overrideGrants: SeguimientosOverrideGrant[] = effectiveSavableDirtyStageIds
          .map((stageId) => overrideGrantsByStageId[stageId])
          .filter(
            (grant): grant is SeguimientosOverrideGrantState => Boolean(grant)
          )
          .map(({ stageId, token }) => ({
            stageId,
            token,
          }));
        const response = await fetch(
          `/api/seguimientos/case/${draftDataForRequest.caseMeta.caseId}/stages/save`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              activeStageId: activeEditableStageId,
              companyType: draftDataForRequest.caseMeta.companyType,
              baseValues: normalizedBaseValues,
              followupValuesByIndex: normalizedFollowupValuesByIndex,
              dirtyStageIds: effectiveSavableDirtyStageIds,
              overrideGrants,
              expectedCaseUpdatedAt:
                resolveExpectedCaseUpdatedAt(
                  lastCommittedUpdatedAtRef,
                  draftDataForRequest
                ),
            }),
          }
        );
        const payload = (await response.json()) as SeguimientosStagesSaveResponse;

      if (!response.ok || (payload.status !== "ready" && payload.status !== "written_needs_reload")) {
        if (payload.status === "error") {
          handleSaveValidationError({
            message: payload.message,
            code: payload.code,
            missingOverrideStageIds: payload.missingOverrideStageIds,
            expiredOverrideStageIds: payload.expiredOverrideStageIds,
            currentCaseUpdatedAt: payload.currentCaseUpdatedAt,
            fieldPath: payload.fieldPath,
            activeStageId: activeEditableStageId,
          });
        } else {
          setServerError("No se pudieron guardar los cambios del seguimiento.");
        }
        return false;
      }

      if (payload.status === "written_needs_reload") {
        setSyncRecoveryState({
          caseId: draftDataForRequest.caseMeta.caseId,
          savedStageIds: payload.savedStageIds,
          message: payload.message,
        });
        setSaveSuccessState(null);
        setPendingOverrideRequest(null);
        setServerError(null);
        setStatusNotice(null);
        commitOverrideState(
          draftDataForRequest.caseMeta.caseId,
          removeSeguimientosOverrideGrantsByStageIds({
            workflow: workflowForRequest,
            overrideGrantsByStageId,
            stageIds: payload.savedStageIds,
          })
        );
        return true;
      }

      const activeStageOverrideActive =
        workflowForRequest.stageStates.find(
          (stageState) => stageState.stageId === activeEditableStageId
        )?.overrideActive ?? false;
      const latestDraftData = currentDraftDataRef.current ?? draftDataForRequest;
      const locallyChangedStageIds = listLocallyChangedSeguimientosStageIds(
        latestDraftData,
        draftDataForRequest
      );
      const candidatePreservedLocalStageIds = orderStageIdsByWorkflow(
        [...new Set([...effectiveDirtyStageIds, ...locallyChangedStageIds])],
        latestDraftData.workflow
      );
      const preservedLocalStageIds = candidatePreservedLocalStageIds.filter((stageId) => {
        if (!payload.savedStageIds.includes(stageId)) {
          return true;
        }

        if (stageId === SEGUIMIENTOS_BASE_STAGE_ID) {
          return (
            JSON.stringify(latestDraftData.base) !==
            JSON.stringify(draftDataForRequest.base)
          );
        }

        const followupIndex = parseSeguimientosFollowupStageId(stageId);
        if (!followupIndex) {
          return false;
        }

        return (
          JSON.stringify(
            normalizeSeguimientosFollowupValues(
              latestDraftData.followups[followupIndex] ?? {},
              followupIndex
            )
          ) !==
          JSON.stringify(
            normalizeSeguimientosFollowupValues(
              draftDataForRequest.followups[followupIndex] ?? {},
              followupIndex
            )
          )
        );
      });
      const nextDraftData = applyHydrationState(payload.hydration, {
        nextActiveStageId: activeEditableStageId,
        preserveLocalStageIds: preservedLocalStageIds,
      });
      commitOverrideState(
        draftDataForRequest.caseMeta.caseId,
        removeSeguimientosOverrideGrantsByStageIds({
          workflow: payload.hydration.workflow,
          overrideGrantsByStageId,
          stageIds: payload.savedStageIds,
        })
      );
      setPendingOverrideRequest(null);
      setServerError(null);
      const nextSaveSuccessState = buildSaveSuccessState({
        corrected: activeStageOverrideActive,
        savedStageIds: payload.savedStageIds,
        savedStageId: activeEditableStageId,
        workflow: payload.hydration.workflow,
      });
      setStatusNotice(nextSaveSuccessState.message);
      setSaveSuccessState(nextSaveSuccessState);
      const checkpointResult = await checkpointCurrentDraftData(nextDraftData);

      if (checkpointResult.ok) {
        return true;
      }

      if (checkpointResult.error) {
        setSyncRecoveryState({
          kind: "post_save_checkpoint_failed",
          message:
            "Los cambios se guardaron en Google Sheets, pero no pudimos sincronizar el estado local. Recarga esta pestaña para continuar (perderas cambios no guardados solo de esta pestaña).",
        });
      }

      return false;
      } catch (error) {
        setServerError(
          error instanceof Error
            ? error.message
            : "No se pudieron guardar los cambios del seguimiento."
        );
        return false;
      } finally {
        setSavingFollowupStages(false);
      }
    },
    [
      applyHydrationState,
      buildNextDraftData,
      buildSaveSuccessState,
      checkpointCurrentDraftData,
      commitLocalDraftData,
      commitOverrideState,
      currentDraftData,
      currentWorkflow,
      dirtyStageIds,
      handleSaveBaseStage,
      handleSaveValidationError,
      isReadonlyDraft,
      isSyncRecoveryBlocked,
      orderStageIdsByWorkflow,
      overrideGrantsByStageId,
      savableDirtyStageIds,
    ]
  );

  const handleRefreshResultSummary = useCallback(async () => {
    if (!currentDraftData || isReadonlyDraft || isSyncRecoveryBlocked) {
      return false;
    }

    setRefreshingResultSummary(true);
    setServerError(null);
    setStatusNotice(null);

    try {
      const response = await fetch(
        `/api/seguimientos/case/${currentDraftData.caseMeta.caseId}/result/refresh`,
        {
          method: "POST",
        }
      );
      const payload = (await response.json()) as SeguimientosResultRefreshResponse;

      if (payload.status === "written_needs_reload") {
        setSyncRecoveryState({
          caseId: currentDraftData.caseMeta.caseId,
          savedStageIds: [],
          message: payload.message,
        });
        setCompletionLinks(null);
        setStatusNotice(null);
        setServerError(null);
        return true;
      }

      if (!response.ok || payload.status !== "ready") {
        setServerError(
          payload.status === "error"
            ? payload.message
            : "No se pudo actualizar el consolidado."
        );
        return false;
      }

      const nextDraftData = applyHydrationState(payload.hydration, {
        nextActiveStageId:
          currentDraftData.activeStageId ?? payload.hydration.workflow.activeStageId,
        preserveLocalStageIds: dirtyStageIds,
      });
      setCompletionLinks(null);
      setStatusNotice(
        payload.hydration.summary.lastRepairedAt
          ? "Consolidado verificado y reparado."
          : "Consolidado actualizado."
      );

      const checkpointResult = await checkpointCurrentDraftData(nextDraftData);
      if (checkpointResult.ok) {
        return true;
      }

      if (checkpointResult.error) {
        setServerError(
          `El consolidado se actualizo, pero no pudimos sincronizar el borrador remoto: ${checkpointResult.error}`
        );
      }

      return false;
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el consolidado."
      );
      return false;
    } finally {
      setRefreshingResultSummary(false);
    }
  }, [
    applyHydrationState,
    checkpointCurrentDraftData,
    currentDraftData,
    dirtyStageIds,
    isReadonlyDraft,
    isSyncRecoveryBlocked,
  ]);

  const handleExportPdf = useCallback(
    async (optionId: string) => {
      if (!currentDraftData || isReadonlyDraft || isSyncRecoveryBlocked) {
        return false;
      }

      if (dirtyStageIds.length > 0) {
        setStatusNotice(null);
        setServerError(
          "Tienes cambios sin guardar en Google Sheets. Guarda primero antes de generar el PDF."
        );
        return false;
      }

      setExportingPdf(true);
      setServerError(null);
      setStatusNotice(null);

      try {
        const response = await fetch(
          `/api/seguimientos/case/${currentDraftData.caseMeta.caseId}/pdf/export`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              optionId,
            }),
          }
        );
        const payload = (await response.json()) as SeguimientosPdfExportResponse;

        if (payload.status === "written_needs_reload") {
          setSyncRecoveryState({
            caseId: currentDraftData.caseMeta.caseId,
            savedStageIds: [],
            message: payload.message,
          });
          setCompletionLinks(null);
          setStatusNotice(null);
          setServerError(null);
          return true;
        }

        if (!response.ok || payload.status !== "ready") {
          setServerError(
            payload.status === "error"
              ? payload.message
              : "No se pudo generar el PDF de Seguimientos."
          );
          return false;
        }

        const nextDraftData = applyHydrationState(payload.hydration, {
          nextActiveStageId:
            currentDraftData.activeStageId ?? payload.hydration.workflow.activeStageId,
          preserveLocalStageIds: dirtyStageIds,
        });
        setCompletionLinks(payload.links);
        setStatusNotice("PDF generado correctamente.");

        const checkpointResult = await checkpointCurrentDraftData(nextDraftData);
        if (checkpointResult.ok) {
          return true;
        }

        if (checkpointResult.error) {
          setServerError(
            `El PDF se genero, pero no pudimos sincronizar el borrador remoto: ${checkpointResult.error}`
          );
        }

        return false;
      } catch (error) {
        setServerError(
          error instanceof Error
            ? error.message
            : "No se pudo generar el PDF de Seguimientos."
        );
        return false;
      } finally {
        setExportingPdf(false);
      }
    },
    [
      applyHydrationState,
      checkpointCurrentDraftData,
      currentDraftData,
      dirtyStageIds,
      isReadonlyDraft,
      isSyncRecoveryBlocked,
    ]
  );

  const handleRetrySync = useCallback(async () => {
    if (!syncRecoveryState) {
      return false;
    }

    if (isPostSaveCheckpointFailed(syncRecoveryState)) {
      return false;
    }

    setServerError(null);
    try {
      const payload = await fetchCaseHydration(syncRecoveryState.caseId);
      if (payload.status !== "ready") {
        if (
          payload.code === "case_reclaim_required" ||
          payload.code === "case_access_denied"
        ) {
          await resetToCedulaGate(payload.message);
          return false;
        }

        setServerError(payload.message);
        return false;
      }

      const nextDraftData = applyHydrationState(payload.hydration, {
        nextActiveStageId:
          currentDraftData?.activeStageId ?? payload.hydration.workflow.activeStageId,
        preserveLocalStageIds: dirtyStageIds,
      });
      setStatusNotice("Seguimientos sincronizado nuevamente con Google Sheets.");
      setServerError(null);
      setSyncRecoveryState(null);
      const checkpointResult = await checkpointCurrentDraftData(nextDraftData);

      if (checkpointResult.ok) {
        return true;
      }

      if (checkpointResult.error) {
        setServerError(
          `Se recupero la sincronizacion con Google Sheets, pero no pudimos actualizar el borrador remoto: ${checkpointResult.error}`
        );
      }

      return false;
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "No se pudo reintentar la sincronizacion del caso."
      );
      return false;
    }
  }, [
    applyHydrationState,
    checkpointCurrentDraftData,
    currentDraftData?.activeStageId,
    dirtyStageIds,
    fetchCaseHydration,
    resetToCedulaGate,
    syncRecoveryState,
  ]);

  const handleReloadCase = useCallback(async (preserveLocalStageIds?: readonly SeguimientosEditableStageId[]) => {
    const caseId =
      currentDraftData?.caseMeta.caseId ?? hydration?.caseMeta.caseId ?? null;
    if (!caseId) {
      return false;
    }

    setReloadingConflictCase(true);
    setServerError(null);
    try {
      const payload = await fetchCaseHydration(caseId);
      if (payload.status !== "ready") {
        setServerError(payload.message);
        return false;
      }

      const nextDraftData = applyHydrationState(payload.hydration, {
        nextActiveStageId:
          currentDraftData?.activeStageId ?? payload.hydration.workflow.activeStageId,
        preserveLocalStageIds,
      });
      setStatusNotice("Caso recargado desde Google Sheets.");
      setCaseConflictState(null);
      setSyncRecoveryState(null);

      const checkpointResult = await checkpointCurrentDraftData(nextDraftData);
      if (checkpointResult.ok) {
        return true;
      }

      if (checkpointResult.error) {
        setServerError(
          `El caso se recargo, pero no pudimos sincronizar el borrador remoto: ${checkpointResult.error}`
        );
      }

      return false;
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "No se pudo recargar el caso."
      );
      return false;
    } finally {
      setReloadingConflictCase(false);
    }
  }, [
    applyHydrationState,
    checkpointCurrentDraftData,
    currentDraftData?.activeStageId,
    currentDraftData?.caseMeta.caseId,
    fetchCaseHydration,
    hydration?.caseMeta.caseId,
  ]);

  const draftStatus = currentDraftData
    ? buildDraftStatusProps({
        onSave: handleSaveDraft,
        saveDisabled:
          isReadonlyDraft ||
          isSyncRecoveryBlocked ||
          bootstrapping ||
          savingBaseStage ||
          savingFollowupStages ||
          refreshingResultSummary ||
          exportingPdf,
      })
    : null;

  const isFirstEntry = useMemo(
    () =>
      Boolean(
          currentDraftData &&
          currentActiveStageId === SEGUIMIENTOS_BASE_STAGE_ID &&
          !isBaseAlreadyConfirmedInSheets(currentDraftData)
      ),
    [currentActiveStageId, currentDraftData]
  );

  const isReEntry = useMemo(
    () =>
      Boolean(
        hydration &&
          !isFirstEntry &&
          currentWorkflow?.suggestedStageId !== SEGUIMIENTOS_BASE_STAGE_ID
      ),
    [hydration, currentWorkflow?.suggestedStageId, isFirstEntry]
  );

  return {
    hydration,
    currentDraftData,
    currentWorkflow,
    currentActiveStageId,
    baseEditorRevision,
    isFirstEntry,
    isReEntry,
    restoring:
      restoring || (Boolean(bootstrapDraftId) && draftController.loadingDraft),
    bootstrapping,
    savingBaseStage,
    savingFollowupStages,
    refreshingResultSummary,
    exportingPdf,
    bootstrapProgressStep,
    serverError,
    setServerError,
    statusNotice,
    saveSuccessState,
    caseConflictState,
    completionLinks,
    draftError,
    companyTypeResolution,
    empresaAssignmentResolution,
    syncRecoveryState,
    pendingOverrideRequest,
    reloadingConflictCase,
    modifiedFieldIdsByStageId,
    dirtyStageIds,
    savableDirtyStageIds,
    isReadonlyDraft,
    isSyncRecoveryBlocked,
    syncRecoveryKind: getSyncRecoveryKind(syncRecoveryState),
    draftStatus,
    draftLockBannerProps: buildDraftLockBannerProps({
      setServerError,
      onBackToDrafts: () => router.push("/hub?panel=drafts"),
    }),
    prepareCase,
    clearResolution: () => setCompanyTypeResolution(null),
    clearEmpresaAssignmentResolution: () =>
      setEmpresaAssignmentResolution(null),
    handleStageSelect,
    handleStageOverride,
    handleStageLock: handleStageLockWithDecision,
    handleAutoSeededFirstAsistente,
    handleFollowupFirstAsistenteManualEdit,
    handleBaseValuesChange,
    handleFollowupValuesChange,
    handleFailedVisitApplied,
    handleSaveBaseStage,
    handleSaveDirtyStages,
    handleSaveDraft,
    handleRefreshResultSummary,
    handleExportPdf,
    handleRetrySync,
    handleReloadCase,
    dismissSaveSuccessState,
    handleBack: () => router.push("/hub"),
  };
}
