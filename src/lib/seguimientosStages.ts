import {
  SEGUIMIENTOS_BASE_STAGE_ID,
  SEGUIMIENTOS_FINAL_STAGE_ID,
  SEGUIMIENTOS_MAX_ATTENDEES,
  SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT,
  SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT,
  SEGUIMIENTOS_FUNCTION_ITEMS_PER_COLUMN,
  SEGUIMIENTOS_PROGRESS_THRESHOLD_PERCENT,
  applySeguimientosFollowupDateToBase,
  buildSeguimientosFollowupStageId,
  createEmptySeguimientosBaseValues,
  createEmptySeguimientosFollowupValues,
  getSeguimientosFollowupDateFromBase,
  getSeguimientosMaxFollowups,
  getSeguimientosVisibleFollowupIndexes,
  normalizeSeguimientosBaseValues,
  normalizeSeguimientosFollowupValues,
  parseSeguimientosFollowupStageId,
  type SeguimientosBaseValues,
  type SeguimientosCompanyType,
  type SeguimientosEditableStageId,
  type SeguimientosFinalSummary,
  type SeguimientosFollowupIndex,
  type SeguimientosFollowupValues,
  type SeguimientosProgressSnapshot,
  type SeguimientosStageId,
  type SeguimientosStageStatus,
} from "@/lib/seguimientos";
import { SEGUIMIENTOS_FOLLOWUP_FAILED_VISIT_PRESET } from "@/lib/seguimientosFailedVisitPreset";
import { getSeguimientosValueAtPath } from "@/lib/seguimientosPathAccess";

export type SeguimientosStageKind = "base" | "followup" | "final";

export type SeguimientosStageRule = {
  stageId: SeguimientosStageId;
  kind: SeguimientosStageKind;
  label: string;
  title: string;
  followupIndex?: SeguimientosFollowupIndex;
  writableFields: readonly string[];
  trackedWritableFields: readonly string[];
  minimumRequiredFields: readonly string[];
  derivedReadonlyFields: readonly string[];
  progressThresholdPercent: number;
  supportsOverride: boolean;
  supportsCopyForward: boolean;
  supportsPdfExport: boolean;
  supportsFailedVisitPreset: boolean;
};

export type SeguimientosStageState = {
  stageId: SeguimientosStageId;
  kind: SeguimientosStageKind;
  label: string;
  title: string;
  followupIndex?: SeguimientosFollowupIndex;
  status: SeguimientosStageStatus;
  progress: SeguimientosProgressSnapshot;
  isSuggested: boolean;
  isEditable: boolean;
  isProtectedByDefault: boolean;
  supportsOverride: boolean;
  supportsCopyForward: boolean;
  supportsFailedVisitPreset: boolean;
  overrideActive: boolean;
  helperText: string;
};

export type SeguimientosWorkflow = {
  companyType: SeguimientosCompanyType;
  maxFollowups: 3 | 6;
  suggestedStageId: SeguimientosStageId;
  activeStageId: SeguimientosStageId;
  visibleStageIds: SeguimientosStageId[];
  completedStageIds: SeguimientosStageId[];
  completedFollowupIndexes: SeguimientosFollowupIndex[];
  overrideUnlockedStageIds: SeguimientosEditableStageId[];
  stageStates: SeguimientosStageState[];
  message: string;
};

export type SeguimientosPdfOption = {
  id:
    | "base_only"
    | `base_plus_followup_${SeguimientosFollowupIndex}`
    | `base_plus_followup_${SeguimientosFollowupIndex}_plus_final`;
  label: string;
  includesBase: true;
  followupIndex?: SeguimientosFollowupIndex;
  fechaSeguimiento: string | null;
  includeFinalSummary: boolean;
  enabled: boolean;
  disabledReason: string | null;
};

function buildIndexedFieldPaths(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${prefix}.${index}`);
}

export const SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS = [
  "fecha_visita",
  "modalidad",
  "cargo_vinculado",
  "contacto_emergencia",
  "parentesco",
  "telefono_emergencia",
  "certificado_discapacidad",
  "certificado_porcentaje",
  "discapacidad",
  "tipo_contrato",
  "fecha_firma_contrato",
  "fecha_inicio_contrato",
  "fecha_fin_contrato",
  "apoyos_ajustes",
  ...buildIndexedFieldPaths(
    "funciones_1_5",
    SEGUIMIENTOS_FUNCTION_ITEMS_PER_COLUMN
  ),
  ...buildIndexedFieldPaths(
    "funciones_6_10",
    SEGUIMIENTOS_FUNCTION_ITEMS_PER_COLUMN
  ),
] as const satisfies readonly string[];

export const SEGUIMIENTOS_BASE_WRITABLE_FIELDS =
  SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS;

export const SEGUIMIENTOS_BASE_MINIMUM_REQUIRED_FIELDS = [
  "fecha_visita",
  "modalidad",
  "nombre_vinculado",
  "cedula",
  "cargo_vinculado",
  "discapacidad",
  "tipo_contrato",
  "apoyos_ajustes",
  "funciones_1_5.0",
] as const satisfies readonly string[];

export const SEGUIMIENTOS_BASE_DERIVED_READONLY_FIELDS = [
  "seguimiento_fechas_1_3",
  "seguimiento_fechas_4_6",
] as const satisfies readonly string[];

export const SEGUIMIENTOS_FOLLOWUP_TRACKED_WRITABLE_FIELDS = [
  "modalidad",
  "fecha_seguimiento",
  "tipo_apoyo",
  "situacion_encontrada",
  "estrategias_ajustes",
  ...buildIndexedFieldPaths("item_autoevaluacion", SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT),
  ...buildIndexedFieldPaths("item_eval_empresa", SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT),
  ...buildIndexedFieldPaths("empresa_eval", SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT),
] as const satisfies readonly string[];

export const SEGUIMIENTOS_FOLLOWUP_WRITABLE_FIELDS = [
  "modalidad",
  "fecha_seguimiento",
  "tipo_apoyo",
  "situacion_encontrada",
  "estrategias_ajustes",
  ...buildIndexedFieldPaths("item_observaciones", SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT),
  ...buildIndexedFieldPaths("item_autoevaluacion", SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT),
  ...buildIndexedFieldPaths("item_eval_empresa", SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT),
  ...buildIndexedFieldPaths("empresa_eval", SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT),
  ...buildIndexedFieldPaths(
    "empresa_observacion",
    SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT
  ),
  ...Array.from({ length: SEGUIMIENTOS_MAX_ATTENDEES }, (_, index) => [
    `asistentes.${index}.nombre`,
    `asistentes.${index}.cargo`,
  ]).flat(),
] as const satisfies readonly string[];

export const SEGUIMIENTOS_FOLLOWUP_MINIMUM_REQUIRED_FIELDS = [
  "modalidad",
  "fecha_seguimiento",
  "tipo_apoyo",
  "item_autoevaluacion.0",
  "item_eval_empresa.0",
  "empresa_eval.0",
  "situacion_encontrada",
  "estrategias_ajustes",
] as const satisfies readonly string[];

export const SEGUIMIENTOS_FOLLOWUP_DERIVED_READONLY_FIELDS = [
  "seguimiento_numero",
  "item_labels",
  "empresa_item_labels",
] as const satisfies readonly string[];

export const SEGUIMIENTOS_FINAL_DERIVED_READONLY_FIELDS = [
  "formulaIntegrity",
  "fields",
  "issues",
] as const satisfies readonly string[];

export const SEGUIMIENTOS_BASE_STAGE_RULE: SeguimientosStageRule = {
  stageId: SEGUIMIENTOS_BASE_STAGE_ID,
  kind: "base",
  label: "Ficha inicial",
  title: "Ficha inicial",
  writableFields: SEGUIMIENTOS_BASE_WRITABLE_FIELDS,
  trackedWritableFields: SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS,
  minimumRequiredFields: SEGUIMIENTOS_BASE_MINIMUM_REQUIRED_FIELDS,
  derivedReadonlyFields: SEGUIMIENTOS_BASE_DERIVED_READONLY_FIELDS,
  progressThresholdPercent: SEGUIMIENTOS_PROGRESS_THRESHOLD_PERCENT,
  supportsOverride: true,
  supportsCopyForward: false,
  supportsPdfExport: true,
  supportsFailedVisitPreset: false,
};

export const SEGUIMIENTOS_FINAL_STAGE_RULE: SeguimientosStageRule = {
  stageId: SEGUIMIENTOS_FINAL_STAGE_ID,
  kind: "final",
  label: "Resultado final",
  title: "Resultado final",
  writableFields: [],
  trackedWritableFields: [],
  minimumRequiredFields: [],
  derivedReadonlyFields: SEGUIMIENTOS_FINAL_DERIVED_READONLY_FIELDS,
  progressThresholdPercent: 0,
  supportsOverride: false,
  supportsCopyForward: false,
  supportsPdfExport: false,
  supportsFailedVisitPreset: false,
};

function hasFilledValue(source: unknown, path: string) {
  const value = getSeguimientosValueAtPath(source, path);

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return Boolean(value);
}

function buildProgressSnapshot(options: {
  values: unknown;
  trackedWritableFields: readonly string[];
  minimumRequiredFields: readonly string[];
  progressThresholdPercent?: number;
}) {
  const filled = options.trackedWritableFields.filter((fieldPath) =>
    hasFilledValue(options.values, fieldPath)
  ).length;
  const total = options.trackedWritableFields.length;
  const coveragePercent =
    total > 0 ? Math.trunc((filled * 100) / total) : 0;
  const meetsMinimumRequirements = options.minimumRequiredFields.every(
    (fieldPath) => hasFilledValue(options.values, fieldPath)
  );
  const hasMeaningfulContent = filled > 0;
  const isCompleted =
    hasMeaningfulContent &&
    meetsMinimumRequirements &&
    coveragePercent >=
      (options.progressThresholdPercent ??
        SEGUIMIENTOS_PROGRESS_THRESHOLD_PERCENT);

  let status: SeguimientosStageStatus = "not_started";
  if (isCompleted) {
    status = "completed";
  } else if (hasMeaningfulContent) {
    status = "in_progress";
  }

  return {
    filled,
    total,
    coveragePercent,
    hasMeaningfulContent,
    meetsMinimumRequirements,
    status,
    isCompleted,
  } satisfies SeguimientosProgressSnapshot;
}

function buildSeguimientosPdfOption(
  option: Omit<SeguimientosPdfOption, "enabled" | "disabledReason"> & {
    disabledReason?: string | null;
  }
) {
  const disabledReason = option.disabledReason?.trim() || null;

  return {
    ...option,
    enabled: disabledReason === null,
    disabledReason,
  } satisfies SeguimientosPdfOption;
}

function matchesSeguimientosFailedVisitFieldGroup(
  values: SeguimientosFollowupValues,
  group: (typeof SEGUIMIENTOS_FOLLOWUP_FAILED_VISIT_PRESET.fieldGroups)[number]
) {
  return group.paths.every((fieldPath) => {
    const value = getSeguimientosValueAtPath(values, fieldPath);
    return String(value ?? "").trim() === group.value;
  });
}

export function isSeguimientosFailedVisitFollowupExportReady(options: {
  baseValues: Partial<SeguimientosBaseValues> | Record<string, unknown>;
  followupValues: Partial<SeguimientosFollowupValues> | Record<string, unknown>;
  followupIndex: SeguimientosFollowupIndex;
}) {
  const normalizedFollowupValues = normalizeSeguimientosFollowupValues(
    options.followupValues,
    options.followupIndex
  );
  const fechaSeguimiento =
    normalizedFollowupValues.fecha_seguimiento ||
    getSeguimientosFollowupDateFromBase(
      options.baseValues,
      options.followupIndex
    ) ||
    null;

  if (!fechaSeguimiento) {
    return false;
  }

  return SEGUIMIENTOS_FOLLOWUP_FAILED_VISIT_PRESET.fieldGroups.every((group) =>
    matchesSeguimientosFailedVisitFieldGroup(normalizedFollowupValues, group)
  );
}

export function getSeguimientosFollowupStageRule(
  index: SeguimientosFollowupIndex
): SeguimientosStageRule {
  return {
    stageId: buildSeguimientosFollowupStageId(index),
    kind: "followup",
    label: `Seguimiento ${index}`,
    title: `Seguimiento ${index}`,
    followupIndex: index,
    writableFields: SEGUIMIENTOS_FOLLOWUP_WRITABLE_FIELDS,
    trackedWritableFields: SEGUIMIENTOS_FOLLOWUP_TRACKED_WRITABLE_FIELDS,
    minimumRequiredFields: SEGUIMIENTOS_FOLLOWUP_MINIMUM_REQUIRED_FIELDS,
    derivedReadonlyFields: SEGUIMIENTOS_FOLLOWUP_DERIVED_READONLY_FIELDS,
    progressThresholdPercent: SEGUIMIENTOS_PROGRESS_THRESHOLD_PERCENT,
    supportsOverride: true,
    supportsCopyForward: index > 1,
    supportsPdfExport: true,
    supportsFailedVisitPreset: true,
  };
}

export function getSeguimientosStageRule(
  stageId: SeguimientosStageId
): SeguimientosStageRule {
  if (stageId === SEGUIMIENTOS_BASE_STAGE_ID) {
    return SEGUIMIENTOS_BASE_STAGE_RULE;
  }

  if (stageId === SEGUIMIENTOS_FINAL_STAGE_ID) {
    return SEGUIMIENTOS_FINAL_STAGE_RULE;
  }

  const followupIndex = parseSeguimientosFollowupStageId(stageId);
  if (!followupIndex) {
    throw new Error(`Unknown seguimientos stage id: ${stageId}`);
  }

  return getSeguimientosFollowupStageRule(followupIndex);
}

export function getSeguimientosStageRules(
  companyType: SeguimientosCompanyType
) {
  return [
    SEGUIMIENTOS_BASE_STAGE_RULE,
    ...getSeguimientosVisibleFollowupIndexes(companyType).map((index) =>
      getSeguimientosFollowupStageRule(index)
    ),
    SEGUIMIENTOS_FINAL_STAGE_RULE,
  ] as const;
}

export function buildSeguimientosBaseProgress(
  values: Partial<SeguimientosBaseValues> | Record<string, unknown>
) {
  return buildProgressSnapshot({
    values: normalizeSeguimientosBaseValues(values),
    trackedWritableFields: SEGUIMIENTOS_BASE_TRACKED_WRITABLE_FIELDS,
    minimumRequiredFields: SEGUIMIENTOS_BASE_MINIMUM_REQUIRED_FIELDS,
  });
}

export function buildSeguimientosFollowupProgress(
  values: Partial<SeguimientosFollowupValues> | Record<string, unknown>,
  index: SeguimientosFollowupIndex
) {
  return buildProgressSnapshot({
    values: normalizeSeguimientosFollowupValues(values, index),
    trackedWritableFields: SEGUIMIENTOS_FOLLOWUP_TRACKED_WRITABLE_FIELDS,
    minimumRequiredFields: SEGUIMIENTOS_FOLLOWUP_MINIMUM_REQUIRED_FIELDS,
  });
}

type SeguimientosWorkflowInput = {
  companyType: SeguimientosCompanyType;
  baseValues?: Partial<SeguimientosBaseValues> | Record<string, unknown> | null;
  persistedBaseValues?:
    | Partial<SeguimientosBaseValues>
    | Record<string, unknown>
    | null;
  followups?: Partial<
    Record<
      SeguimientosFollowupIndex,
      Partial<SeguimientosFollowupValues> | Record<string, unknown> | null
    >
  >;
  persistedFollowups?: Partial<
    Record<
      SeguimientosFollowupIndex,
      Partial<SeguimientosFollowupValues> | Record<string, unknown> | null
    >
  >;
  activeStageId?: SeguimientosStageId | null;
  overrideUnlockedStageIds?: readonly SeguimientosEditableStageId[];
};

function buildStageHelperText(options: {
  rule: SeguimientosStageRule;
  state: Pick<
    SeguimientosStageState,
    "status" | "isSuggested" | "isProtectedByDefault" | "overrideActive"
  >;
}) {
  const { rule, state } = options;

  if (rule.kind === "final") {
    return "Consolidado automatico del caso. Solo lectura.";
  }

  if (rule.kind === "base") {
    if (state.overrideActive) {
      return "Ficha inicial desbloqueada temporalmente para correccion.";
    }

    if (state.isProtectedByDefault) {
      return "La ficha inicial ya tiene informacion guardada. Usa Override si necesitas corregirla.";
    }

    if (state.isSuggested && state.status !== "completed") {
      return "Empieza aqui para dejar lista la ficha inicial del caso.";
    }

    if (state.status === "completed") {
      return "La ficha inicial esta lista y soporta seguimientos y PDF.";
    }

    if (state.status === "in_progress") {
      return "Completa los datos base del caso antes de continuar con el siguiente seguimiento.";
    }

    return "Registra la visita, el contexto del vinculado y los apoyos requeridos.";
  }

  const followupIndex = rule.followupIndex ?? 0;

  if (state.overrideActive) {
    return `Seguimiento ${followupIndex} desbloqueado temporalmente para correccion.`;
  }

  if (state.isProtectedByDefault) {
    return `Seguimiento ${followupIndex} protegido por defecto para evitar cambios accidentales.`;
  }

  if (state.status === "completed") {
    return `Seguimiento ${followupIndex} registrado. Puedes revisarlo o exportarlo con la ficha inicial.`;
  }

  if (state.isSuggested) {
    return `Esta es la etapa sugerida para continuar con Seguimiento ${followupIndex}.`;
  }

  if (state.status === "in_progress") {
    return `Seguimiento ${followupIndex} en curso.`;
  }

  return `Seguimiento ${followupIndex} pendiente por diligenciar.`;
}

function shouldProtectStageByDefault(options: {
  rule: SeguimientosStageRule;
  persistedStatus: SeguimientosStageStatus;
  overrideUnlockedStageIds: readonly SeguimientosEditableStageId[];
}) {
  if (options.rule.kind === "final") {
    return false;
  }

  if (
    options.overrideUnlockedStageIds.includes(
      options.rule.stageId as SeguimientosEditableStageId
    )
  ) {
    return false;
  }

  return options.persistedStatus === "completed";
}

export function getSuggestedSeguimientosStageId(
  input: Omit<SeguimientosWorkflowInput, "activeStageId" | "overrideUnlockedStageIds">
) {
  const baseValues = normalizeSeguimientosBaseValues(
    input.baseValues ?? createEmptySeguimientosBaseValues()
  );
  const baseProgress = buildSeguimientosBaseProgress(baseValues);

  if (!baseProgress.isCompleted) {
    return SEGUIMIENTOS_BASE_STAGE_ID;
  }

  for (const followupIndex of getSeguimientosVisibleFollowupIndexes(input.companyType)) {
    const followupValues = normalizeSeguimientosFollowupValues(
      input.followups?.[followupIndex] ?? createEmptySeguimientosFollowupValues(followupIndex),
      followupIndex
    );
    const followupProgress = buildSeguimientosFollowupProgress(
      followupValues,
      followupIndex
    );

    if (!followupProgress.isCompleted) {
      return buildSeguimientosFollowupStageId(followupIndex);
    }
  }

  return SEGUIMIENTOS_FINAL_STAGE_ID;
}

export function buildSeguimientosWorkflow(
  input: SeguimientosWorkflowInput
): SeguimientosWorkflow {
  const baseValues = normalizeSeguimientosBaseValues(
    input.baseValues ?? createEmptySeguimientosBaseValues()
  );
  const persistedBaseValues = normalizeSeguimientosBaseValues(
    input.persistedBaseValues ?? input.baseValues ?? createEmptySeguimientosBaseValues()
  );
  const suggestedStageId = getSuggestedSeguimientosStageId({
    companyType: input.companyType,
    baseValues,
    followups: input.followups,
  });
  const overrideUnlockedStageIds = [...(input.overrideUnlockedStageIds ?? [])];
  const stageRules = getSeguimientosStageRules(input.companyType);

  const stageStates = stageRules.map((rule) => {
    if (rule.kind === "final") {
      const isSuggested = rule.stageId === suggestedStageId;

      const finalState: SeguimientosStageState = {
        stageId: rule.stageId,
        kind: rule.kind,
        label: rule.label,
        title: rule.title,
        status: "review_only",
        progress: {
          filled: 0,
          total: 0,
          coveragePercent: 0,
          hasMeaningfulContent: true,
          meetsMinimumRequirements: true,
          status: "review_only",
          isCompleted: false,
        },
        isSuggested,
        isEditable: false,
        isProtectedByDefault: false,
        supportsOverride: false,
        supportsCopyForward: false,
        supportsFailedVisitPreset: false,
        overrideActive: false,
        helperText: buildStageHelperText({
          rule,
          state: {
            status: "review_only",
            isSuggested,
            isProtectedByDefault: false,
            overrideActive: false,
          },
        }),
      };

      return finalState;
    }

    if (rule.kind === "base") {
      const progress = buildSeguimientosBaseProgress(baseValues);
      const persistedProgress = buildSeguimientosBaseProgress(persistedBaseValues);
      const isSuggested = rule.stageId === suggestedStageId;
      const isProtectedByDefault = shouldProtectStageByDefault({
        rule,
        persistedStatus: persistedProgress.status,
        overrideUnlockedStageIds,
      });
      const overrideActive =
        !isProtectedByDefault &&
        overrideUnlockedStageIds.includes(rule.stageId as SeguimientosEditableStageId);

      return {
        stageId: rule.stageId,
        kind: rule.kind,
        label: rule.label,
        title: rule.title,
        status: progress.status,
        progress,
        isSuggested,
        isEditable: !isProtectedByDefault,
        isProtectedByDefault,
        supportsOverride: rule.supportsOverride,
        supportsCopyForward: rule.supportsCopyForward,
        supportsFailedVisitPreset: rule.supportsFailedVisitPreset,
        overrideActive,
        helperText: buildStageHelperText({
          rule,
          state: {
            status: progress.status,
            isSuggested,
            isProtectedByDefault,
            overrideActive,
          },
        }),
      } satisfies SeguimientosStageState;
    }

    const followupIndex = rule.followupIndex as SeguimientosFollowupIndex;
    const followupValues = normalizeSeguimientosFollowupValues(
      input.followups?.[followupIndex] ??
        createEmptySeguimientosFollowupValues(followupIndex),
      followupIndex
    );
    const persistedFollowupValues = normalizeSeguimientosFollowupValues(
      input.persistedFollowups?.[followupIndex] ??
        input.followups?.[followupIndex] ??
        createEmptySeguimientosFollowupValues(followupIndex),
      followupIndex
    );
    const progress = buildSeguimientosFollowupProgress(
      followupValues,
      followupIndex
    );
    const persistedProgress = buildSeguimientosFollowupProgress(
      persistedFollowupValues,
      followupIndex
    );
    const isSuggested = rule.stageId === suggestedStageId;
    const isProtectedByDefault = shouldProtectStageByDefault({
      rule,
      persistedStatus: persistedProgress.status,
      overrideUnlockedStageIds,
    });
    const overrideActive =
      !isProtectedByDefault &&
      overrideUnlockedStageIds.includes(rule.stageId as SeguimientosEditableStageId);

    return {
      stageId: rule.stageId,
      kind: rule.kind,
      label: rule.label,
      title: rule.title,
      followupIndex,
      status: progress.status,
      progress,
      isSuggested,
      isEditable: !isProtectedByDefault,
      isProtectedByDefault,
      supportsOverride: rule.supportsOverride,
      supportsCopyForward: rule.supportsCopyForward,
      supportsFailedVisitPreset: rule.supportsFailedVisitPreset,
      overrideActive,
      helperText: buildStageHelperText({
        rule,
        state: {
          status: progress.status,
          isSuggested,
          isProtectedByDefault,
          overrideActive,
        },
      }),
    } satisfies SeguimientosStageState;
  });

  const visibleStageIds = stageStates.map((stage) => stage.stageId);
  const safeActiveStageId =
    input.activeStageId && visibleStageIds.includes(input.activeStageId)
      ? input.activeStageId
      : suggestedStageId;
  const completedStageIds = stageStates
    .filter((stage) => stage.progress.isCompleted)
    .map((stage) => stage.stageId);
  const completedFollowupIndexes = stageStates
    .filter((stage) => stage.kind === "followup" && stage.progress.isCompleted)
    .map((stage) => stage.followupIndex as SeguimientosFollowupIndex);

  let message = "Empieza por la ficha inicial del proceso.";
  if (suggestedStageId === SEGUIMIENTOS_FINAL_STAGE_ID) {
    message = "Todos los seguimientos visibles ya quedaron diligenciados.";
  } else {
    const suggestedFollowupIndex =
      parseSeguimientosFollowupStageId(suggestedStageId) ?? null;
    if (suggestedFollowupIndex === 1) {
      message = "La ficha inicial esta lista. Continua con Seguimiento 1.";
    } else if (suggestedFollowupIndex) {
      message = `Continua con Seguimiento ${suggestedFollowupIndex}.`;
    }
  }

  return {
    companyType: input.companyType,
    maxFollowups: getSeguimientosMaxFollowups(input.companyType),
    suggestedStageId,
    activeStageId: safeActiveStageId,
    visibleStageIds,
    completedStageIds,
    completedFollowupIndexes,
    overrideUnlockedStageIds,
    stageStates,
    message,
  };
}

export function listSeguimientosPdfOptions(
  input: Omit<SeguimientosWorkflowInput, "activeStageId" | "overrideUnlockedStageIds"> & {
    summary?: Pick<SeguimientosFinalSummary, "exportReady"> | null;
  }
) {
  const baseValues = normalizeSeguimientosBaseValues(
    input.baseValues ?? createEmptySeguimientosBaseValues()
  );
  const baseProgress = buildSeguimientosBaseProgress(baseValues);
  const options: SeguimientosPdfOption[] = [];

  options.push(
    buildSeguimientosPdfOption({
      id: "base_only",
      label: "Solo ficha inicial",
      includesBase: true,
      fechaSeguimiento: null,
      includeFinalSummary: false,
      disabledReason: baseProgress.isCompleted
        ? null
        : "Ficha inicial aun no esta lista",
    })
  );

  for (const followupIndex of getSeguimientosVisibleFollowupIndexes(input.companyType)) {
    const followupValues = normalizeSeguimientosFollowupValues(
      input.followups?.[followupIndex] ?? createEmptySeguimientosFollowupValues(followupIndex),
      followupIndex
    );
    const progress = buildSeguimientosFollowupProgress(
      followupValues,
      followupIndex
    );

    const fechaSeguimiento =
      followupValues.fecha_seguimiento ||
      getSeguimientosFollowupDateFromBase(baseValues, followupIndex) ||
      null;
    const isFailedVisitExportReady = isSeguimientosFailedVisitFollowupExportReady(
      {
        baseValues,
        followupValues,
        followupIndex,
      }
    );
    const followupDisabledReason = !baseProgress.isCompleted
      ? "Ficha inicial aun no esta lista"
      : !progress.hasMeaningfulContent
        ? `Seguimiento ${followupIndex} aun no esta guardado`
        : !fechaSeguimiento
          ? `Seguimiento ${followupIndex} no tiene una fecha valida para exportacion`
          : progress.isCompleted || isFailedVisitExportReady
            ? null
            : `Seguimiento ${followupIndex} aun no esta listo para exportacion`;

    options.push(
      buildSeguimientosPdfOption({
        id: `base_plus_followup_${followupIndex}`,
        label: `Ficha inicial + Seguimiento ${followupIndex}`,
        includesBase: true,
        followupIndex,
        fechaSeguimiento,
        includeFinalSummary: false,
        disabledReason: followupDisabledReason,
      })
    );

    options.push(
      buildSeguimientosPdfOption({
        id: `base_plus_followup_${followupIndex}_plus_final`,
        label: `Ficha inicial + Seguimiento ${followupIndex} + Consolidado`,
        includesBase: true,
        followupIndex,
        fechaSeguimiento,
        includeFinalSummary: true,
        disabledReason:
          followupDisabledReason ??
          (input.summary?.exportReady
            ? null
            : "El consolidado final aun no esta completo"),
      })
    );
  }

  return options;
}

export function syncBaseTimelineWithFollowup(
  baseValues: Partial<SeguimientosBaseValues> | Record<string, unknown>,
  followupIndex: SeguimientosFollowupIndex,
  followupValues: Partial<SeguimientosFollowupValues> | Record<string, unknown>
) {
  const normalizedFollowup = normalizeSeguimientosFollowupValues(
    followupValues,
    followupIndex
  );

  return applySeguimientosFollowupDateToBase(
    baseValues,
    followupIndex,
    normalizedFollowup.fecha_seguimiento
  );
}
