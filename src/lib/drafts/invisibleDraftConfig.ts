export const INVISIBLE_DRAFT_PILOT_SLUGS = new Set([
  "presentacion",
  "sensibilizacion",
  "condiciones-vacante",
  "seleccion",
  "contratacion",
  "induccion-organizacional",
  "induccion-operativa",
]);

// Keep the pilot flag as an operational kill switch until the rollout graduates.
export function isInvisibleDraftPilotEnabled(slug: string) {
  return INVISIBLE_DRAFT_PILOT_SLUGS.has(slug);
}
