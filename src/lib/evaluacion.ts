import {
  ASESOR_AGENCIA_CARGO,
  normalizeAsistenteLike,
  normalizePersonName,
} from "@/lib/asistentes";
import {
  getDefaultFailedVisitAuditFields,
  normalizeFailedVisitAuditValue,
} from "@/lib/failedVisitContract";
import { normalizeModalidad } from "@/lib/modalidad";
import {
  EVALUACION_BASE_ASISTENTES_ROWS,
  EVALUACION_DERIVED_FIELD_PATHS,
  EVALUACION_DYNAMIC_SECTION_IDS,
  EVALUACION_MAX_ASISTENTES,
  EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION,
  EVALUACION_QUESTION_SECTION_IDS,
  EVALUACION_SECTION_4_DESCRIPTIONS,
  EVALUACION_SECTION_4_OPTIONS,
  EVALUACION_SECTION_5_APLICA_OPTIONS,
  EVALUACION_SECTION_5_ITEMS,
  type EvaluacionQuestionFieldDescriptor,
  type EvaluacionQuestionSectionId,
} from "@/lib/evaluacionSections";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  EVALUACION_QUESTION_ANSWER_KEYS,
  type EvaluacionAsistente,
  type EvaluacionQuestionAnswer,
  type EvaluacionQuestionSectionValues,
  type EvaluacionSection5ItemValue,
  type EvaluacionSection5Values,
  type EvaluacionValues,
} from "@/lib/validations/evaluacion";

export type EvaluacionAccessibilitySummary = {
  counts: {
    si: number;
    no: number;
    parcial: number;
  };
  percentages: {
    si: number;
    no: number;
    parcial: number;
  };
  suggestion: "" | "Alto" | "Medio" | "Bajo";
};

export type EvaluacionAccessibilitySuggestion =
  EvaluacionAccessibilitySummary["suggestion"];

// `quinary` remains the persisted key for compatibility with existing drafts,
// tests, and Sheet mappings. `quinaria` is the future canonical Spanish name and
// is accepted only as a read alias until a dedicated migration can rename it safely.
export const EVALUACION_LEGACY_QUINARY_KEY = "quinary";
export const EVALUACION_CANONICAL_QUINARIA_KEY = "quinaria";

type EvaluacionQuestionFieldReadKey =
  | (typeof EVALUACION_QUESTION_ANSWER_KEYS)[number]
  | typeof EVALUACION_CANONICAL_QUINARIA_KEY;

const EVALUACION_SECTION_5_ITEM_MAP = new Map(
  EVALUACION_SECTION_5_ITEMS.map((item) => [item.id, item] as const)
);

function normalizeEvaluacionCatalogKey(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLocaleLowerCase("es-CO")
    .trim();
}

function createOptionNormalizer<const TOptions extends readonly string[]>(
  options: TOptions
) {
  const optionMap = new Map<string, TOptions[number]>();

  options.forEach((option) => {
    optionMap.set(normalizeEvaluacionCatalogKey(option), option);
  });

  return (
    value: unknown,
    fallback: TOptions[number] | ""
  ): TOptions[number] | "" => {
    if (typeof value !== "string") {
      return fallback;
    }

    const normalized = normalizeEvaluacionCatalogKey(value);
    if (!normalized) {
      return fallback;
    }

    return optionMap.get(normalized) ?? fallback;
  };
}

const SECTION_4_LEVEL_NORMALIZER = createOptionNormalizer(EVALUACION_SECTION_4_OPTIONS);
const SECTION_5_APLICA_NORMALIZER = createOptionNormalizer(
  EVALUACION_SECTION_5_APLICA_OPTIONS
);

function normalizeTextValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function buildEvaluacionCompanySnapshot(empresa?: Empresa | null) {
  return {
    nombre_empresa: empresa?.nombre_empresa ?? "",
    direccion_empresa: empresa?.direccion_empresa ?? "",
    correo_1: empresa?.correo_1 ?? "",
    contacto_empresa: empresa?.contacto_empresa ?? "",
    caja_compensacion: empresa?.caja_compensacion ?? "",
    asesor: empresa?.asesor ?? "",
    ciudad_empresa: empresa?.ciudad_empresa ?? "",
    telefono_empresa: empresa?.telefono_empresa ?? "",
    cargo: empresa?.cargo ?? "",
    sede_empresa: empresa?.zona_empresa ?? empresa?.sede_empresa ?? "",
    profesional_asignado: empresa?.profesional_asignado ?? "",
  };
}

function normalizeCompanyFieldValue(
  sourceValue: unknown,
  empresaValue: string
) {
  if (empresaValue.trim()) {
    return empresaValue;
  }

  return normalizeTextValue(sourceValue).trim();
}

function normalizeCompanyNitValue(
  sourceValue: unknown,
  empresa?: Empresa | null,
  fallback = ""
) {
  const companyNit = empresa?.nit_empresa?.trim();
  if (companyNit) {
    return companyNit;
  }

  const restoredNit = normalizeTextValue(sourceValue, fallback).trim();
  return restoredNit || fallback;
}

export function createEmptyEvaluacionQuestionAnswer(): EvaluacionQuestionAnswer {
  return {
    accesible: "",
    respuesta: "",
    secundaria: "",
    terciaria: "",
    cuaternaria: "",
    quinary: "",
    observaciones: "",
    detalle: "",
  };
}

export function createEmptyEvaluacionQuestionSectionValues(
  sectionId: EvaluacionQuestionSectionId
): EvaluacionQuestionSectionValues {
  const values: EvaluacionQuestionSectionValues = {};

  EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION[sectionId].forEach((question) => {
    values[question.id] = createEmptyEvaluacionQuestionAnswer();
  });

  return values;
}

export function getEvaluacionQuestionFieldReadKeys(
  fieldKey: (typeof EVALUACION_QUESTION_ANSWER_KEYS)[number]
): readonly EvaluacionQuestionFieldReadKey[] {
  if (fieldKey === EVALUACION_LEGACY_QUINARY_KEY) {
    return [EVALUACION_LEGACY_QUINARY_KEY, EVALUACION_CANONICAL_QUINARIA_KEY];
  }

  return [fieldKey];
}

export function buildEvaluacionLegacyQuestionFieldKeys(
  questionId: string,
  fieldKey: (typeof EVALUACION_QUESTION_ANSWER_KEYS)[number]
) {
  if (fieldKey === "respuesta") {
    return [questionId] as const;
  }

  return getEvaluacionQuestionFieldReadKeys(fieldKey).map(
    (aliasKey) => `${questionId}_${aliasKey}`
  );
}

export function readEvaluacionQuestionFieldValue(
  source: Record<string, unknown>,
  fieldKey: (typeof EVALUACION_QUESTION_ANSWER_KEYS)[number]
) {
  const aliases = getEvaluacionQuestionFieldReadKeys(fieldKey);

  for (const aliasKey of aliases) {
    const candidate = source[aliasKey];
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return "";
}

function normalizeQuestionFieldValue(
  field: EvaluacionQuestionFieldDescriptor,
  value: unknown
) {
  if (field.options.length === 0) {
    return normalizeTextValue(value);
  }

  return createOptionNormalizer(field.options)(value, "");
}

function normalizeQuestionSectionValues(
  sectionId: EvaluacionQuestionSectionId,
  sectionValue: unknown
) {
  const source =
    sectionValue && typeof sectionValue === "object" && !Array.isArray(sectionValue)
      ? (sectionValue as Record<string, unknown>)
      : {};
  const normalized = createEmptyEvaluacionQuestionSectionValues(sectionId);

  EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION[sectionId].forEach((question) => {
    const answerSource =
      source[question.id] &&
      typeof source[question.id] === "object" &&
      !Array.isArray(source[question.id])
        ? (source[question.id] as Record<string, unknown>)
        : {};

    const answer = createEmptyEvaluacionQuestionAnswer();

    question.fields.forEach((field) => {
      answer[field.key] = normalizeQuestionFieldValue(
        field,
        readEvaluacionQuestionFieldValue(answerSource, field.key)
      );
    });

    normalized[question.id] = answer;
  });

  return normalized;
}

function deriveEvaluacionAdjustmentValue(
  aplica: EvaluacionSection5ItemValue["aplica"],
  suggestedText: string
) {
  if (aplica === "Aplica") {
    return suggestedText;
  }

  if (aplica === "No aplica") {
    return "No aplica";
  }

  return "";
}

export function deriveEvaluacionSection5ItemValue(
  itemId: string,
  aplica: unknown,
  nota: unknown = ""
): EvaluacionSection5ItemValue {
  const item = EVALUACION_SECTION_5_ITEM_MAP.get(itemId);
  const normalizedAplica = SECTION_5_APLICA_NORMALIZER(aplica, "");
  const normalizedNota = coerceSection5Nota(nota, item);

  return {
    aplica: normalizedAplica,
    nota: normalizedNota,
    ajustes: item
      ? deriveEvaluacionAdjustmentValue(normalizedAplica, item.ajustes)
      : "",
  };
}

// Drafts pre-cambio guardaban la nota como copia estatica de `item.codes`
// ("Codigos CIE-10:..."). Esa cadena es metadata del catalogo, no contenido
// diligenciado por el profesional, asi que la limpiamos al rehidratar para
// que el campo libre arranque vacio en la UI sin duplicar el codigo CIE-10
// que ya vive en la celda titulo de la fila (A186, A188, ...).
function coerceSection5Nota(
  rawNota: unknown,
  item: ReturnType<typeof EVALUACION_SECTION_5_ITEM_MAP.get>
) {
  if (typeof rawNota !== "string") {
    return "";
  }

  if (item && rawNota.trim() === item.codes.trim()) {
    return "";
  }

  return rawNota;
}

function normalizeEvaluacionSection5Values(
  sectionValue: unknown
): EvaluacionSection5Values {
  const source =
    sectionValue && typeof sectionValue === "object" && !Array.isArray(sectionValue)
      ? (sectionValue as Record<string, unknown>)
      : {};
  const normalized: EvaluacionSection5Values = {};

  EVALUACION_SECTION_5_ITEMS.forEach((item) => {
    const itemSource =
      source[item.id] && typeof source[item.id] === "object" && !Array.isArray(source[item.id])
        ? (source[item.id] as Record<string, unknown>)
        : {};
    normalized[item.id] = deriveEvaluacionSection5ItemValue(
      item.id,
      itemSource.aplica,
      itemSource.nota
    );
  });

  return normalized;
}

function createDefaultEvaluacionAsistentes(
  empresa?: Empresa | null
): EvaluacionValues["asistentes"] {
  return [
    { nombre: empresa?.profesional_asignado ?? "", cargo: "" },
    { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
  ];
}

function normalizeAdvisorRow(row?: EvaluacionAsistente) {
  return {
    nombre: row?.nombre ? normalizePersonName(row.nombre) : "",
    cargo: row?.cargo?.trim() || ASESOR_AGENCIA_CARGO,
  };
}

export function ensureEvaluacionBaseAsistentes(
  asistentes: unknown,
  empresa?: Empresa | null
) {
  const defaults = createDefaultEvaluacionAsistentes(empresa);
  const assignedProfessionalName = normalizePersonName(
    empresa?.profesional_asignado?.trim() ?? ""
  );

  if (!Array.isArray(asistentes)) {
    return defaults;
  }

  const normalizedRows = asistentes
    .filter((row) => Boolean(row) && typeof row === "object")
    .map((row) => normalizeAsistenteLike(row as Record<string, unknown>));

  if (normalizedRows.length === 0) {
    return defaults;
  }

  const advisorIndex = normalizedRows.findLastIndex(
    (row) =>
      normalizeEvaluacionCatalogKey(row.cargo) ===
      normalizeEvaluacionCatalogKey(ASESOR_AGENCIA_CARGO)
  );
  const advisorRow =
    advisorIndex >= 0
      ? normalizeAdvisorRow(normalizedRows[advisorIndex])
      : defaults[defaults.length - 1];
  const nonAdvisorRows = normalizedRows.filter((_row, index) => index !== advisorIndex);

  let firstRow = defaults[0];
  let middleRows = nonAdvisorRows;

  if (assignedProfessionalName) {
    const assignedProfessionalIndex = nonAdvisorRows.findIndex(
      (row) => normalizePersonName(row.nombre) === assignedProfessionalName
    );

    if (assignedProfessionalIndex >= 0) {
      firstRow = {
        nombre: nonAdvisorRows[assignedProfessionalIndex]?.nombre || assignedProfessionalName,
        cargo: nonAdvisorRows[assignedProfessionalIndex]?.cargo || defaults[0].cargo,
      };
      middleRows = nonAdvisorRows.filter(
        (_row, index) => index !== assignedProfessionalIndex
      );
    } else {
      firstRow = {
        nombre: assignedProfessionalName,
        cargo: defaults[0].cargo,
      };
    }
  } else if (nonAdvisorRows.length > 0) {
    firstRow = {
      nombre: nonAdvisorRows[0]?.nombre || defaults[0].nombre,
      cargo: nonAdvisorRows[0]?.cargo || defaults[0].cargo,
    };
    middleRows = nonAdvisorRows.slice(1);
  }

  const maxMiddleRows = Math.max(0, EVALUACION_MAX_ASISTENTES - 2);
  const trimmedMiddleRows = middleRows.slice(0, maxMiddleRows);
  const result = [firstRow, ...trimmedMiddleRows, advisorRow];

  while (result.length < EVALUACION_BASE_ASISTENTES_ROWS) {
    result.splice(result.length - 1, 0, { nombre: "", cargo: "" });
  }

  return result.slice(0, EVALUACION_MAX_ASISTENTES);
}

export function normalizeEvaluacionAccessibleValue(value: unknown) {
  const normalized = normalizeEvaluacionCatalogKey(value);

  if (normalized === "si") {
    return "si" as const;
  }

  if (normalized === "no") {
    return "no" as const;
  }

  if (normalized === "parcial") {
    return "parcial" as const;
  }

  return "" as const;
}

export function calculateEvaluacionAccessibilitySummary(
  values:
    | Pick<
        EvaluacionValues,
        | "section_2_1"
        | "section_2_2"
        | "section_2_3"
        | "section_2_4"
        | "section_2_5"
        | "section_2_6"
        | "section_3"
      >
    | Partial<EvaluacionValues>
): EvaluacionAccessibilitySummary {
  const counts = {
    si: 0,
    no: 0,
    parcial: 0,
  };

  EVALUACION_QUESTION_SECTION_IDS.forEach((sectionId) => {
    const section = values[sectionId];
    if (!section || typeof section !== "object") {
      return;
    }

    Object.values(section as Record<string, unknown>).forEach((rawAnswer) => {
      if (!rawAnswer || typeof rawAnswer !== "object" || Array.isArray(rawAnswer)) {
        return;
      }

      const accessibleValue = normalizeEvaluacionAccessibleValue(
        (rawAnswer as Record<string, unknown>).accesible
      );

      if (accessibleValue) {
        counts[accessibleValue] += 1;
      }
    });
  });

  const total = counts.si + counts.no + counts.parcial;
  const percentages = {
    si: total ? (counts.si / total) * 100 : 0,
    no: total ? (counts.no / total) * 100 : 0,
    parcial: total ? (counts.parcial / total) * 100 : 0,
  };

  let suggestion: EvaluacionAccessibilitySummary["suggestion"] = "";
  if (total > 0) {
    if (percentages.si >= 86) {
      suggestion = "Alto";
    } else if (percentages.si >= 51) {
      suggestion = "Medio";
    } else if (percentages.si >= 1) {
      suggestion = "Bajo";
    }
  }

  return {
    counts,
    percentages,
    suggestion,
  };
}

export function deriveEvaluacionSection4Description(
  nivel: unknown
): EvaluacionValues["section_4"]["descripcion"] {
  const normalizedLevel = SECTION_4_LEVEL_NORMALIZER(nivel, "");

  if (!normalizedLevel) {
    return "";
  }

  return (
    EVALUACION_SECTION_4_DESCRIPTIONS[
      normalizedLevel as keyof typeof EVALUACION_SECTION_4_DESCRIPTIONS
    ] ?? ""
  );
}

export function resolveEvaluacionSection4LevelSync(input: {
  currentLevel: unknown;
  previousSuggestion: unknown;
  nextSuggestion: unknown;
}): EvaluacionAccessibilitySuggestion {
  const currentLevel = SECTION_4_LEVEL_NORMALIZER(input.currentLevel, "");
  const previousSuggestion = SECTION_4_LEVEL_NORMALIZER(
    input.previousSuggestion,
    ""
  );
  const nextSuggestion = SECTION_4_LEVEL_NORMALIZER(input.nextSuggestion, "");

  if (!currentLevel) {
    return nextSuggestion;
  }

  if (currentLevel === previousSuggestion) {
    return nextSuggestion;
  }

  return currentLevel;
}

function createDefaultEvaluacionSection5Values() {
  return normalizeEvaluacionSection5Values(undefined);
}

export function createEmptyEvaluacionValues(
  empresa?: Empresa | null
): EvaluacionValues {
  const companySnapshot = buildEvaluacionCompanySnapshot(empresa);

  return {
    ...getDefaultFailedVisitAuditFields(),
    fecha_visita: "",
    modalidad: "",
    nit_empresa: normalizeCompanyNitValue(undefined, empresa),
    ...companySnapshot,
    section_2_1: createEmptyEvaluacionQuestionSectionValues("section_2_1"),
    section_2_2: createEmptyEvaluacionQuestionSectionValues("section_2_2"),
    section_2_3: createEmptyEvaluacionQuestionSectionValues("section_2_3"),
    section_2_4: createEmptyEvaluacionQuestionSectionValues("section_2_4"),
    section_2_5: createEmptyEvaluacionQuestionSectionValues("section_2_5"),
    section_2_6: createEmptyEvaluacionQuestionSectionValues("section_2_6"),
    section_3: createEmptyEvaluacionQuestionSectionValues("section_3"),
    section_4: {
      nivel_accesibilidad: "",
      descripcion: "",
    },
    section_5: createDefaultEvaluacionSection5Values(),
    observaciones_generales: "",
    cargos_compatibles: "",
    asistentes: createDefaultEvaluacionAsistentes(empresa),
  };
}

export function normalizeEvaluacionValues(
  values: Partial<EvaluacionValues> | Record<string, unknown>,
  empresa?: Empresa | null
): EvaluacionValues {
  const defaults = createEmptyEvaluacionValues(empresa);
  const source = values as Partial<EvaluacionValues>;
  const companySnapshot = buildEvaluacionCompanySnapshot(empresa);
  const failedVisitAppliedAt = normalizeFailedVisitAuditValue(
    source.failed_visit_applied_at
  );
  const nivelAccesibilidad = SECTION_4_LEVEL_NORMALIZER(
    source.section_4?.nivel_accesibilidad,
    ""
  );
  const section4Description =
    failedVisitAppliedAt && !nivelAccesibilidad
      ? normalizeTextValue(source.section_4?.descripcion, "No aplica")
      : deriveEvaluacionSection4Description(nivelAccesibilidad);

  return {
    ...defaults,
    failed_visit_applied_at: failedVisitAppliedAt,
    fecha_visita:
      typeof source.fecha_visita === "string" ? source.fecha_visita.trim() : "",
    modalidad: normalizeModalidad(source.modalidad, defaults.modalidad),
    nit_empresa: normalizeCompanyNitValue(
      source.nit_empresa,
      empresa,
      defaults.nit_empresa
    ),
    nombre_empresa: normalizeCompanyFieldValue(
      source.nombre_empresa,
      companySnapshot.nombre_empresa
    ),
    direccion_empresa: normalizeCompanyFieldValue(
      source.direccion_empresa,
      companySnapshot.direccion_empresa
    ),
    correo_1: normalizeCompanyFieldValue(source.correo_1, companySnapshot.correo_1),
    contacto_empresa: normalizeCompanyFieldValue(
      source.contacto_empresa,
      companySnapshot.contacto_empresa
    ),
    caja_compensacion: normalizeCompanyFieldValue(
      source.caja_compensacion,
      companySnapshot.caja_compensacion
    ),
    asesor: normalizeCompanyFieldValue(source.asesor, companySnapshot.asesor),
    ciudad_empresa: normalizeCompanyFieldValue(
      source.ciudad_empresa,
      companySnapshot.ciudad_empresa
    ),
    telefono_empresa: normalizeCompanyFieldValue(
      source.telefono_empresa,
      companySnapshot.telefono_empresa
    ),
    cargo: normalizeCompanyFieldValue(source.cargo, companySnapshot.cargo),
    sede_empresa: normalizeCompanyFieldValue(
      source.sede_empresa,
      companySnapshot.sede_empresa
    ),
    profesional_asignado: normalizeCompanyFieldValue(
      source.profesional_asignado,
      companySnapshot.profesional_asignado
    ),
    section_2_1: normalizeQuestionSectionValues("section_2_1", source.section_2_1),
    section_2_2: normalizeQuestionSectionValues("section_2_2", source.section_2_2),
    section_2_3: normalizeQuestionSectionValues("section_2_3", source.section_2_3),
    section_2_4: normalizeQuestionSectionValues("section_2_4", source.section_2_4),
    section_2_5: normalizeQuestionSectionValues("section_2_5", source.section_2_5),
    section_2_6: normalizeQuestionSectionValues("section_2_6", source.section_2_6),
    section_3: normalizeQuestionSectionValues("section_3", source.section_3),
    section_4: {
      nivel_accesibilidad: nivelAccesibilidad,
      descripcion: section4Description,
    },
    section_5: normalizeEvaluacionSection5Values(source.section_5),
    observaciones_generales: normalizeTextValue(
      source.observaciones_generales,
      defaults.observaciones_generales
    ),
    cargos_compatibles: normalizeTextValue(
      source.cargos_compatibles,
      defaults.cargos_compatibles
    ),
    asistentes: ensureEvaluacionBaseAsistentes(source.asistentes, empresa),
  };
}

export function isEvaluacionDerivedFieldPath(path: string) {
  return EVALUACION_DERIVED_FIELD_PATHS.includes(path);
}

export function isEvaluacionDynamicSectionId(
  sectionId: string
): sectionId is (typeof EVALUACION_DYNAMIC_SECTION_IDS)[number] {
  return EVALUACION_DYNAMIC_SECTION_IDS.includes(
    sectionId as (typeof EVALUACION_DYNAMIC_SECTION_IDS)[number]
  );
}

export function getEvaluacionQuestionAnswerKeys() {
  return [...EVALUACION_QUESTION_ANSWER_KEYS];
}
