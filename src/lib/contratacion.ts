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
} from "@/lib/personFieldDerivations";
import type { FailedVisitPresetFieldGroup } from "@/lib/failedVisitPreset";
import type { Empresa } from "@/lib/store/empresaStore";
import { getContratacionSelectOptions } from "@/lib/contratacionPrefixedDropdowns";
import {
  CONTRATACION_GENERO_OPTIONS,
  CONTRATACION_VINCULADO_FIELD_LABELS,
  CONTRATACION_VINCULADO_MEANINGFUL_FIELDS,
  CONTRATACION_VINCULADO_REQUIRED_FIELDS,
  type ContratacionValues,
  type ContratacionVinculadoFieldId,
  type ContratacionVinculadoRow,
} from "@/lib/validations/contratacion";

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

export const CONTRATACION_VINCULADOS_CONFIG: RepeatedPeopleConfig<ContratacionVinculadoRow> =
  {
    itemLabelSingular: "Vinculado",
    itemLabelPlural: "Vinculados",
    primaryNameField: "nombre_oferente",
    meaningfulFieldIds: [...CONTRATACION_VINCULADO_MEANINGFUL_FIELDS],
    getCardTitle: (_row, index) => `Vinculado ${index + 1}`,
    getCardSubtitle: (row) =>
      getRepeatedPersonSummary(row.nombre_oferente, row.cedula),
    orderField: "numero",
    createEmptyRow: createEmptyContratacionVinculadoRow,
  };

function normalizeTextValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function resolveContratacionNoAplicaOption(options: readonly string[]) {
  return (
    options.find((option) =>
      option
        .trim()
        .toLocaleLowerCase("es-CO")
        .replace(/\.+$/, "") === "no aplica"
    ) ?? null
  );
}

function normalizeContratacionCatalogKey(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLocaleLowerCase("es-CO")
    .trim();
}

const CONTRATACION_GENERO_ALIAS_MAP = new Map<
  string,
  (typeof CONTRATACION_GENERO_OPTIONS)[number]
>();

[
  ...CONTRATACION_GENERO_OPTIONS.map((option) => [option, option] as const),
  ["Masculino", "Hombre"] as const,
  ["Femenino", "Mujer"] as const,
  ["No binario", "Otro"] as const,
  ["No binaria", "Otro"] as const,
  ["Prefiere no responder", "Prefiero no responder"] as const,
  ["Prefiere no contestar", "Prefiero no responder"] as const,
].forEach(([alias, canonical]) => {
  CONTRATACION_GENERO_ALIAS_MAP.set(
    normalizeContratacionCatalogKey(alias),
    canonical
  );
});

export function normalizeContratacionGenero(
  value: unknown,
  fallback: (typeof CONTRATACION_GENERO_OPTIONS)[number] | "" = ""
) {
  const normalizedKey = normalizeContratacionCatalogKey(value);
  if (!normalizedKey) {
    return fallback;
  }

  return CONTRATACION_GENERO_ALIAS_MAP.get(normalizedKey) ?? fallback;
}

export function normalizeNullableContratacionGenero(value: unknown) {
  const normalized = normalizeContratacionGenero(value);
  return normalized || null;
}

const CONTRATACION_VINCULADO_FIELD_IDS = Object.keys(
  CONTRATACION_VINCULADO_FIELD_LABELS
) as ContratacionVinculadoFieldId[];

const CONTRATACION_FAILED_VISIT_EXCLUDED_VINCULADO_FIELDS = new Set<
  ContratacionVinculadoFieldId
>([
  "numero",
  "nombre_oferente",
  "cedula",
  "certificado_porcentaje",
  "discapacidad",
  "telefono_oferente",
  "genero",
  "correo_oferente",
  "fecha_nacimiento",
  "edad",
  "lgtbiq",
  "grupo_etnico",
  "grupo_etnico_cual",
  "cargo_oferente",
  "contacto_emergencia",
  "parentesco",
  "telefono_emergencia",
  "certificado_discapacidad",
  "lugar_firma_contrato",
  "fecha_firma_contrato",
  "tipo_contrato",
  "fecha_fin",
  "contrato_tipo_contrato",
  "contrato_jornada",
  "contrato_clausulas",
  "condiciones_salariales_frecuencia_pago",
  "condiciones_salariales_forma_pago",
]);

export function createEmptyContratacionVinculadoRow(): ContratacionVinculadoRow {
  const row = {} as ContratacionVinculadoRow;

  CONTRATACION_VINCULADO_FIELD_IDS.forEach((fieldId) => {
    row[fieldId] = "";
  });

  return row;
}

export function normalizeGrupoEtnicoCual(
  grupoEtnico: string,
  grupoEtnicoCual: string
) {
  const normalizedGrupo = grupoEtnico.trim().toLocaleLowerCase("es-CO");
  if (normalizedGrupo !== "si" && normalizedGrupo !== "si.") {
    return "No aplica";
  }

  return grupoEtnicoCual;
}

export function normalizeContratacionVinculadoRow(
  row: unknown,
  index: number
): ContratacionVinculadoRow {
  const candidate =
    row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const normalized = {
    ...createEmptyContratacionVinculadoRow(),
  };

  CONTRATACION_VINCULADO_FIELD_IDS.forEach((fieldId) => {
    normalized[fieldId] = normalizeTextValue(candidate[fieldId], "");
  });

  normalized.numero = String(index + 1);
  normalized.genero = normalizeContratacionGenero(normalized.genero);
  normalized.grupo_etnico_cual = normalizeGrupoEtnicoCual(
    normalized.grupo_etnico,
    normalized.grupo_etnico_cual
  );
  normalized.fecha_firma_contrato = normalizeContractDateText(
    normalized.fecha_firma_contrato
  );
  normalized.fecha_fin = normalizeContractDateText(normalized.fecha_fin);
  normalized.edad = deriveAgeFromBirthDate(normalized.fecha_nacimiento);

  return normalized;
}

export function normalizeContratacionVinculados(rows: unknown) {
  return normalizeRestoredRepeatedPeopleRows(rows, CONTRATACION_VINCULADOS_CONFIG).map(
    (row, index) => normalizeContratacionVinculadoRow(row, index)
  );
}

export function getDefaultContratacionValues(
  empresa?: Empresa | null
): ContratacionValues {
  return {
    ...getDefaultFailedVisitAuditFields(),
    fecha_visita: "",
    modalidad: "",
    nit_empresa: empresa?.nit_empresa ?? "",
    desarrollo_actividad: "",
    ajustes_recomendaciones: "",
    vinculados: getDefaultRepeatedPeopleRows(
      CONTRATACION_VINCULADOS_CONFIG
    ).map((row, index) => normalizeContratacionVinculadoRow(row, index)),
    asistentes: getDefaultAsistentesForMode({
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

export function normalizeContratacionValues(
  values: Partial<ContratacionValues> | Record<string, unknown>,
  empresa?: Empresa | null
): ContratacionValues {
  const defaults = getDefaultContratacionValues(empresa);
  const source = values as Partial<ContratacionValues>;

  return {
    failed_visit_applied_at: normalizeFailedVisitAuditValue(
      source.failed_visit_applied_at
    ),
    fecha_visita:
      typeof source.fecha_visita === "string" ? source.fecha_visita.trim() : "",
    modalidad: normalizeModalidad(source.modalidad, defaults.modalidad),
    nit_empresa:
      typeof source.nit_empresa === "string" && source.nit_empresa.trim()
        ? source.nit_empresa
        : defaults.nit_empresa,
    desarrollo_actividad: normalizeTextValue(
      source.desarrollo_actividad,
      defaults.desarrollo_actividad
    ),
    ajustes_recomendaciones: normalizeTextValue(
      source.ajustes_recomendaciones,
      defaults.ajustes_recomendaciones
    ),
    vinculados: normalizeContratacionVinculados(source.vinculados),
    asistentes: normalizePersistedAsistentesForMode(source.asistentes, {
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

function isFilled(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

export function hasMeaningfulContratacionVinculadoRow(
  row: ContratacionVinculadoRow
) {
  return CONTRATACION_VINCULADO_MEANINGFUL_FIELDS.some((fieldId) =>
    isFilled(row[fieldId])
  );
}

export function isContratacionVinculadoComplete(
  row: ContratacionVinculadoRow
) {
  return CONTRATACION_VINCULADO_REQUIRED_FIELDS.every((fieldId) =>
    isFilled(row[fieldId])
  );
}

export function buildContratacionFailedVisitVinculadoPatch(
  row: ContratacionVinculadoRow,
  options?: { preserveExistingValues?: boolean }
): Partial<ContratacionVinculadoRow> {
  const patch: Partial<ContratacionVinculadoRow> = {};

  CONTRATACION_VINCULADO_FIELD_IDS.forEach((fieldId) => {
    if (
      fieldId === "numero" ||
      CONTRATACION_FAILED_VISIT_EXCLUDED_VINCULADO_FIELDS.has(fieldId)
    ) {
      return;
    }

    if (options?.preserveExistingValues && isFilled(row[fieldId])) {
      return;
    }

    if (fieldId.endsWith("_nota")) {
      patch[fieldId] = "No aplica";
      return;
    }

    const noAplicaOption = resolveContratacionNoAplicaOption(
      getContratacionSelectOptions(fieldId)
    );
    if (!noAplicaOption) {
      return;
    }

    patch[fieldId] = noAplicaOption;
  });

  return patch;
}

export function createFailedVisitContratacionVinculadoRow(
  index: number
): ContratacionVinculadoRow {
  return normalizeContratacionVinculadoRow(
    {
      ...createEmptyContratacionVinculadoRow(),
      ...buildContratacionFailedVisitVinculadoPatch(
        createEmptyContratacionVinculadoRow()
      ),
    },
    index
  );
}

export function buildContratacionFailedVisitPresetFieldGroups(
  rows: ContratacionVinculadoRow[]
): FailedVisitPresetFieldGroup[] {
  const groupedPaths = new Map<string, string[]>();

  rows.forEach((row, index) => {
    if (!hasMeaningfulContratacionVinculadoRow(row)) {
      return;
    }

    Object.entries(buildContratacionFailedVisitVinculadoPatch(row)).forEach(
      ([fieldId, value]) => {
        const nextPaths = groupedPaths.get(value) ?? [];
        nextPaths.push(`vinculados.${index}.${fieldId}`);
        groupedPaths.set(value, nextPaths);
      }
    );
  });

  return Array.from(groupedPaths.entries()).map(([value, paths]) => ({
    value,
    paths,
  }));
}
