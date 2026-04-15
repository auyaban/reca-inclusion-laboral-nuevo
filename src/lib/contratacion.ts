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
import type { Empresa } from "@/lib/store/empresaStore";
import {
  CONTRATACION_VINCULADO_MEANINGFUL_FIELDS,
  CONTRATACION_VINCULADO_REQUIRED_FIELDS,
  type ContratacionValues,
  type ContratacionVinculadoFieldId,
  type ContratacionVinculadoRow,
} from "@/lib/validations/contratacion";

export const CONTRATACION_VINCULADOS_CONFIG: RepeatedPeopleConfig<ContratacionVinculadoRow> =
  {
    itemLabelSingular: "Vinculado",
    itemLabelPlural: "Vinculados",
    primaryNameField: "nombre_oferente",
    meaningfulFieldIds: [...CONTRATACION_VINCULADO_MEANINGFUL_FIELDS],
    createEmptyRow: createEmptyContratacionVinculadoRow,
  };

function normalizeTextValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function createEmptyContratacionVinculadoRow(): ContratacionVinculadoRow {
  const row = {} as ContratacionVinculadoRow;

  (
    [
      "numero",
      ...CONTRATACION_VINCULADO_REQUIRED_FIELDS,
    ] as readonly ContratacionVinculadoFieldId[]
  ).forEach((fieldId) => {
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

  (
    [
      "numero",
      ...CONTRATACION_VINCULADO_REQUIRED_FIELDS,
    ] as readonly ContratacionVinculadoFieldId[]
  ).forEach((fieldId) => {
    normalized[fieldId] = normalizeTextValue(candidate[fieldId], "");
  });

  normalized.numero = String(index + 1);
  normalized.grupo_etnico_cual = normalizeGrupoEtnicoCual(
    normalized.grupo_etnico,
    normalized.grupo_etnico_cual
  );

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
