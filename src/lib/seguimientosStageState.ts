import {
  applySeguimientosFollowupDateToBase,
  buildSeguimientosFollowupStageId,
  getSeguimientosVisibleFollowupIndexes,
  normalizeSeguimientosBaseValues,
  normalizeSeguimientosFollowupValues,
  parseSeguimientosFollowupStageId,
  type SeguimientosBaseValues,
  type SeguimientosCompanyType,
  type SeguimientosEditableStageId,
  type SeguimientosFollowupIndex,
  type SeguimientosFollowupValues,
  type SeguimientosStageDraftStateByStageId,
  type SeguimientosStageId,
} from "@/lib/seguimientos";
import {
  getSeguimientosStageRule,
  SEGUIMIENTOS_FOLLOWUP_WRITABLE_FIELDS,
} from "@/lib/seguimientosStages";
import {
  getSeguimientosValueAtPath,
  setSeguimientosValueAtPath,
} from "@/lib/seguimientosPathAccess";

export type SeguimientosModifiedFieldIdsByStageId = Partial<
  Record<SeguimientosEditableStageId, string[]>
>;

function normalizeComparableValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function getNormalizedStageValues(options: {
  stageId: SeguimientosEditableStageId;
  baseValues: Partial<SeguimientosBaseValues> | Record<string, unknown>;
  followupValuesByIndex: Partial<Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>>;
}) {
  if (options.stageId === "base_process") {
    return normalizeSeguimientosBaseValues(options.baseValues);
  }

  const followupIndex = parseSeguimientosFollowupStageId(options.stageId);
  if (!followupIndex) {
    throw new Error(`Unknown Seguimientos stage id: ${options.stageId}`);
  }

  return normalizeSeguimientosFollowupValues(
    options.followupValuesByIndex[followupIndex] ?? {},
    followupIndex
  );
}

const AUTO_SEEDED_FIRST_ASISTENTE_FIELD_IDS = new Set<string>([
  "asistentes.0.nombre",
  "asistentes.0.cargo",
]);

function shouldIgnoreAutoSeededFirstAsistenteField(options: {
  stageId: SeguimientosEditableStageId;
  path: string;
  currentValues: Record<string, unknown>;
  persistedValues: Record<string, unknown>;
  stageDraftStateByStageId?: SeguimientosStageDraftStateByStageId;
}) {
  if (
    options.stageId === "base_process" ||
    !AUTO_SEEDED_FIRST_ASISTENTE_FIELD_IDS.has(options.path)
  ) {
    return false;
  }

  const autoSeededFirstAsistente =
    options.stageDraftStateByStageId?.[options.stageId]?.autoSeededFirstAsistente;
  if (!autoSeededFirstAsistente?.pendingConfirmation) {
    return false;
  }

  const persistedValue = normalizeComparableValue(
    getSeguimientosValueAtPath(options.persistedValues, options.path)
  );
  if (persistedValue) {
    return false;
  }

  const baselineValue = normalizeComparableValue(
    options.path.endsWith(".nombre")
      ? autoSeededFirstAsistente.nombre
      : autoSeededFirstAsistente.cargo
  );
  if (!baselineValue) {
    return false;
  }

  const currentValue = normalizeComparableValue(
    getSeguimientosValueAtPath(options.currentValues, options.path)
  );

  return currentValue === baselineValue;
}

export function listSeguimientosModifiedFieldIds(options: {
  stageId: SeguimientosEditableStageId;
  currentBaseValues: Partial<SeguimientosBaseValues> | Record<string, unknown>;
  currentFollowupValuesByIndex: Partial<
    Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
  >;
  persistedBaseValues: Partial<SeguimientosBaseValues> | Record<string, unknown>;
  persistedFollowupValuesByIndex: Partial<
    Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
  >;
  stageDraftStateByStageId?: SeguimientosStageDraftStateByStageId;
}) {
  const rule = getSeguimientosStageRule(options.stageId);
  const currentValues = getNormalizedStageValues({
    stageId: options.stageId,
    baseValues: options.currentBaseValues,
    followupValuesByIndex: options.currentFollowupValuesByIndex,
  });
  const persistedValues = getNormalizedStageValues({
    stageId: options.stageId,
    baseValues: options.persistedBaseValues,
    followupValuesByIndex: options.persistedFollowupValuesByIndex,
  });

  return rule.writableFields.filter((path) => {
    if (
      shouldIgnoreAutoSeededFirstAsistenteField({
        stageId: options.stageId,
        path,
        currentValues,
        persistedValues,
        stageDraftStateByStageId: options.stageDraftStateByStageId,
      })
    ) {
      return false;
    }

    return (
      normalizeComparableValue(
        getSeguimientosValueAtPath(currentValues, path)
      ) !==
      normalizeComparableValue(
        getSeguimientosValueAtPath(persistedValues, path)
      )
    );
  });
}

export function buildSeguimientosModifiedFieldIdsByStageId(options: {
  companyType: SeguimientosCompanyType;
  currentBaseValues: Partial<SeguimientosBaseValues> | Record<string, unknown>;
  currentFollowupValuesByIndex: Partial<
    Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
  >;
  persistedBaseValues: Partial<SeguimientosBaseValues> | Record<string, unknown>;
  persistedFollowupValuesByIndex: Partial<
    Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
  >;
  stageDraftStateByStageId?: SeguimientosStageDraftStateByStageId;
}) {
  const modifiedFieldIdsByStageId: SeguimientosModifiedFieldIdsByStageId = {
    base_process: listSeguimientosModifiedFieldIds({
      stageId: "base_process",
      currentBaseValues: options.currentBaseValues,
      currentFollowupValuesByIndex: options.currentFollowupValuesByIndex,
      persistedBaseValues: options.persistedBaseValues,
      persistedFollowupValuesByIndex: options.persistedFollowupValuesByIndex,
      stageDraftStateByStageId: options.stageDraftStateByStageId,
    }),
  };

  for (const followupIndex of getSeguimientosVisibleFollowupIndexes(options.companyType)) {
    const stageId = buildSeguimientosFollowupStageId(followupIndex);
    modifiedFieldIdsByStageId[stageId] = listSeguimientosModifiedFieldIds({
      stageId,
      currentBaseValues: options.currentBaseValues,
      currentFollowupValuesByIndex: options.currentFollowupValuesByIndex,
      persistedBaseValues: options.persistedBaseValues,
      persistedFollowupValuesByIndex: options.persistedFollowupValuesByIndex,
      stageDraftStateByStageId: options.stageDraftStateByStageId,
    });
  }

  return modifiedFieldIdsByStageId;
}

export function listSeguimientosDirtyStageIds(
  modifiedFieldIdsByStageId: SeguimientosModifiedFieldIdsByStageId
) {
  return Object.entries(modifiedFieldIdsByStageId)
    .filter((entry): entry is [SeguimientosEditableStageId, string[]] => {
      const [stageId, paths] = entry as [SeguimientosEditableStageId, string[] | undefined];
      return Boolean(stageId) && Array.isArray(paths) && paths.length > 0;
    })
    .map(([stageId]) => stageId);
}

export function mergeSeguimientosBaseTimelineFromFollowups(options: {
  baseValues: Partial<SeguimientosBaseValues> | Record<string, unknown>;
  followupValuesByIndex: Partial<
    Record<SeguimientosFollowupIndex, SeguimientosFollowupValues>
  >;
  companyType: SeguimientosCompanyType;
}) {
  let nextBaseValues = normalizeSeguimientosBaseValues(options.baseValues);

  for (const followupIndex of getSeguimientosVisibleFollowupIndexes(options.companyType)) {
    const followupValues = normalizeSeguimientosFollowupValues(
      options.followupValuesByIndex[followupIndex] ?? {},
      followupIndex
    );
    nextBaseValues = applySeguimientosFollowupDateToBase(
      nextBaseValues,
      followupIndex,
      followupValues.fecha_seguimiento
    );
  }

  return nextBaseValues;
}

export function resolveSeguimientosPostSaveActiveStageId(options: {
  activeStageId: SeguimientosEditableStageId;
  suggestedStageId: SeguimientosStageId;
  activeStageOverrideActive: boolean;
}) {
  return options.activeStageId;
}

const COPY_FORWARD_EXCLUDED_PATHS = new Set<string>([
  "fecha_seguimiento",
  "situacion_encontrada",
  "estrategias_ajustes",
  ...SEGUIMIENTOS_FOLLOWUP_WRITABLE_FIELDS.filter(
    (path) =>
      path.startsWith("item_observaciones.") ||
      path.startsWith("empresa_observacion.") ||
      path.startsWith("asistentes.")
  ),
]);

export function copySeguimientosFollowupIntoEmptyFields(options: {
  sourceValues: Partial<SeguimientosFollowupValues> | Record<string, unknown>;
  targetValues: Partial<SeguimientosFollowupValues> | Record<string, unknown>;
  sourceIndex: SeguimientosFollowupIndex;
  targetIndex: SeguimientosFollowupIndex;
}) {
  const sourceValues = normalizeSeguimientosFollowupValues(
    options.sourceValues,
    options.sourceIndex
  );
  const nextValues = structuredClone(
    normalizeSeguimientosFollowupValues(options.targetValues, options.targetIndex)
  ) as Record<string, unknown>;

  for (const path of SEGUIMIENTOS_FOLLOWUP_WRITABLE_FIELDS) {
    if (COPY_FORWARD_EXCLUDED_PATHS.has(path)) {
      continue;
    }

    const currentValue = normalizeComparableValue(
      getSeguimientosValueAtPath(nextValues, path)
    );
    if (currentValue) {
      continue;
    }

    const sourceValue = normalizeComparableValue(
      getSeguimientosValueAtPath(sourceValues, path)
    );
    if (!sourceValue) {
      continue;
    }

    setSeguimientosValueAtPath(nextValues, path, sourceValue);
  }

  return normalizeSeguimientosFollowupValues(nextValues, options.targetIndex);
}
