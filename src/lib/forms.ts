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

export const LONG_FORM_SLUGS = [
  "presentacion",
  "evaluacion",
  "condiciones-vacante",
  "seleccion",
  "contratacion",
  "induccion-organizacional",
  "induccion-operativa",
  "sensibilizacion",
] as const;

export type LongFormSlug = (typeof LONG_FORM_SLUGS)[number];

const LONG_FORM_SLUGS_SET = new Set<string>(LONG_FORM_SLUGS);

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

export function isLongFormSlug(slug: string): slug is LongFormSlug {
  return LONG_FORM_SLUGS_SET.has(slug);
}

export function getFormLabel(slug: string) {
  return FORM_LABELS[slug] ?? slug;
}

export function getFormTabLabel(slug: string) {
  return FORM_TAB_LABELS[slug] ?? getFormLabel(slug);
}

export function getFormEditorPath(slug: string) {
  if (isLongFormSlug(slug) || slug === "seguimientos") {
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
