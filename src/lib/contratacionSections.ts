import { getMeaningfulAsistentes, isCompleteAsistente } from "@/lib/asistentes";
import {
  CONTRATACION_VINCULADOS_CONFIG,
  isContratacionVinculadoComplete,
} from "@/lib/contratacion";
import { isRepeatedPeopleSectionComplete } from "@/lib/repeatedPeople";
import type { ContratacionValues } from "@/lib/validations/contratacion";
import { CONTRATACION_MIN_SIGNIFICANT_ATTENDEES } from "@/lib/validations/contratacion";

type ContratacionFieldId = keyof ContratacionValues;

export type ContratacionContentSectionId =
  | "activity"
  | "vinculados"
  | "recommendations"
  | "attendees";

export type ContratacionSectionId = "company" | ContratacionContentSectionId;

export const CONTRATACION_SECTION_LABELS: Record<ContratacionSectionId, string> = {
  company: "Empresa",
  activity: "Desarrollo de la actividad",
  vinculados: "Vinculados",
  recommendations: "Ajustes y recomendaciones",
  attendees: "Asistentes",
};

export const INITIAL_CONTRATACION_COLLAPSED_SECTIONS: Record<
  ContratacionSectionId,
  boolean
> = {
  company: false,
  activity: false,
  vinculados: false,
  recommendations: false,
  attendees: false,
};

export const CONTRATACION_COMPAT_STEP_TO_SECTION_ID: Record<
  number,
  ContratacionContentSectionId
> = {
  0: "activity",
  1: "vinculados",
  2: "recommendations",
  3: "attendees",
};

export const CONTRATACION_COMPAT_SECTION_TO_STEP: Record<
  ContratacionContentSectionId,
  number
> = {
  activity: 0,
  vinculados: 1,
  recommendations: 2,
  attendees: 3,
};

export const CONTRATACION_COMPANY_REQUIRED_FIELDS = [
  "fecha_visita",
  "modalidad",
  "nit_empresa",
] as const satisfies readonly ContratacionFieldId[];

export function getContratacionSectionIdForStep(step: number) {
  return CONTRATACION_COMPAT_STEP_TO_SECTION_ID[step] ?? "activity";
}

export function getContratacionCompatStepForSection(
  sectionId: ContratacionContentSectionId
) {
  return CONTRATACION_COMPAT_SECTION_TO_STEP[sectionId];
}

export function isContratacionCompanySectionComplete(values: {
  fecha_visita?: string;
  modalidad?: string;
  nit_empresa?: string;
}) {
  return Boolean(
    values.fecha_visita && values.modalidad && values.nit_empresa?.trim()
  );
}

export function isContratacionActivitySectionComplete(
  values: Pick<ContratacionValues, "desarrollo_actividad" | "vinculados">
) {
  return (
    isContratacionVinculadosSectionComplete(values) &&
    values.desarrollo_actividad.trim().length > 0
  );
}

export function isContratacionVinculadosSectionComplete(
  values: Pick<ContratacionValues, "vinculados">
) {
  return isRepeatedPeopleSectionComplete({
    rows: values.vinculados,
    config: CONTRATACION_VINCULADOS_CONFIG,
    isRowComplete: isContratacionVinculadoComplete,
  });
}

export function isContratacionRecommendationsSectionComplete(
  values: Pick<ContratacionValues, "ajustes_recomendaciones">
) {
  return values.ajustes_recomendaciones.trim().length > 0;
}

export function isContratacionAttendeesSectionComplete(
  values: Pick<ContratacionValues, "asistentes">
) {
  const meaningfulAsistentes = getMeaningfulAsistentes(values.asistentes);

  return (
    meaningfulAsistentes.length >= CONTRATACION_MIN_SIGNIFICANT_ATTENDEES &&
    meaningfulAsistentes.every((asistente) => isCompleteAsistente(asistente))
  );
}
