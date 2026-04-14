import type { PresentacionValues } from "@/lib/validations/presentacion";

export type PresentacionContentSectionId =
  | "visit"
  | "motivation"
  | "agreements"
  | "attendees";

export type PresentacionSectionId = "company" | PresentacionContentSectionId;

export const PRESENTACION_STEP_TO_SECTION_ID: Record<
  number,
  PresentacionContentSectionId
> = {
  0: "visit",
  1: "motivation",
  2: "agreements",
  3: "attendees",
};

export const PRESENTACION_SECTION_TO_STEP: Record<
  PresentacionContentSectionId,
  number
> = {
  visit: 0,
  motivation: 1,
  agreements: 2,
  attendees: 3,
};

export const PRESENTACION_SECTION_LABELS: Record<
  PresentacionSectionId,
  string
> = {
  company: "Empresa",
  visit: "Datos de la visita",
  motivation: "Motivación",
  agreements: "Acuerdos y observaciones",
  attendees: "Asistentes",
};

export const INITIAL_PRESENTACION_COLLAPSED_SECTIONS: Record<
  PresentacionSectionId,
  boolean
> = {
  company: false,
  visit: false,
  motivation: false,
  agreements: false,
  attendees: false,
};

export function getPresentacionSectionIdForStep(step: number) {
  return PRESENTACION_STEP_TO_SECTION_ID[step] ?? "visit";
}

export function getPresentacionCompatStepForSection(
  sectionId: PresentacionContentSectionId
) {
  return PRESENTACION_SECTION_TO_STEP[sectionId];
}

export function isPresentacionVisitSectionComplete(values: {
  tipo_visita?: string;
  fecha_visita?: string;
  modalidad?: string;
  nit_empresa?: string;
}) {
  return Boolean(
    values.tipo_visita &&
      values.fecha_visita &&
      values.modalidad &&
      values.nit_empresa?.trim()
  );
}

export function isPresentacionMotivationSectionComplete(
  values: Pick<PresentacionValues, "motivacion">
) {
  return values.motivacion.length > 0;
}

export function isPresentacionAgreementsSectionComplete(
  values: Pick<PresentacionValues, "acuerdos_observaciones">
) {
  return values.acuerdos_observaciones.trim().length > 0;
}

export function isPresentacionAttendeesSectionComplete(
  values: Pick<PresentacionValues, "asistentes">
) {
  return (
    values.asistentes.length >= 2 &&
    values.asistentes.every((asistente) => asistente.nombre.trim().length > 0)
  );
}
