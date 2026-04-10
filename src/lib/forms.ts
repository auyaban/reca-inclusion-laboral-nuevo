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

const FORM_TAB_LABELS: Record<string, string> = {
  presentacion: "Presentación",
  evaluacion: "Evaluación",
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

export function getFormTabLabel(slug: string) {
  return FORM_TAB_LABELS[slug] ?? getFormLabel(slug);
}
