import {
  getDefaultAsistentesForMode,
  isMeaningfulAsistente,
  normalizeAsistenteLike,
  normalizeRestoredAsistentesForMode,
  type Asistente,
} from "@/lib/asistentes";
import {
  MODALIDAD_OPTIONS,
  normalizeModalidad,
  type ModalidadValue,
} from "@/lib/modalidad";
import { getEmpresaSedeCompensarValue } from "@/lib/empresaFields";
import { normalizeSeguimientosDateTextValue } from "@/lib/seguimientosDates";
import type { Empresa } from "@/lib/store/empresaStore";

export const SEGUIMIENTOS_COMPANY_TYPE_OPTIONS = [
  "compensar",
  "no_compensar",
] as const;

export type SeguimientosCompanyType =
  (typeof SEGUIMIENTOS_COMPANY_TYPE_OPTIONS)[number];

export const SEGUIMIENTOS_SI_NO_NA_OPTIONS = [
  "Si",
  "No",
  "No aplica",
] as const;

export type SeguimientosSiNoNaValue =
  (typeof SEGUIMIENTOS_SI_NO_NA_OPTIONS)[number];

export const SEGUIMIENTOS_EVAL_OPTIONS = [
  "Excelente",
  "Bien",
  "Necesita mejorar",
  "Mal",
  "No aplica",
] as const;

export type SeguimientosEvalValue = (typeof SEGUIMIENTOS_EVAL_OPTIONS)[number];

export const SEGUIMIENTOS_TIPO_APOYO_OPTIONS = [
  "Requiere apoyo bajo.",
  "Requiere apoyo medio.",
  "Requiere apoyo Alto.",
  "No requiere apoyo.",
] as const;

export type SeguimientosTipoApoyoValue =
  (typeof SEGUIMIENTOS_TIPO_APOYO_OPTIONS)[number];

export const SEGUIMIENTOS_PROGRESS_THRESHOLD_PERCENT = 90;
export const SEGUIMIENTOS_FUNCTION_ITEMS_PER_COLUMN = 5;
export const SEGUIMIENTOS_TIMELINE_BLOCK_SIZE = 3;
export const SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT = 19;
export const SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT = 8;
export const SEGUIMIENTOS_MAX_ATTENDEES = 10;
export const SEGUIMIENTOS_DEFAULT_VISIBLE_ATTENDEES = 2;

export const SEGUIMIENTOS_BASE_STAGE_ID = "base_process";
export const SEGUIMIENTOS_FINAL_STAGE_ID = "final_result";

export type SeguimientosFollowupIndex = 1 | 2 | 3 | 4 | 5 | 6;
export type SeguimientosFollowupStageId = `followup_${SeguimientosFollowupIndex}`;
export type SeguimientosEditableStageId =
  | typeof SEGUIMIENTOS_BASE_STAGE_ID
  | SeguimientosFollowupStageId;
export type SeguimientosStageId =
  | SeguimientosEditableStageId
  | typeof SEGUIMIENTOS_FINAL_STAGE_ID;

export type SeguimientosStageStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "review_only";

export type SeguimientosFormulaIntegrity =
  | "unknown"
  | "healthy"
  | "stale"
  | "broken";

export type SeguimientosModalidadValue = ModalidadValue | "";
export type SeguimientosTipoApoyoDraftValue =
  | SeguimientosTipoApoyoValue
  | "";

export type SeguimientosBaseValues = {
  fecha_visita: string;
  modalidad: SeguimientosModalidadValue;
  nombre_empresa: string;
  ciudad_empresa: string;
  direccion_empresa: string;
  nit_empresa: string;
  correo_1: string;
  telefono_empresa: string;
  contacto_empresa: string;
  cargo: string;
  asesor: string;
  sede_empresa: string;
  caja_compensacion: string;
  profesional_asignado: string;
  nombre_vinculado: string;
  cedula: string;
  telefono_vinculado: string;
  correo_vinculado: string;
  contacto_emergencia: string;
  parentesco: string;
  telefono_emergencia: string;
  cargo_vinculado: string;
  certificado_discapacidad: string;
  certificado_porcentaje: string;
  discapacidad: string;
  tipo_contrato: string;
  fecha_inicio_contrato: string;
  fecha_fin_contrato: string;
  fecha_firma_contrato: string;
  apoyos_ajustes: string;
  funciones_1_5: string[];
  funciones_6_10: string[];
  seguimiento_fechas_1_3: string[];
  seguimiento_fechas_4_6: string[];
};

export type SeguimientosFollowupValues = {
  modalidad: SeguimientosModalidadValue;
  seguimiento_numero: string;
  fecha_seguimiento: string;
  item_labels: string[];
  item_observaciones: string[];
  item_autoevaluacion: string[];
  item_eval_empresa: string[];
  tipo_apoyo: SeguimientosTipoApoyoDraftValue;
  empresa_item_labels: string[];
  empresa_eval: string[];
  empresa_observacion: string[];
  situacion_encontrada: string;
  estrategias_ajustes: string;
  asistentes: Asistente[];
};

export type SeguimientosCaseMeta = {
  caseId: string;
  cedula: string;
  nombreVinculado: string;
  empresaNit: string;
  empresaNombre: string;
  companyType: SeguimientosCompanyType;
  maxFollowups: 3 | 6;
  driveFolderId: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  folderName: string | null;
  baseSheetName: string | null;
  profesionalAsignado: string | null;
  cajaCompensacion: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SeguimientosProgressSnapshot = {
  filled: number;
  total: number;
  coveragePercent: number;
  hasMeaningfulContent: boolean;
  meetsMinimumRequirements: boolean;
  status: SeguimientosStageStatus;
  isCompleted: boolean;
};

export type SeguimientosAutoSeededFirstAsistente = {
  nombre: string | null;
  cargo: string | null;
  pendingConfirmation: boolean;
};

export type SeguimientosStageDraftState = {
  localUpdatedAt: string | null;
  remoteUpdatedAt: string | null;
  lastSavedToSheetsAt: string | null;
  hasLocalChanges: boolean;
  hasRemoteCheckpoint: boolean;
  failedVisitAppliedAt: string | null;
  autoSeededFirstAsistente: SeguimientosAutoSeededFirstAsistente | null;
};

export type SeguimientosStageDraftStateByStageId = Partial<
  Record<SeguimientosEditableStageId, SeguimientosStageDraftState>
>;

export type SeguimientosBaseStageDraft = {
  stageId: typeof SEGUIMIENTOS_BASE_STAGE_ID;
  values: SeguimientosBaseValues;
  progress: SeguimientosProgressSnapshot;
  draft: SeguimientosStageDraftState;
};

export type SeguimientosFollowupStageDraft = {
  stageId: SeguimientosFollowupStageId;
  followupIndex: SeguimientosFollowupIndex;
  values: SeguimientosFollowupValues;
  progress: SeguimientosProgressSnapshot;
  draft: SeguimientosStageDraftState;
};

export type SeguimientosFinalSummary = {
  stageId: typeof SEGUIMIENTOS_FINAL_STAGE_ID;
  status: "review_only";
  formulaIntegrity: SeguimientosFormulaIntegrity;
  formulaValidationMode: "canonical" | "direct_write_only";
  lastVerifiedAt: string | null;
  lastRepairedAt: string | null;
  lastComputedAt: string | null;
  exportReady: boolean;
  fields: Record<string, string>;
  issues: string[];
};

export const SEGUIMIENTOS_FOLLOWUP_INDEXES = [
  1,
  2,
  3,
  4,
  5,
  6,
] as const satisfies readonly SeguimientosFollowupIndex[];

export const SEGUIMIENTOS_MAX_FOLLOWUPS_BY_COMPANY_TYPE = {
  compensar: 6,
  no_compensar: 3,
} as const satisfies Record<SeguimientosCompanyType, 3 | 6>;

export const SEGUIMIENTOS_FINAL_STEP =
  Math.max(...Object.values(SEGUIMIENTOS_MAX_FOLLOWUPS_BY_COMPANY_TYPE)) + 1;

function normalizeTextValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function createEmptyStringArray(length: number) {
  return Array.from({ length }, () => "");
}

function normalizeStringArray(value: unknown, length: number) {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length }, (_, index) =>
    normalizeTextValue(source[index], "")
  );
}

function normalizeAsistentes(value: unknown) {
  const restored = normalizeRestoredAsistentesForMode(value, {
    mode: "reca_plus_generic_attendees",
  })
    .map((asistente) => normalizeAsistenteLike(asistente))
    .slice(0, SEGUIMIENTOS_MAX_ATTENDEES);

  while (
    restored.length > SEGUIMIENTOS_DEFAULT_VISIBLE_ATTENDEES &&
    !isMeaningfulAsistente(restored.at(-1) ?? {})
  ) {
    restored.pop();
  }

  while (restored.length < SEGUIMIENTOS_DEFAULT_VISIBLE_ATTENDEES) {
    restored.push({ nombre: "", cargo: "" });
  }

  return restored;
}

function normalizeSeguimientosModalidad(
  value: unknown,
  fallback: SeguimientosModalidadValue
): SeguimientosModalidadValue {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return fallback;
  }

  if ((MODALIDAD_OPTIONS as readonly string[]).includes(text)) {
    return text as ModalidadValue;
  }

  if (!fallback) {
    return "";
  }

  return normalizeModalidad(text, fallback);
}

export function normalizeSeguimientosCompanyType(
  value: unknown,
  fallback: SeguimientosCompanyType = "no_compensar"
): SeguimientosCompanyType {
  const normalizedValue =
    typeof value === "string" ? value.trim().toLocaleLowerCase("es-CO") : "";

  if (normalizedValue === "compensar") {
    return "compensar";
  }

  if (
    normalizedValue === "no compensar" ||
    normalizedValue === "no_compensar" ||
    normalizedValue === "nocompensar"
  ) {
    return "no_compensar";
  }

  return fallback;
}

export function normalizeSeguimientosTipoApoyo(
  value: unknown,
  fallback: SeguimientosTipoApoyoDraftValue = ""
): SeguimientosTipoApoyoDraftValue {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return fallback;
  }

  if ((SEGUIMIENTOS_TIPO_APOYO_OPTIONS as readonly string[]).includes(text)) {
    return text as SeguimientosTipoApoyoValue;
  }

  return fallback;
}

export function isSeguimientosFollowupIndex(
  value: number
): value is SeguimientosFollowupIndex {
  return SEGUIMIENTOS_FOLLOWUP_INDEXES.includes(
    value as SeguimientosFollowupIndex
  );
}

export function getSeguimientosMaxFollowups(
  companyType: SeguimientosCompanyType
) {
  return SEGUIMIENTOS_MAX_FOLLOWUPS_BY_COMPANY_TYPE[companyType];
}

export function getSeguimientosVisibleFollowupIndexes(
  companyType: SeguimientosCompanyType
) {
  const maxFollowups = getSeguimientosMaxFollowups(companyType);
  return SEGUIMIENTOS_FOLLOWUP_INDEXES.filter((index) => index <= maxFollowups);
}

export function buildSeguimientosFollowupStageId(
  index: SeguimientosFollowupIndex
): SeguimientosFollowupStageId {
  return `followup_${index}`;
}

export function parseSeguimientosFollowupStageId(
  stageId: string
): SeguimientosFollowupIndex | null {
  const match = /^followup_(\d+)$/.exec(stageId.trim());
  if (!match) {
    return null;
  }

  const parsedIndex = Number.parseInt(match[1] ?? "", 10);
  return isSeguimientosFollowupIndex(parsedIndex) ? parsedIndex : null;
}

export function createEmptySeguimientosStageDraftState(): SeguimientosStageDraftState {
  return {
    localUpdatedAt: null,
    remoteUpdatedAt: null,
    lastSavedToSheetsAt: null,
    hasLocalChanges: false,
    hasRemoteCheckpoint: false,
    failedVisitAppliedAt: null,
    autoSeededFirstAsistente: null,
  };
}

export function buildSeguimientosStageDraftStateMap(
  companyType: SeguimientosCompanyType
): SeguimientosStageDraftStateByStageId {
  const stageDraftState: SeguimientosStageDraftStateByStageId = {
    [SEGUIMIENTOS_BASE_STAGE_ID]: createEmptySeguimientosStageDraftState(),
  };

  for (const followupIndex of getSeguimientosVisibleFollowupIndexes(companyType)) {
    stageDraftState[buildSeguimientosFollowupStageId(followupIndex)] =
      createEmptySeguimientosStageDraftState();
  }

  return stageDraftState;
}

export function createEmptySeguimientosFinalSummary(): SeguimientosFinalSummary {
  return {
    stageId: SEGUIMIENTOS_FINAL_STAGE_ID,
    status: "review_only",
    formulaIntegrity: "unknown",
    formulaValidationMode: "direct_write_only",
    lastVerifiedAt: null,
    lastRepairedAt: null,
    lastComputedAt: null,
    exportReady: false,
    fields: {},
    issues: [],
  };
}

function getEmpresaField(
  empresa: Empresa | null | undefined,
  fieldId: keyof Empresa,
  fallback = ""
) {
  const value = empresa?.[fieldId];
  return typeof value === "string" ? value : fallback;
}

export function createEmptySeguimientosBaseValues(
  empresa?: Empresa | null
): SeguimientosBaseValues {
  return {
    fecha_visita: new Date().toISOString().split("T")[0] ?? "",
    modalidad: "Presencial",
    nombre_empresa: getEmpresaField(empresa, "nombre_empresa"),
    ciudad_empresa: getEmpresaField(empresa, "ciudad_empresa"),
    direccion_empresa: getEmpresaField(empresa, "direccion_empresa"),
    nit_empresa: getEmpresaField(empresa, "nit_empresa"),
    correo_1: getEmpresaField(empresa, "correo_1"),
    telefono_empresa: getEmpresaField(empresa, "telefono_empresa"),
    contacto_empresa: getEmpresaField(empresa, "contacto_empresa"),
    cargo: getEmpresaField(empresa, "cargo"),
    asesor: getEmpresaField(empresa, "asesor"),
    sede_empresa: getEmpresaSedeCompensarValue(empresa),
    caja_compensacion: getEmpresaField(empresa, "caja_compensacion"),
    profesional_asignado: getEmpresaField(empresa, "profesional_asignado"),
    nombre_vinculado: "",
    cedula: "",
    telefono_vinculado: "",
    correo_vinculado: "",
    contacto_emergencia: "",
    parentesco: "",
    telefono_emergencia: "",
    cargo_vinculado: "",
    certificado_discapacidad: "",
    certificado_porcentaje: "",
    discapacidad: "",
    tipo_contrato: "",
    fecha_inicio_contrato: "",
    fecha_fin_contrato: "",
    fecha_firma_contrato: "",
    apoyos_ajustes: "",
    funciones_1_5: createEmptyStringArray(
      SEGUIMIENTOS_FUNCTION_ITEMS_PER_COLUMN
    ),
    funciones_6_10: createEmptyStringArray(
      SEGUIMIENTOS_FUNCTION_ITEMS_PER_COLUMN
    ),
    seguimiento_fechas_1_3: createEmptyStringArray(
      SEGUIMIENTOS_TIMELINE_BLOCK_SIZE
    ),
    seguimiento_fechas_4_6: createEmptyStringArray(
      SEGUIMIENTOS_TIMELINE_BLOCK_SIZE
    ),
  };
}

export function normalizeSeguimientosBaseValues(
  values: Partial<SeguimientosBaseValues> | Record<string, unknown>,
  empresa?: Empresa | null
): SeguimientosBaseValues {
  const defaults = createEmptySeguimientosBaseValues(empresa);
  const source = values as Partial<SeguimientosBaseValues>;

  return {
    fecha_visita: normalizeSeguimientosDateTextValue(
      source.fecha_visita,
      defaults.fecha_visita
    ),
    modalidad: normalizeSeguimientosModalidad(
      source.modalidad,
      defaults.modalidad
    ),
    nombre_empresa: normalizeTextValue(
      source.nombre_empresa,
      defaults.nombre_empresa
    ),
    ciudad_empresa: normalizeTextValue(
      source.ciudad_empresa,
      defaults.ciudad_empresa
    ),
    direccion_empresa: normalizeTextValue(
      source.direccion_empresa,
      defaults.direccion_empresa
    ),
    nit_empresa: normalizeTextValue(source.nit_empresa, defaults.nit_empresa),
    correo_1: normalizeTextValue(source.correo_1, defaults.correo_1),
    telefono_empresa: normalizeTextValue(
      source.telefono_empresa,
      defaults.telefono_empresa
    ),
    contacto_empresa: normalizeTextValue(
      source.contacto_empresa,
      defaults.contacto_empresa
    ),
    cargo: normalizeTextValue(source.cargo, defaults.cargo),
    asesor: normalizeTextValue(source.asesor, defaults.asesor),
    sede_empresa: normalizeTextValue(
      source.sede_empresa,
      defaults.sede_empresa
    ),
    caja_compensacion: normalizeTextValue(
      source.caja_compensacion,
      defaults.caja_compensacion
    ),
    profesional_asignado: normalizeTextValue(
      source.profesional_asignado,
      defaults.profesional_asignado
    ),
    nombre_vinculado: normalizeTextValue(
      source.nombre_vinculado,
      defaults.nombre_vinculado
    ),
    cedula: normalizeTextValue(source.cedula, defaults.cedula),
    telefono_vinculado: normalizeTextValue(
      source.telefono_vinculado,
      defaults.telefono_vinculado
    ),
    correo_vinculado: normalizeTextValue(
      source.correo_vinculado,
      defaults.correo_vinculado
    ),
    contacto_emergencia: normalizeTextValue(
      source.contacto_emergencia,
      defaults.contacto_emergencia
    ),
    parentesco: normalizeTextValue(source.parentesco, defaults.parentesco),
    telefono_emergencia: normalizeTextValue(
      source.telefono_emergencia,
      defaults.telefono_emergencia
    ),
    cargo_vinculado: normalizeTextValue(
      source.cargo_vinculado,
      defaults.cargo_vinculado
    ),
    certificado_discapacidad: normalizeTextValue(
      source.certificado_discapacidad,
      defaults.certificado_discapacidad
    ),
    certificado_porcentaje: normalizeTextValue(
      source.certificado_porcentaje,
      defaults.certificado_porcentaje
    ),
    discapacidad: normalizeTextValue(
      source.discapacidad,
      defaults.discapacidad
    ),
    tipo_contrato: normalizeTextValue(
      source.tipo_contrato,
      defaults.tipo_contrato
    ),
    fecha_inicio_contrato: normalizeSeguimientosDateTextValue(
      source.fecha_inicio_contrato,
      defaults.fecha_inicio_contrato
    ),
    fecha_fin_contrato: normalizeSeguimientosDateTextValue(
      source.fecha_fin_contrato,
      defaults.fecha_fin_contrato
    ),
    fecha_firma_contrato: normalizeSeguimientosDateTextValue(
      source.fecha_firma_contrato,
      defaults.fecha_firma_contrato
    ),
    apoyos_ajustes: normalizeTextValue(
      source.apoyos_ajustes,
      defaults.apoyos_ajustes
    ),
    funciones_1_5: normalizeStringArray(
      source.funciones_1_5,
      SEGUIMIENTOS_FUNCTION_ITEMS_PER_COLUMN
    ),
    funciones_6_10: normalizeStringArray(
      source.funciones_6_10,
      SEGUIMIENTOS_FUNCTION_ITEMS_PER_COLUMN
    ),
    seguimiento_fechas_1_3: normalizeStringArray(
      source.seguimiento_fechas_1_3,
      SEGUIMIENTOS_TIMELINE_BLOCK_SIZE
    ),
    seguimiento_fechas_4_6: normalizeStringArray(
      source.seguimiento_fechas_4_6,
      SEGUIMIENTOS_TIMELINE_BLOCK_SIZE
    ),
  };
}

export function createEmptySeguimientosFollowupValues(
  index: SeguimientosFollowupIndex
): SeguimientosFollowupValues {
  return {
    modalidad: "",
    seguimiento_numero: String(index),
    fecha_seguimiento: "",
    item_labels: createEmptyStringArray(SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT),
    item_observaciones: createEmptyStringArray(
      SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT
    ),
    item_autoevaluacion: createEmptyStringArray(
      SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT
    ),
    item_eval_empresa: createEmptyStringArray(SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT),
    tipo_apoyo: "",
    empresa_item_labels: createEmptyStringArray(
      SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT
    ),
    empresa_eval: createEmptyStringArray(
      SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT
    ),
    empresa_observacion: createEmptyStringArray(
      SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT
    ),
    situacion_encontrada: "",
    estrategias_ajustes: "",
    asistentes: getDefaultAsistentesForMode({
      mode: "reca_plus_generic_attendees",
    }),
  };
}

export function normalizeSeguimientosFollowupValues(
  values: Partial<SeguimientosFollowupValues> | Record<string, unknown>,
  index: SeguimientosFollowupIndex
): SeguimientosFollowupValues {
  const defaults = createEmptySeguimientosFollowupValues(index);
  const source = values as Partial<SeguimientosFollowupValues>;

  return {
    modalidad: normalizeSeguimientosModalidad(source.modalidad, defaults.modalidad),
    seguimiento_numero: String(index),
    fecha_seguimiento: normalizeSeguimientosDateTextValue(
      source.fecha_seguimiento,
      defaults.fecha_seguimiento
    ),
    item_labels: normalizeStringArray(
      source.item_labels,
      SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT
    ),
    item_observaciones: normalizeStringArray(
      source.item_observaciones,
      SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT
    ),
    item_autoevaluacion: normalizeStringArray(
      source.item_autoevaluacion,
      SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT
    ),
    item_eval_empresa: normalizeStringArray(
      source.item_eval_empresa,
      SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT
    ),
    tipo_apoyo: normalizeSeguimientosTipoApoyo(
      source.tipo_apoyo,
      defaults.tipo_apoyo
    ),
    empresa_item_labels: normalizeStringArray(
      source.empresa_item_labels,
      SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT
    ),
    empresa_eval: normalizeStringArray(
      source.empresa_eval,
      SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT
    ),
    empresa_observacion: normalizeStringArray(
      source.empresa_observacion,
      SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT
    ),
    situacion_encontrada: normalizeTextValue(
      source.situacion_encontrada,
      defaults.situacion_encontrada
    ),
    estrategias_ajustes: normalizeTextValue(
      source.estrategias_ajustes,
      defaults.estrategias_ajustes
    ),
    asistentes: normalizeAsistentes(source.asistentes),
  };
}

export function getSeguimientosFollowupDateFromBase(
  baseValues: Partial<SeguimientosBaseValues> | Record<string, unknown>,
  followupIndex: SeguimientosFollowupIndex
) {
  const normalizedBase = normalizeSeguimientosBaseValues(baseValues);

  if (followupIndex <= 3) {
    return normalizedBase.seguimiento_fechas_1_3[followupIndex - 1] ?? "";
  }

  return normalizedBase.seguimiento_fechas_4_6[followupIndex - 4] ?? "";
}

export function applySeguimientosFollowupDateToBase(
  baseValues: Partial<SeguimientosBaseValues> | Record<string, unknown>,
  followupIndex: SeguimientosFollowupIndex,
  followupDate: string
) {
  const normalizedBase = normalizeSeguimientosBaseValues(baseValues);
  const normalizedDate = normalizeTextValue(followupDate, "");

  if (followupIndex <= 3) {
    const nextDates = [...normalizedBase.seguimiento_fechas_1_3];
    nextDates[followupIndex - 1] = normalizedDate;
    return {
      ...normalizedBase,
      seguimiento_fechas_1_3: nextDates,
    };
  }

  const nextDates = [...normalizedBase.seguimiento_fechas_4_6];
  nextDates[followupIndex - 4] = normalizedDate;
  return {
    ...normalizedBase,
    seguimiento_fechas_4_6: nextDates,
  };
}

export function createSeguimientosFollowupCopySeed(
  source: Partial<SeguimientosFollowupValues> | Record<string, unknown>,
  targetIndex: SeguimientosFollowupIndex
) {
  const normalizedSource = normalizeSeguimientosFollowupValues(source, targetIndex);

  return {
    ...normalizedSource,
    seguimiento_numero: String(targetIndex),
    fecha_seguimiento: "",
    item_observaciones: createEmptyStringArray(
      SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT
    ),
    empresa_observacion: createEmptyStringArray(
      SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT
    ),
    situacion_encontrada: "",
    estrategias_ajustes: "",
  };
}
