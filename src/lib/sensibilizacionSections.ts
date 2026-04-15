import {
  getMeaningfulAsistentes,
  isCompleteAsistente,
} from "@/lib/asistentes";
import type { SensibilizacionValues } from "@/lib/validations/sensibilizacion";
import { SENSIBILIZACION_MIN_SIGNIFICANT_ATTENDEES } from "@/lib/validations/sensibilizacion";

export type SensibilizacionContentSectionId =
  | "visit"
  | "observations"
  | "attendees";

export type SensibilizacionSectionId =
  | "company"
  | SensibilizacionContentSectionId;

// Compatibilidad con drafts creados cuando Sensibilización todavía era wizard.
export const SENSIBILIZACION_COMPAT_STEP_TO_SECTION_ID: Record<
  number,
  SensibilizacionContentSectionId
> = {
  0: "visit",
  1: "observations",
  2: "observations",
  3: "attendees",
  4: "attendees",
};

export const SENSIBILIZACION_COMPAT_SECTION_TO_STEP: Record<
  SensibilizacionContentSectionId,
  number
> = {
  visit: 0,
  observations: 2,
  attendees: 4,
};

export const SENSIBILIZACION_SECTION_LABELS: Record<
  SensibilizacionSectionId,
  string
> = {
  company: "Empresa",
  visit: "Datos de la visita",
  observations: "Observaciones",
  attendees: "Asistentes",
};

export const INITIAL_SENSIBILIZACION_COLLAPSED_SECTIONS: Record<
  SensibilizacionSectionId,
  boolean
> = {
  company: false,
  visit: false,
  observations: false,
  attendees: false,
};

export function getSensibilizacionSectionIdForStep(step: number) {
  return SENSIBILIZACION_COMPAT_STEP_TO_SECTION_ID[step] ?? "visit";
}

export function getSensibilizacionCompatStepForSection(
  sectionId: SensibilizacionContentSectionId
) {
  return SENSIBILIZACION_COMPAT_SECTION_TO_STEP[sectionId];
}

export function isSensibilizacionVisitSectionComplete(
  values: {
    fecha_visita?: string;
    modalidad?: string;
    nit_empresa?: string;
  }
) {
  return Boolean(
    values.fecha_visita && values.modalidad && values.nit_empresa?.trim()
  );
}

export function isSensibilizacionObservationsSectionComplete(
  values: Pick<SensibilizacionValues, "observaciones">
) {
  return values.observaciones.trim().length > 0;
}

export function isSensibilizacionAttendeesSectionComplete(
  values: Pick<SensibilizacionValues, "asistentes">
) {
  const meaningfulAsistentes = getMeaningfulAsistentes(values.asistentes);

  return (
    meaningfulAsistentes.length >= SENSIBILIZACION_MIN_SIGNIFICANT_ATTENDEES &&
    meaningfulAsistentes.every((asistente) => isCompleteAsistente(asistente))
  );
}
