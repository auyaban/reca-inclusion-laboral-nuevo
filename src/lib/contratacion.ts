import {
  getDefaultAsistentesForMode,
  normalizePersistedAsistentesForMode,
} from "@/lib/asistentes";
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
import type { Empresa } from "@/lib/store/empresaStore";
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
    fecha_visita: new Date().toISOString().split("T")[0],
    modalidad: "Presencial",
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
    fecha_visita:
      typeof source.fecha_visita === "string" && source.fecha_visita.trim()
        ? source.fecha_visita
        : defaults.fecha_visita,
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

export function isContratacionVinculadoComplete(
  row: ContratacionVinculadoRow
) {
  return CONTRATACION_VINCULADO_REQUIRED_FIELDS.every((fieldId) =>
    isFilled(row[fieldId])
  );
}
