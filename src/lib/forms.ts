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

export function getFormEditorPath(slug: string) {
  if (slug === "presentacion" || slug === "sensibilizacion") {
    return `/formularios/${slug}`;
  }

  return `/formularios/${slug}/seccion-2`;
}

export function buildFormEditorUrl(
  slug: string,
  options?: {
    draftId?: string | null;
    sessionId?: string | null;
    isNewDraft?: boolean;
  }
) {
  const basePath = getFormEditorPath(slug);
  const searchParams = new URLSearchParams();

  if (options?.draftId) {
    searchParams.set("draft", options.draftId);
  }

  if (options?.sessionId) {
    searchParams.set("session", options.sessionId);
  }

  if (options?.isNewDraft) {
    searchParams.set("new", "1");
  }

  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}
