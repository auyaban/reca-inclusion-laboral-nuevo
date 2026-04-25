import {
  getDefaultAsistentesForMode,
  normalizePersistedAsistentesForMode,
} from "@/lib/asistentes";
import {
  getDefaultFailedVisitAuditFields,
  normalizeFailedVisitAuditValue,
} from "@/lib/failedVisitContract";
import { normalizeModalidad } from "@/lib/modalidad";
import {
  getDefaultRepeatedPeopleRows,
  normalizeRestoredRepeatedPeopleRows,
  type RepeatedPeopleConfig,
} from "@/lib/repeatedPeople";
import {
  deriveAgeFromBirthDate,
  normalizeContractDateText,
  normalizeSeleccionTipoPension,
} from "@/lib/personFieldDerivations";
export {
  appendSeleccionAdjustmentHelper,
  appendSeleccionAdjustmentStatements,
  getSeleccionAdjustmentHelper,
  getSeleccionAdjustmentHelpers,
  getSeleccionAdjustmentStatementsByHelperId,
  getSeleccionDisabilityProfileLabel,
  getSeleccionDisabilityProfilesForValue,
  getSeleccionDisabilityProfilesFromRows,
  getSeleccionRecommendationHelperPreview,
  getSuggestedSeleccionAdjustmentStatementsByProfiles,
  getUniversalSeleccionAdjustmentStatements,
  groupSeleccionHelpersByCategory,
  groupSeleccionStatementsByCategory,
  SELECCION_ADJUSTMENT_CATEGORIES,
  SELECCION_ADJUSTMENT_STATEMENTS,
  SELECCION_RECOMMENDATION_HELPERS,
} from "@/lib/seleccionAdjustmentLibrary";
export type {
  SeleccionAdjustmentStatement,
  SeleccionAdjustmentStatementId,
} from "@/lib/seleccionAdjustmentLibrary";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  SELECCION_OFERENTE_FIELDS,
  SELECCION_OFERENTE_MEANINGFUL_FIELDS,
  SELECCION_OFERENTE_REQUIRED_FIELDS,
  type SeleccionOferenteFieldId,
  type SeleccionOferenteRow,
  type SeleccionValues,
} from "@/lib/validations/seleccion";

function getRepeatedPersonSummary(name: unknown, cedula: unknown) {
  const normalizedName = normalizeTextValue(name, "").trim();
  const normalizedCedula = normalizeTextValue(cedula, "").trim();

  if (normalizedName && normalizedCedula) {
    return `${normalizedName} - ${normalizedCedula}`;
  }

  if (normalizedName) {
    return normalizedName;
  }

  if (normalizedCedula) {
    return normalizedCedula;
  }

  return null;
}

export const SELECCION_OFERENTES_CONFIG: RepeatedPeopleConfig<SeleccionOferenteRow> =
  {
    itemLabelSingular: "Oferente",
    itemLabelPlural: "Oferentes",
    primaryNameField: "nombre_oferente",
    meaningfulFieldIds: [...SELECCION_OFERENTE_MEANINGFUL_FIELDS],
    getCardTitle: (_row, index) => `Oferente ${index + 1}`,
    getCardSubtitle: (row) =>
      getRepeatedPersonSummary(row.nombre_oferente, row.cedula),
    orderField: "numero",
    createEmptyRow: createEmptySeleccionOferenteRow,
  };

function normalizeTextValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getRowCandidate(row: unknown) {
  return row && typeof row === "object" ? (row as Record<string, unknown>) : {};
}

function extractLegacyDesarrolloActividad(
  values: Partial<SeleccionValues> | Record<string, unknown>
) {
  if (
    typeof values.desarrollo_actividad === "string" &&
    values.desarrollo_actividad.trim()
  ) {
    return values.desarrollo_actividad;
  }

  const rawRows = Array.isArray(values.oferentes) ? values.oferentes : [];
  for (const row of rawRows) {
    const candidate = getRowCandidate(row);
    if (
      typeof candidate.desarrollo_actividad === "string" &&
      candidate.desarrollo_actividad.trim()
    ) {
      return candidate.desarrollo_actividad;
    }
  }

  return "";
}

export function createEmptySeleccionOferenteRow(): SeleccionOferenteRow {
  const row = {} as SeleccionOferenteRow;

  (SELECCION_OFERENTE_FIELDS.map((field) => field.id) as readonly SeleccionOferenteFieldId[]).forEach(
    (fieldId) => {
      row[fieldId] = "";
    }
  );

  return row;
}

export function normalizeSeleccionOferenteRow(
  row: unknown,
  index: number
): SeleccionOferenteRow {
  const candidate = getRowCandidate(row);
  const normalized = {
    ...createEmptySeleccionOferenteRow(),
  };

  (
    SELECCION_OFERENTE_FIELDS.map((field) => field.id) as readonly SeleccionOferenteFieldId[]
  ).forEach((fieldId) => {
    normalized[fieldId] = normalizeTextValue(candidate[fieldId], "");
  });

  normalized.numero = String(index + 1);
  normalized.fecha_firma_contrato = normalizeContractDateText(
    normalized.fecha_firma_contrato
  );
  normalized.tipo_pension = normalizeSeleccionTipoPension(
    normalized.cuenta_pension,
    normalized.tipo_pension
  );
  normalized.edad = deriveAgeFromBirthDate(normalized.fecha_nacimiento);

  return normalized;
}

export function normalizeSeleccionOferentes(rows: unknown) {
  return normalizeRestoredRepeatedPeopleRows(rows, SELECCION_OFERENTES_CONFIG).map(
    (row, index) => normalizeSeleccionOferenteRow(row, index)
  );
}

export function getDefaultSeleccionValues(
  empresa?: Empresa | null
): SeleccionValues {
  return {
    ...getDefaultFailedVisitAuditFields(),
    fecha_visita: new Date().toISOString().split("T")[0],
    modalidad: "Presencial",
    nit_empresa: empresa?.nit_empresa ?? "",
    desarrollo_actividad: "",
    ajustes_recomendaciones: "",
    nota: "",
    oferentes: getDefaultRepeatedPeopleRows(SELECCION_OFERENTES_CONFIG).map(
      (row, index) => normalizeSeleccionOferenteRow(row, index)
    ),
    asistentes: getDefaultAsistentesForMode({
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

export function normalizeSeleccionValues(
  values: Partial<SeleccionValues> | Record<string, unknown>,
  empresa?: Empresa | null
): SeleccionValues {
  const defaults = getDefaultSeleccionValues(empresa);
  const source = values as Partial<SeleccionValues> & Record<string, unknown>;

  return {
    failed_visit_applied_at: normalizeFailedVisitAuditValue(
      source.failed_visit_applied_at
    ),
    fecha_visita:
      typeof source.fecha_visita === "string" && source.fecha_visita.trim()
        ? source.fecha_visita
        : defaults.fecha_visita,
    modalidad: normalizeModalidad(source.modalidad, defaults.modalidad),
    nit_empresa:
      typeof source.nit_empresa === "string" && source.nit_empresa.trim()
        ? source.nit_empresa
        : defaults.nit_empresa,
    desarrollo_actividad:
      extractLegacyDesarrolloActividad(source) || defaults.desarrollo_actividad,
    ajustes_recomendaciones: normalizeTextValue(
      source.ajustes_recomendaciones,
      defaults.ajustes_recomendaciones
    ),
    nota: normalizeTextValue(source.nota, defaults.nota),
    oferentes: normalizeSeleccionOferentes(source.oferentes),
    asistentes: normalizePersistedAsistentesForMode(source.asistentes, {
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

function isFilled(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

export function isSeleccionOferenteComplete(row: SeleccionOferenteRow) {
  return SELECCION_OFERENTE_REQUIRED_FIELDS.every((fieldId) =>
    isFilled(row[fieldId])
  );
}

