import {
  buildBaseParsedRaw,
  buildCompletionPayloads,
  normalizePayloadAsistentes,
  type PayloadOutput,
} from "@/lib/finalization/payloads";
import { calculateEvaluacionAccessibilitySummary } from "@/lib/evaluacion";
import type { FinalizationSection1Data } from "@/lib/finalization/routeHelpers";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";

export const EVALUACION_FORM_ID = "evaluacion_accesibilidad";
export const EVALUACION_FORM_NAME = "Evaluacion de Accesibilidad";

type BuildEvaluacionCompletionPayloadsOptions = {
  actaRef: string;
  section1Data: FinalizationSection1Data;
  formData: EvaluacionValues;
  asistentes: Array<{ nombre?: unknown; cargo?: unknown }>;
  output: PayloadOutput;
  generatedAt: string | Date;
  payloadSource: string;
};

export function buildEvaluacionCompletionPayloads({
  actaRef,
  section1Data,
  formData,
  asistentes,
  output,
  generatedAt,
  payloadSource,
}: BuildEvaluacionCompletionPayloadsOptions) {
  const normalizedAsistentes = normalizePayloadAsistentes(asistentes);
  const accessibilitySummary = calculateEvaluacionAccessibilitySummary(formData);
  const cacheSnapshot = {
    failed_visit_applied_at: formData.failed_visit_applied_at,
    section_1: section1Data,
    section_2_1: formData.section_2_1,
    section_2_2: formData.section_2_2,
    section_2_3: formData.section_2_3,
    section_2_4: formData.section_2_4,
    section_2_5: formData.section_2_5,
    section_2_6: formData.section_2_6,
    section_3: formData.section_3,
    section_4: formData.section_4,
    section_5: formData.section_5,
    section_6: {
      observaciones_generales: formData.observaciones_generales,
    },
    section_7: {
      cargos_compatibles: formData.cargos_compatibles,
    },
    section_8: normalizedAsistentes,
  };

  return buildCompletionPayloads({
    formId: EVALUACION_FORM_ID,
    formName: EVALUACION_FORM_NAME,
    cacheSnapshot,
    attachment: {
      document_kind: "evaluacion_accesibilidad",
      document_label: "Evaluacion de Accesibilidad",
      is_ods_candidate: true,
    },
    parsedRaw: buildBaseParsedRaw({
      section1Data,
      asistentes: normalizedAsistentes,
      extraFields: {
        failed_visit_applied_at: formData.failed_visit_applied_at,
        nivel_accesibilidad: formData.section_4.nivel_accesibilidad,
        descripcion_accesibilidad: formData.section_4.descripcion,
        resumen_accesibilidad: accessibilitySummary.counts,
        porcentajes_accesibilidad: accessibilitySummary.percentages,
        nivel_sugerido_accesibilidad: accessibilitySummary.suggestion,
        ajustes_razonables: formData.section_5,
        observaciones_generales: formData.observaciones_generales,
        cargos_compatibles: formData.cargos_compatibles,
        sheet_link: output.sheetLink,
      },
    }),
    output,
    generatedAt,
    payloadSource,
    actaRef,
  });
}
