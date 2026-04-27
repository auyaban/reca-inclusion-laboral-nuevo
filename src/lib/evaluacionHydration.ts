import {
  buildLongFormSessionRouteKey,
  resolveInvisibleDraftSessionHydration,
  resolveLongFormDraftHydration,
  type InvisibleDraftSessionHydrationAction,
  type LongFormDraftHydrationAction,
} from "@/lib/longFormHydration";
import {
  buildEvaluacionLegacyQuestionFieldKeys,
  createEmptyEvaluacionQuestionAnswer,
  normalizeEvaluacionValues,
  readEvaluacionQuestionFieldValue,
} from "@/lib/evaluacion";
import {
  EVALUACION_COMPANY_FIELD_IDS,
  EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION,
  EVALUACION_QUESTION_SECTION_IDS,
  EVALUACION_SECTION_5_ITEMS,
  type EvaluacionQuestionSectionId,
} from "@/lib/evaluacionSections";
import type { Empresa } from "@/lib/store/empresaStore";
import type {
  EvaluacionQuestionSectionValues,
  EvaluacionSection5Values,
  EvaluacionValues,
} from "@/lib/validations/evaluacion";

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

// Legacy hydration notes:
// - v3 is the current nested web contract and should stay until the contract changes.
// - v2 covers section-scoped flat caches created during early migration drafts.
// - v1 covers root-flat legacy snapshots inherited from pre-migration saves.
// Remove v2/v1 fallbacks only after the useful lifetime of old drafts has expired.
function extractQuestionSection(
  sectionId: EvaluacionQuestionSectionId,
  source: Record<string, unknown>
): EvaluacionQuestionSectionValues {
  const sectionSource = asRecord(source[sectionId]);
  const normalized: EvaluacionQuestionSectionValues = {};

  EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION[sectionId].forEach((question) => {
    const nestedAnswer = asRecord(sectionSource[question.id]);
    const answer = createEmptyEvaluacionQuestionAnswer();

    question.fields.forEach((field) => {
      const legacyKeys = buildEvaluacionLegacyQuestionFieldKeys(
        question.id,
        field.key
      );
      const sectionLegacyCandidate = legacyKeys.find(
        (legacyKey) => typeof sectionSource[legacyKey] === "string"
      );
      const rootLegacyCandidate = legacyKeys.find(
        (legacyKey) => typeof source[legacyKey] === "string"
      );
      const candidate =
        // v3: current web contract nested by section/question/field.
        readEvaluacionQuestionFieldValue(nestedAnswer, field.key) ||
        // v2: section-scoped legacy flat caches (section_2_1.question_field).
        (sectionLegacyCandidate ? sectionSource[sectionLegacyCandidate] : undefined) ||
        // v1: root-level legacy flat caches (question_field at draft root).
        (rootLegacyCandidate ? source[rootLegacyCandidate] : undefined);

      answer[field.key] = typeof candidate === "string" ? candidate : "";
    });

    normalized[question.id] = answer;
  });

  return normalized;
}

function extractSection5Values(source: Record<string, unknown>): EvaluacionSection5Values {
  const sectionSource = asRecord(source.section_5);
  const normalized: EvaluacionSection5Values = {};

  EVALUACION_SECTION_5_ITEMS.forEach((item) => {
    const nestedValue = asRecord(sectionSource[item.id]);

    normalized[item.id] = {
      aplica:
        typeof nestedValue.aplica === "string"
          ? nestedValue.aplica
          // v2: section-scoped legacy flat snapshot (`section_5.item_id = "Aplica"`).
          : typeof sectionSource[item.id] === "string"
            ? (sectionSource[item.id] as string)
            // v1: root-level legacy flat snapshot (`source[item_id] = "Aplica"`).
            : typeof source[item.id] === "string"
              ? (source[item.id] as string)
              : "",
      nota:
        typeof nestedValue.nota === "string"
          ? nestedValue.nota
          : typeof sectionSource[`${item.id}_nota`] === "string"
            ? (sectionSource[`${item.id}_nota`] as string)
            : "",
      ajustes:
        typeof nestedValue.ajustes === "string"
          ? nestedValue.ajustes
          : typeof sectionSource[`${item.id}_ajustes`] === "string"
            ? (sectionSource[`${item.id}_ajustes`] as string)
            : "",
    };
  });

  return normalized;
}

export function hydrateEvaluacionDraft(
  snapshot: unknown,
  empresa?: Empresa | null
): EvaluacionValues {
  const source = asRecord(snapshot);
  const section1Source = asRecord(source.section_1);
  const section4Source = asRecord(source.section_4);
  const section6Source = asRecord(source.section_6);
  const section7Source = asRecord(source.section_7);

  const partialValues: Partial<EvaluacionValues> = {};

  EVALUACION_COMPANY_FIELD_IDS.forEach((fieldId) => {
    const candidate = section1Source[fieldId] ?? source[fieldId];
    if (typeof candidate === "string") {
      (partialValues as Record<string, unknown>)[fieldId] = candidate;
    }
  });

  EVALUACION_QUESTION_SECTION_IDS.forEach((sectionId) => {
    partialValues[sectionId] = extractQuestionSection(sectionId, source);
  });

  partialValues.section_4 = {
    nivel_accesibilidad:
      typeof section4Source.nivel_accesibilidad === "string"
        ? section4Source.nivel_accesibilidad
        : "",
    descripcion:
      typeof section4Source.descripcion === "string"
        ? section4Source.descripcion
        : "",
  };

  partialValues.section_5 = extractSection5Values(source);
  partialValues.observaciones_generales =
    typeof section6Source.observaciones_generales === "string"
      ? section6Source.observaciones_generales
      : typeof source.observaciones_generales === "string"
        ? source.observaciones_generales
        : "";
  partialValues.cargos_compatibles =
    typeof section7Source.cargos_compatibles === "string"
      ? section7Source.cargos_compatibles
      : typeof source.cargos_compatibles === "string"
        ? source.cargos_compatibles
        : "";
  partialValues.asistentes = Array.isArray(source.asistentes)
    ? source.asistentes
    : Array.isArray(source.section_8)
      ? source.section_8
      : [];
  partialValues.failed_visit_applied_at =
    typeof source.failed_visit_applied_at === "string" ||
    source.failed_visit_applied_at === null
      ? source.failed_visit_applied_at
      : undefined;

  return normalizeEvaluacionValues(partialValues, empresa);
}

export type EvaluacionDraftHydrationAction = LongFormDraftHydrationAction;
export type EvaluacionSessionHydrationAction =
  InvisibleDraftSessionHydrationAction;

export const buildEvaluacionSessionRouteKey = buildLongFormSessionRouteKey;
export const resolveEvaluacionDraftHydration = resolveLongFormDraftHydration;
export const resolveEvaluacionSessionHydration =
  resolveInvisibleDraftSessionHydration;
