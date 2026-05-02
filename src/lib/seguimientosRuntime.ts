import type { Empresa } from "@/lib/store/empresaStore";
import type { UsuarioRecaSeguimientoPrefill } from "@/lib/usuariosReca";
import {
  SEGUIMIENTOS_BASE_STAGE_ID,
  SEGUIMIENTOS_FINAL_STEP,
  SEGUIMIENTOS_FINAL_STAGE_ID,
  buildSeguimientosStageDraftStateMap,
  buildSeguimientosFollowupStageId,
  createEmptySeguimientosStageDraftState,
  createEmptySeguimientosFinalSummary,
  normalizeSeguimientosBaseValues,
  normalizeSeguimientosFollowupValues,
  parseSeguimientosFollowupStageId,
  type SeguimientosAutoSeededFirstAsistente,
  type SeguimientosBaseValues,
  type SeguimientosCaseMeta,
  type SeguimientosEditableStageId,
  type SeguimientosFinalSummary,
  type SeguimientosFollowupIndex,
  type SeguimientosFollowupValues,
  type SeguimientosStageDraftState,
  type SeguimientosStageDraftStateByStageId,
  type SeguimientosStageId,
} from "@/lib/seguimientos";
import {
  buildSeguimientosWorkflow,
  type SeguimientosPdfOption,
  type SeguimientosWorkflow,
} from "@/lib/seguimientosStages";

export const SEGUIMIENTOS_CASE_SCHEMA_VERSION = 2;

export const SEGUIMIENTOS_BOOTSTRAP_PROGRESS_STEPS = [
  "Buscando persona",
  "Resolviendo empresa",
  "Determinando tipo",
  "Verificando caso",
  "Preparando archivo",
  "Leyendo contenido",
] as const;

export type SeguimientosBootstrapProgressStep =
  (typeof SEGUIMIENTOS_BOOTSTRAP_PROGRESS_STEPS)[number];

export type SeguimientosCaseResolutionReason =
  | "empresa"
  | "company_type"
  | "case_conflict";

export type SeguimientosErrorCode =
  | "case_access_denied"
  | "case_reclaim_required"
  | "bootstrap_in_progress"
  | "override_required"
  | "override_expired"
  | "override_unavailable"
  | "invalid_pdf_option"
  | "base_stage_incomplete"
  | "google_storage_quota_exceeded"
  | "case_bootstrap_storage_failed"
  | "case_conflict";

export type SeguimientosCaseHydration = {
  schemaVersion: number;
  caseMeta: SeguimientosCaseMeta;
  empresaSnapshot: Empresa | null;
  personPrefill: UsuarioRecaSeguimientoPrefill;
  stageDraftStateByStageId: SeguimientosStageDraftStateByStageId;
  baseValues: SeguimientosBaseValues;
  persistedBaseValues: SeguimientosBaseValues;
  followupValuesByIndex: Partial<
    Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
  >;
  persistedFollowupValuesByIndex: Partial<
    Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
  >;
  summary: SeguimientosFinalSummary;
  workflow: SeguimientosWorkflow;
  suggestedStageId: SeguimientosStageId;
};

export type SeguimientosDraftData = {
  schemaVersion: number;
  caseMeta: SeguimientosCaseMeta;
  empresaSnapshot: Empresa | null;
  personPrefill: UsuarioRecaSeguimientoPrefill;
  stageDraftStateByStageId: SeguimientosStageDraftStateByStageId;
  workflow: SeguimientosWorkflow;
  activeStageId: SeguimientosStageId;
  base: SeguimientosBaseValues;
  persistedBase: SeguimientosBaseValues;
  followups: Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>;
  persistedFollowups: Partial<
    Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
  >;
  summary: SeguimientosFinalSummary;
};

type SeguimientosBaseStageSaveReadyResponse = {
  status: "ready";
  hydration: SeguimientosCaseHydration;
  savedAt: string;
};

type SeguimientosBaseStageWrittenNeedsReloadResponse = {
  status: "written_needs_reload";
  savedAt: string;
  savedStageIds: [typeof SEGUIMIENTOS_BASE_STAGE_ID];
  message: string;
};

type SeguimientosBaseStageSaveErrorResponse = {
  status: "error";
  message: string;
  code?: SeguimientosErrorCode;
  missingOverrideStageIds?: SeguimientosEditableStageId[];
  expiredOverrideStageIds?: SeguimientosEditableStageId[];
  currentCaseUpdatedAt?: string | null;
  fieldPath?: string | null;
  issues?: Array<{
    path: string;
    message: string;
  }>;
};

export type SeguimientosBaseStageSaveResponse =
  | SeguimientosBaseStageSaveReadyResponse
  | SeguimientosBaseStageWrittenNeedsReloadResponse
  | SeguimientosBaseStageSaveErrorResponse;

type SeguimientosStagesSaveReadyResponse = {
  status: "ready";
  hydration: SeguimientosCaseHydration;
  savedAt: string;
  savedStageIds: SeguimientosEditableStageId[];
};

type SeguimientosStagesSaveWrittenNeedsReloadResponse = {
  status: "written_needs_reload";
  savedAt: string;
  savedStageIds: SeguimientosEditableStageId[];
  message: string;
};

type SeguimientosStagesSaveErrorResponse = {
  status: "error";
  message: string;
  code?: SeguimientosErrorCode;
  missingOverrideStageIds?: SeguimientosEditableStageId[];
  expiredOverrideStageIds?: SeguimientosEditableStageId[];
  currentCaseUpdatedAt?: string | null;
  fieldPath?: string | null;
  issues?: Array<{
    path: string;
    message: string;
  }>;
};

export type SeguimientosStagesSaveResponse =
  | SeguimientosStagesSaveReadyResponse
  | SeguimientosStagesSaveWrittenNeedsReloadResponse
  | SeguimientosStagesSaveErrorResponse;

type SeguimientosResultRefreshReadyResponse = {
  status: "ready";
  hydration: SeguimientosCaseHydration;
  refreshedAt: string;
};

type SeguimientosResultRefreshWrittenNeedsReloadResponse = {
  status: "written_needs_reload";
  caseId: string;
  message: string;
};

type SeguimientosResultRefreshErrorResponse = {
  status: "error";
  message: string;
  code?: SeguimientosErrorCode;
};

export type SeguimientosResultRefreshResponse =
  | SeguimientosResultRefreshReadyResponse
  | SeguimientosResultRefreshWrittenNeedsReloadResponse
  | SeguimientosResultRefreshErrorResponse;

type SeguimientosPdfExportReadyResponse = {
  status: "ready";
  hydration: SeguimientosCaseHydration;
  links: {
    sheetLink: string;
    pdfLink: string;
  };
  exportedAt: string;
  optionId: SeguimientosPdfOption["id"];
};

type SeguimientosPdfExportWrittenNeedsReloadResponse = {
  status: "written_needs_reload";
  caseId: string;
  message: string;
};

type SeguimientosPdfExportErrorResponse = {
  status: "error";
  message: string;
  code?: SeguimientosErrorCode;
};

export type SeguimientosPdfExportResponse =
  | SeguimientosPdfExportReadyResponse
  | SeguimientosPdfExportWrittenNeedsReloadResponse
  | SeguimientosPdfExportErrorResponse;

type SeguimientosBootstrapReadyResponse = {
  status: "ready";
  hydration: SeguimientosCaseHydration;
};

type SeguimientosBootstrapResolutionResponse = {
  status: "resolution_required";
  reason: SeguimientosCaseResolutionReason;
  context: Record<string, unknown>;
};

type SeguimientosBootstrapErrorResponse = {
  status: "error";
  message: string;
  code?: SeguimientosErrorCode;
};

export type SeguimientosBootstrapResponse =
  | SeguimientosBootstrapReadyResponse
  | SeguimientosBootstrapResolutionResponse
  | SeguimientosBootstrapErrorResponse;

type SeguimientosCaseLoadReadyResponse = {
  status: "ready";
  hydration: SeguimientosCaseHydration;
};

type SeguimientosCaseLoadErrorResponse = {
  status: "error";
  message: string;
  code?: SeguimientosErrorCode;
};

export type SeguimientosCaseLoadResponse =
  | SeguimientosCaseLoadReadyResponse
  | SeguimientosCaseLoadErrorResponse;

export type SeguimientosOverrideGrant = {
  stageId: SeguimientosEditableStageId;
  token: string;
};

export type SeguimientosOverrideGrantWithExpiry = SeguimientosOverrideGrant & {
  expiresAt: string;
};

type SeguimientosOverrideReadyResponse = {
  status: "ready";
  grants: SeguimientosOverrideGrantWithExpiry[];
};

type SeguimientosOverrideErrorResponse = {
  status: "error";
  message: string;
  code?: SeguimientosErrorCode;
};

export type SeguimientosStageOverrideResponse =
  | SeguimientosOverrideReadyResponse
  | SeguimientosOverrideErrorResponse;

function createDefaultSeguimientosStageDraftState() {
  return createEmptySeguimientosStageDraftState();
}

function normalizeSeguimientosAutoSeededFirstAsistente(
  value: unknown
): SeguimientosAutoSeededFirstAsistente | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const nombre =
    typeof candidate.nombre === "string" && candidate.nombre.trim()
      ? candidate.nombre.trim()
      : null;
  const cargo =
    typeof candidate.cargo === "string" && candidate.cargo.trim()
      ? candidate.cargo.trim()
      : null;
  const pendingConfirmation = candidate.pendingConfirmation === true;

  if (!pendingConfirmation || (!nombre && !cargo)) {
    return null;
  }

  return {
    nombre,
    cargo,
    pendingConfirmation,
  };
}

function ensureSeguimientosFinalSummary(
  value: SeguimientosFinalSummary | null | undefined
) {
  return {
    ...createEmptySeguimientosFinalSummary(),
    ...(value ?? {}),
  } satisfies SeguimientosFinalSummary;
}

export function ensureSeguimientosStageDraftStateByStageId(
  companyType: SeguimientosCaseMeta["companyType"],
  stageDraftStateByStageId: SeguimientosStageDraftStateByStageId | null | undefined
) {
  const defaults = buildSeguimientosStageDraftStateMap(companyType);
  const nextState: SeguimientosStageDraftStateByStageId = { ...defaults };

  for (const [stageId, defaultState] of Object.entries(defaults) as Array<
    [SeguimientosEditableStageId, SeguimientosStageDraftState]
  >) {
    const candidate = stageDraftStateByStageId?.[stageId];
    nextState[stageId] = candidate
      ? {
          ...defaultState,
          ...candidate,
          autoSeededFirstAsistente: normalizeSeguimientosAutoSeededFirstAsistente(
            (candidate as SeguimientosStageDraftState).autoSeededFirstAsistente
          ),
        }
      : defaultState;
  }

  return nextState;
}

export function withSeguimientosStageDraftStateUpdate(
  stageDraftStateByStageId: SeguimientosStageDraftStateByStageId,
  stageId: SeguimientosEditableStageId,
  patch: Partial<SeguimientosStageDraftState>
) {
  return {
    ...stageDraftStateByStageId,
    [stageId]: {
      ...(stageDraftStateByStageId[stageId] ?? createDefaultSeguimientosStageDraftState()),
      ...patch,
    },
  } satisfies SeguimientosStageDraftStateByStageId;
}

export function getSeguimientosStepFromStageId(stageId: SeguimientosStageId) {
  if (stageId === SEGUIMIENTOS_BASE_STAGE_ID) {
    return 0;
  }

  if (stageId === SEGUIMIENTOS_FINAL_STAGE_ID) {
    return SEGUIMIENTOS_FINAL_STEP;
  }

  const followupIndex = parseSeguimientosFollowupStageId(stageId);
  return followupIndex ?? 0;
}

export function getSeguimientosStageIdFromStep(
  step: number,
  maxFollowups: 3 | 6
): SeguimientosStageId {
  if (step <= 0) {
    return SEGUIMIENTOS_BASE_STAGE_ID;
  }

  if (step >= SEGUIMIENTOS_FINAL_STEP) {
    return SEGUIMIENTOS_FINAL_STAGE_ID;
  }

  const followupIndex = Math.min(Math.max(step, 1), maxFollowups) as SeguimientosFollowupIndex;
  return buildSeguimientosFollowupStageId(followupIndex);
}

export function buildSeguimientosDraftData(
  hydration: SeguimientosCaseHydration,
  options?: {
    activeStageId?: SeguimientosStageId | null;
  }
): SeguimientosDraftData {
  const normalizedBaseValues = normalizeSeguimientosBaseValues(
    hydration.baseValues,
    hydration.empresaSnapshot
  );
  const normalizedPersistedBaseValues = normalizeSeguimientosBaseValues(
    hydration.persistedBaseValues,
    hydration.empresaSnapshot
  );
  const normalizedFollowups = Object.entries(
    hydration.followupValuesByIndex
  ).reduce<Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>>(
    (accumulator, [key, followupValues]) => {
      const followupIndex = Number.parseInt(key, 10) as SeguimientosFollowupIndex;
      accumulator[followupIndex] = normalizeSeguimientosFollowupValues(
        followupValues,
        followupIndex
      );
      return accumulator;
    },
    {}
  );
  const normalizedPersistedFollowups = Object.entries(
    hydration.persistedFollowupValuesByIndex
  ).reduce<Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>>(
    (accumulator, [key, followupValues]) => {
      const followupIndex = Number.parseInt(key, 10) as SeguimientosFollowupIndex;
      accumulator[followupIndex] = normalizeSeguimientosFollowupValues(
        followupValues,
        followupIndex
      );
      return accumulator;
    },
    {}
  );
  const activeStageId =
    options?.activeStageId && hydration.workflow.visibleStageIds.includes(options.activeStageId)
      ? options.activeStageId
      : hydration.workflow.activeStageId;
  const workflow = buildSeguimientosWorkflow({
    companyType: hydration.caseMeta.companyType,
    baseValues: normalizedBaseValues,
    persistedBaseValues: normalizedPersistedBaseValues,
    followups: normalizedFollowups,
    persistedFollowups: normalizedPersistedFollowups,
    activeStageId,
  });

  return {
    schemaVersion: SEGUIMIENTOS_CASE_SCHEMA_VERSION,
    caseMeta: hydration.caseMeta,
    empresaSnapshot: hydration.empresaSnapshot,
    personPrefill: hydration.personPrefill,
    stageDraftStateByStageId: ensureSeguimientosStageDraftStateByStageId(
      hydration.caseMeta.companyType,
      hydration.stageDraftStateByStageId
    ),
    workflow,
    activeStageId: workflow.activeStageId,
    base: normalizedBaseValues,
    persistedBase: normalizedPersistedBaseValues,
    followups: normalizedFollowups,
    persistedFollowups: normalizedPersistedFollowups,
    summary: hydration.summary,
  };
}

function isSeguimientosFollowupsRecord(
  value: unknown
): value is Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function coerceSeguimientosFollowupsRecord(
  value: unknown
): Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>> {
  if (!isSeguimientosFollowupsRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<
    Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>
  >((accumulator, [key, followupValues]) => {
    const followupIndex = Number.parseInt(key, 10);
    if (!Number.isInteger(followupIndex) || followupIndex < 1 || followupIndex > 6) {
      return accumulator;
    }

    accumulator[followupIndex as SeguimientosFollowupIndex] =
      followupValues as SeguimientosFollowupValues;
    return accumulator;
  }, {});
}

function ensurePersistedFollowups(
  currentFollowups: Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>,
  persistedFollowups:
    | Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>
    | null
    | undefined
) {
  const nextPersistedFollowups: Partial<
    Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
  > = {};

  for (const [key, currentValue] of Object.entries(currentFollowups)) {
    const followupIndex = Number.parseInt(key, 10) as SeguimientosFollowupIndex;
    nextPersistedFollowups[followupIndex] =
      persistedFollowups?.[followupIndex] ?? currentValue;
  }

  for (const [key, persistedValue] of Object.entries(persistedFollowups ?? {})) {
    const followupIndex = Number.parseInt(key, 10) as SeguimientosFollowupIndex;
    nextPersistedFollowups[followupIndex] =
      nextPersistedFollowups[followupIndex] ?? persistedValue;
  }

  return nextPersistedFollowups;
}

export function buildSeguimientosHydrationFromDraftData(
  draftData: SeguimientosDraftData
): SeguimientosCaseHydration {
  const baseValues = normalizeSeguimientosBaseValues(
    draftData.base,
    draftData.empresaSnapshot
  );
  const persistedBaseValues = normalizeSeguimientosBaseValues(
    draftData.persistedBase ?? draftData.base,
    draftData.empresaSnapshot
  );
  const followups = isSeguimientosFollowupsRecord(draftData.followups)
    ? Object.entries(draftData.followups).reduce<
        Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>
      >((accumulator, [key, followupValues]) => {
        const followupIndex = Number.parseInt(key, 10) as SeguimientosFollowupIndex;
        accumulator[followupIndex] = normalizeSeguimientosFollowupValues(
          followupValues,
          followupIndex
        );
        return accumulator;
      }, {})
    : {};
  const persistedFollowups = ensurePersistedFollowups(
    followups,
    draftData.persistedFollowups
  );
  const summary = ensureSeguimientosFinalSummary(draftData.summary);
  const stageDraftStateByStageId = ensureSeguimientosStageDraftStateByStageId(
    draftData.caseMeta.companyType,
    draftData.stageDraftStateByStageId
  );
  const workflow = buildSeguimientosWorkflow({
    companyType: draftData.caseMeta.companyType,
    baseValues,
    persistedBaseValues,
    followups,
    persistedFollowups,
    activeStageId: draftData.activeStageId,
  });

  return {
    schemaVersion: SEGUIMIENTOS_CASE_SCHEMA_VERSION,
    caseMeta: draftData.caseMeta,
    empresaSnapshot: draftData.empresaSnapshot,
    personPrefill: draftData.personPrefill,
    stageDraftStateByStageId,
    baseValues,
    persistedBaseValues,
    followupValuesByIndex: followups,
    persistedFollowupValuesByIndex: persistedFollowups,
    summary,
    workflow,
    suggestedStageId: workflow.suggestedStageId,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseSeguimientosDraftData(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  if (!isRecord(value.caseMeta) || !isRecord(value.base)) {
    return null;
  }

  const caseMeta = value.caseMeta as unknown as SeguimientosCaseMeta;
  if (!caseMeta.caseId || !caseMeta.companyType) {
    return null;
  }
  const empresaSnapshot = (value.empresaSnapshot ?? null) as Empresa | null;

  const schemaVersion =
    typeof value.schemaVersion === "number"
      ? value.schemaVersion
      : SEGUIMIENTOS_CASE_SCHEMA_VERSION;
  if (schemaVersion > SEGUIMIENTOS_CASE_SCHEMA_VERSION) {
    return null;
  }

  const base = normalizeSeguimientosBaseValues(
    value.base as SeguimientosBaseValues,
    empresaSnapshot
  );
  const followups = Object.entries(
    coerceSeguimientosFollowupsRecord(value.followups)
  ).reduce<Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>>(
    (accumulator, [key, followupValues]) => {
      const followupIndex = Number.parseInt(key, 10) as SeguimientosFollowupIndex;
      accumulator[followupIndex] = normalizeSeguimientosFollowupValues(
        followupValues,
        followupIndex
      );
      return accumulator;
    },
    {}
  );
  const persistedBase = normalizeSeguimientosBaseValues(
    (value.persistedBase as SeguimientosBaseValues | undefined) ?? base,
    empresaSnapshot
  );
  const persistedFollowups = ensurePersistedFollowups(
    followups,
    Object.entries(
      coerceSeguimientosFollowupsRecord(value.persistedFollowups)
    ).reduce<Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>>(
      (accumulator, [key, followupValues]) => {
        const followupIndex = Number.parseInt(key, 10) as SeguimientosFollowupIndex;
        accumulator[followupIndex] = normalizeSeguimientosFollowupValues(
          followupValues,
          followupIndex
        );
        return accumulator;
      },
      {}
    )
  );
  const candidateActiveStageId =
    typeof value.activeStageId === "string"
      ? (value.activeStageId as SeguimientosStageId)
      : isRecord(value.workflow) && typeof value.workflow.activeStageId === "string"
        ? (value.workflow.activeStageId as SeguimientosStageId)
        : SEGUIMIENTOS_BASE_STAGE_ID;
  const workflow = buildSeguimientosWorkflow({
    companyType: caseMeta.companyType,
    baseValues: base,
    persistedBaseValues: persistedBase,
    followups,
    persistedFollowups,
    activeStageId: candidateActiveStageId,
  });

  return {
    schemaVersion,
    caseMeta,
    empresaSnapshot,
    personPrefill: (value.personPrefill ?? {}) as UsuarioRecaSeguimientoPrefill,
    stageDraftStateByStageId: ensureSeguimientosStageDraftStateByStageId(
      caseMeta.companyType,
      (value.stageDraftStateByStageId ?? null) as SeguimientosStageDraftStateByStageId | null
    ),
    workflow,
    activeStageId: workflow.activeStageId,
    base,
    persistedBase,
    followups,
    persistedFollowups,
    summary: ensureSeguimientosFinalSummary(
      value.summary as SeguimientosFinalSummary | undefined
    ),
  } satisfies SeguimientosDraftData;
}
