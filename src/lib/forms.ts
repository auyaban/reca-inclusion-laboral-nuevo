export const FORM_LABELS: Record<string, string> = {
  presentacion: "Presentación del Programa",
  evaluacion: "Evaluación de Accesibilidad",
  "condiciones-vacante": "Condiciones de la Vacante",
  seleccion: "Selección Incluyente",
  contratacion: "Contratación Incluyente",
  "induccion-organizacional": "Inducción Organizacional",
  "induccion-operativa": "Inducción Operativa",
  sensibilizacion: "Sensibilización",
  seguimientos: "Seguimientos",
};

export function getFormLabel(slug: string) {
  return FORM_LABELS[slug] ?? slug;
}
