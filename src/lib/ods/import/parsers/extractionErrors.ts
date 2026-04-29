export type ExtractionErrors = {
  nit_empresa?: { reason: string; attempted_patterns: string[] };
  nombre_empresa?: { reason: string };
  fecha_servicio?: { reason: string };
  modalidad_servicio?: { reason: string };
  participantes?: { reason: string; attempted_patterns: string[] };
};

export function createExtractionErrors(): ExtractionErrors {
  return {};
}

export function hasErrors(errors: ExtractionErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function errorSummary(errors: ExtractionErrors): string {
  const keys = Object.keys(errors);
  if (keys.length === 0) return "Sin errores";
  return `${keys.length} campo(s) con error: ${keys.join(", ")}`;
}
