export const PROYECCION_SERVICE_KEYS = [
  "program_presentation",
  "program_reactivation",
  "accessibility_assessment",
  "vacancy_review",
  "inclusive_selection",
  "inclusive_hiring",
  "sensibilizacion",
  "organizational_induction",
  "operational_induction",
  "follow_up",
  "interpreter_service",
] as const;

export const PROYECCION_MAIN_SERVICE_KEYS = [
  "program_presentation",
  "program_reactivation",
  "accessibility_assessment",
  "vacancy_review",
  "inclusive_selection",
  "inclusive_hiring",
  "sensibilizacion",
  "organizational_induction",
  "operational_induction",
  "follow_up",
] as const;

export const PROYECCION_INTERPRETER_SUGGESTED_SERVICE_KEYS = [
  "inclusive_selection",
  "inclusive_hiring",
  "organizational_induction",
  "operational_induction",
  "follow_up",
] as const;

export const PROYECCION_PERSON_COUNT_SERVICE_KEYS = [
  "inclusive_selection",
  "inclusive_hiring",
] as const;

export const PROYECCION_FOLLOW_UP_SERVICE_KEY = "follow_up";

export const PROYECCION_MODALIDADES = [
  "presencial",
  "virtual",
  "todas_las_modalidades",
] as const;

export const PROYECCION_NORMAL_MODALIDADES = ["presencial", "virtual"] as const;

export const PROYECCION_ESTADOS = ["programada", "cancelada"] as const;

export const PROYECCION_TAMANO_EMPRESA_BUCKETS = [
  "hasta_50",
  "desde_51",
  "unknown",
] as const;

export type ProyeccionServiceKey = (typeof PROYECCION_SERVICE_KEYS)[number];
export type ProyeccionMainServiceKey = (typeof PROYECCION_MAIN_SERVICE_KEYS)[number];
export type ProyeccionModalidad = (typeof PROYECCION_MODALIDADES)[number];
export type ProyeccionEstado = (typeof PROYECCION_ESTADOS)[number];
export type ProyeccionTamanoEmpresaBucket =
  (typeof PROYECCION_TAMANO_EMPRESA_BUCKETS)[number];

export function isInterpreterSuggestedService(serviceKey: string | null | undefined) {
  return (PROYECCION_INTERPRETER_SUGGESTED_SERVICE_KEYS as readonly string[]).includes(
    serviceKey ?? ""
  );
}

export function requiresProjectedPeopleCount(serviceKey: string | null | undefined) {
  return (PROYECCION_PERSON_COUNT_SERVICE_KEYS as readonly string[]).includes(
    serviceKey ?? ""
  );
}
