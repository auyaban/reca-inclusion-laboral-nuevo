import { getMeaningfulAsistentes, isCompleteAsistente } from "@/lib/asistentes";
import {
  SELECCION_OFERENTES_CONFIG,
  isSeleccionOferenteComplete,
} from "@/lib/seleccion";
import { isRepeatedPeopleSectionComplete } from "@/lib/repeatedPeople";
import type { SeleccionValues } from "@/lib/validations/seleccion";
import { SELECCION_MIN_SIGNIFICANT_ATTENDEES } from "@/lib/validations/seleccion";

type SeleccionFieldId = keyof SeleccionValues;

export type SeleccionContentSectionId =
  | "activity"
  | "oferentes"
  | "recommendations"
  | "attendees";

export type SeleccionSectionId = "company" | SeleccionContentSectionId;

export const SELECCION_SECTION_LABELS: Record<SeleccionSectionId, string> = {
  company: "Empresa",
  activity: "Desarrollo de la actividad",
  oferentes: "Oferentes",
  recommendations: "Ajustes y recomendaciones",
  attendees: "Asistentes",
};

export const INITIAL_SELECCION_COLLAPSED_SECTIONS: Record<
  SeleccionSectionId,
  boolean
> = {
  company: false,
  activity: false,
  oferentes: false,
  recommendations: false,
  attendees: false,
};

export const SELECCION_COMPAT_STEP_TO_SECTION_ID: Record<
  number,
  SeleccionContentSectionId
> = {
  0: "activity",
  1: "oferentes",
  2: "recommendations",
  3: "attendees",
};

export const SELECCION_COMPAT_SECTION_TO_STEP: Record<
  SeleccionContentSectionId,
  number
> = {
  activity: 0,
  oferentes: 1,
  recommendations: 2,
  attendees: 3,
};

export const SELECCION_COMPANY_REQUIRED_FIELDS = [
  "fecha_visita",
  "modalidad",
  "nit_empresa",
] as const satisfies readonly SeleccionFieldId[];

export function getSeleccionSectionIdForStep(step: number) {
  return SELECCION_COMPAT_STEP_TO_SECTION_ID[step] ?? "activity";
}

export function getSeleccionCompatStepForSection(
  sectionId: SeleccionContentSectionId
) {
  return SELECCION_COMPAT_SECTION_TO_STEP[sectionId];
}

export function isSeleccionCompanySectionComplete(values: {
  fecha_visita?: string;
  modalidad?: string;
  nit_empresa?: string;
}) {
  return Boolean(
    values.fecha_visita && values.modalidad && values.nit_empresa?.trim()
  );
}

export function isSeleccionActivitySectionComplete(
  values: Pick<
    SeleccionValues,
    "desarrollo_actividad" | "oferentes" | "failed_visit_applied_at"
  >
) {
  return Boolean(
    (values.failed_visit_applied_at ||
      isSeleccionOferentesSectionComplete(values)) &&
      values.desarrollo_actividad.trim().length > 0
  );
}

export function isSeleccionOferentesSectionComplete(
  values: Pick<SeleccionValues, "oferentes" | "failed_visit_applied_at">
) {
  if (values.failed_visit_applied_at) {
    return true;
  }

  return isRepeatedPeopleSectionComplete({
    rows: values.oferentes,
    config: SELECCION_OFERENTES_CONFIG,
    isRowComplete: isSeleccionOferenteComplete,
  });
}

export function isSeleccionRecommendationsSectionComplete(
  values: Pick<SeleccionValues, "ajustes_recomendaciones" | "nota">
) {
  return values.ajustes_recomendaciones.trim().length > 0;
}

export function isSeleccionAttendeesSectionComplete(
  values: Pick<SeleccionValues, "asistentes">
) {
  const meaningfulAsistentes = getMeaningfulAsistentes(values.asistentes);

  return (
    meaningfulAsistentes.length >= SELECCION_MIN_SIGNIFICANT_ATTENDEES &&
    meaningfulAsistentes.every((asistente) => isCompleteAsistente(asistente))
  );
}
