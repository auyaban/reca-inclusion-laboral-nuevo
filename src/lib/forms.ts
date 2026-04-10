export const FORM_LABELS: Record<string, string> = {
  presentacion: "Presentacion del Programa",
  evaluacion: "Evaluacion de Accesibilidad",
  "condiciones-vacante": "Condiciones de la Vacante",
  seleccion: "Seleccion Incluyente",
  contratacion: "Contratacion Incluyente",
  "induccion-organizacional": "Induccion Organizacional",
  "induccion-operativa": "Induccion Operativa",
  sensibilizacion: "Sensibilizacion",
  seguimientos: "Seguimientos",
};

export function getFormLabel(slug: string) {
  return FORM_LABELS[slug] ?? slug;
}
