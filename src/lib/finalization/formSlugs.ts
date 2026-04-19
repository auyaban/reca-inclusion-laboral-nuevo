export const FINALIZATION_FORM_SLUGS = [
  "presentacion",
  "sensibilizacion",
  "seleccion",
  "contratacion",
  "condiciones-vacante",
  "evaluacion",
  "induccion-organizacional",
  "induccion-operativa",
] as const;

export type FinalizationFormSlug = (typeof FINALIZATION_FORM_SLUGS)[number];

export const CANONICAL_FINALIZATION_FORM_SLUGS = [
  "presentacion",
  "sensibilizacion",
  "seleccion",
  "contratacion",
  "condiciones-vacante",
  "evaluacion",
] as const;

export type CanonicalFinalizationFormSlug =
  (typeof CANONICAL_FINALIZATION_FORM_SLUGS)[number];

export const FINALIZATION_STATUS_FORM_SLUGS = FINALIZATION_FORM_SLUGS;
export type FinalizationStatusFormSlug = FinalizationFormSlug;

export function isCanonicalFinalizationFormSlug(
  formSlug: string
): formSlug is CanonicalFinalizationFormSlug {
  return (CANONICAL_FINALIZATION_FORM_SLUGS as readonly string[]).includes(
    formSlug.trim()
  );
}
