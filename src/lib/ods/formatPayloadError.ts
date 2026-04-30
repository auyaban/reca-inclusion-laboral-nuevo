// Convierte el error 400 (Zod fieldErrors) o 500 (rpcError details) que
// devuelve `/api/ods/terminar` en mensajes amigables para el operador,
// mapeando los nombres técnicos a la sección del wizard donde están
// y agrupando errores repetidos por sección.

export type PayloadErrorResponse = {
  error?: string;
  details?: string;
  code?: string;
  hint?: string;
  fieldErrors?: Record<string, string[]>;
};

export type FriendlyError = {
  title: string;
  bullets: string[];
  technical: string | null;
};

const SECTION_LABELS: Record<string, string> = {
  // Sección 1
  orden_clausulada: "Sección 1 (Orden clausulada)",
  nombre_profesional: "Sección 1 (Profesional / Intérprete)",
  // Sección 2
  nit_empresa: "Sección 2 (NIT de la empresa)",
  nombre_empresa: "Sección 2 (Nombre de la empresa)",
  caja_compensacion: "Sección 2 (Caja de compensación)",
  asesor_empresa: "Sección 2 (Asesor)",
  sede_empresa: "Sección 2 (Sede)",
  // Sección 3
  fecha_servicio: "Sección 3 (Fecha del servicio)",
  mes_servicio: "Sección 3 (Fecha del servicio)",
  ano_servicio: "Sección 3 (Fecha del servicio)",
  codigo_servicio: "Sección 3 (Código de servicio)",
  referencia_servicio: "Sección 3 (Referencia)",
  descripcion_servicio: "Sección 3 (Descripción)",
  modalidad_servicio: "Sección 3 (Modalidad)",
  valor_total: "Sección 3 (Cálculo)",
  valor_virtual: "Sección 3 (Cálculo)",
  valor_bogota: "Sección 3 (Cálculo)",
  valor_otro: "Sección 3 (Cálculo)",
  todas_modalidades: "Sección 3 (Cálculo)",
  valor_interprete: "Sección 3 (Cálculo)",
  horas_interprete: "Sección 3 (Horas intérprete)",
  // Sección 4
  nombre_usuario: "Sección 4 (Oferentes)",
  cedula_usuario: "Sección 4 (Oferentes)",
  discapacidad_usuario: "Sección 4 (Oferentes)",
  genero_usuario: "Sección 4 (Oferentes)",
  fecha_ingreso: "Sección 4 (Oferentes)",
  tipo_contrato: "Sección 4 (Oferentes)",
  cargo_servicio: "Sección 4 (Oferentes)",
  total_personas: "Sección 4 (Oferentes)",
  usuarios_nuevos: "Sección 4 (Oferentes a crear)",
  // Sección 5
  observaciones: "Sección 5 (Observaciones)",
  observacion_agencia: "Sección 5 (Observación agencia)",
  seguimiento_servicio: "Sección 5 (Seguimiento)",
  // Sistema
  session_id: "Sistema (idempotencia)",
  started_at: "Sistema (timestamps)",
  submitted_at: "Sistema (timestamps)",
  formato_finalizado_id: "Sistema (vínculo a formato finalizado)",
};

const MESSAGE_REWRITES: Array<[RegExp, string]> = [
  [/Discapacidad inválida/i, "selecciona una discapacidad del catálogo"],
  [/Género inválido/i, "selecciona un género del catálogo"],
  [/Cédula solo dígitos/i, "la cédula solo puede contener números"],
  [/El nombre es obligatorio/i, "completa el nombre"],
  [/Modalidad inválida/i, "selecciona una modalidad válida"],
  [/El profesional es obligatorio/i, "selecciona un profesional o intérprete"],
  [/El NIT es obligatorio/i, "captura el NIT de la empresa"],
  [/La empresa es obligatoria/i, "selecciona una empresa"],
  [/El código de servicio es obligatorio/i, "selecciona un código de servicio"],
  [/La referencia es obligatoria/i, "el código de servicio no trajo referencia"],
  [/La descripción es obligatoria/i, "el código de servicio no trajo descripción"],
  [/Fecha de servicio inválida/i, "captura la fecha del servicio"],
  [/Mes debe estar entre 1 y 12/i, "captura una fecha del servicio válida"],
  [/valor_total debe ser igual a/i, "el cálculo del valor total no cuadra (revisa modalidad y horas)"],
  [/submitted_at debe ser posterior/i, "ocurrió un desfase de tiempo, intenta de nuevo"],
];

function rewriteMessage(message: string): string {
  for (const [pattern, replacement] of MESSAGE_REWRITES) {
    if (pattern.test(message)) return replacement;
  }
  return message;
}

function sectionFor(field: string): string {
  // Soporta paths anidados como "ods.modalidad_servicio" → "modalidad_servicio".
  const lastSegment = field.split(".").pop() ?? field;
  return SECTION_LABELS[lastSegment] ?? `Campo "${field}"`;
}

export function formatPayloadError(data: PayloadErrorResponse): FriendlyError {
  const technicalParts: string[] = [];
  if (data.details) technicalParts.push(`Detalle: ${data.details}`);
  if (data.code) technicalParts.push(`Código: ${data.code}`);
  if (data.hint) technicalParts.push(`Hint: ${data.hint}`);
  const technical = technicalParts.length > 0 ? technicalParts.join("\n") : null;

  // Caso A: Zod fieldErrors → mensaje por sección, agrupado y dedup.
  if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
    type Group = { messages: Map<string, number> };
    const grouped: Map<string, Group> = new Map();

    for (const [field, errors] of Object.entries(data.fieldErrors)) {
      const section = sectionFor(field);
      if (!grouped.has(section)) grouped.set(section, { messages: new Map() });
      const group = grouped.get(section)!;
      for (const err of errors ?? []) {
        const friendly = rewriteMessage(err);
        group.messages.set(friendly, (group.messages.get(friendly) ?? 0) + 1);
      }
    }

    const bullets: string[] = [];
    for (const [section, group] of grouped.entries()) {
      const items: string[] = [];
      for (const [msg, count] of group.messages.entries()) {
        items.push(count > 1 ? `${msg} (${count} veces)` : msg);
      }
      bullets.push(`${section}: ${items.join(", ")}`);
    }

    return {
      title: "No se pudo guardar la ODS porque hay datos por completar.",
      bullets,
      technical,
    };
  }

  // Caso B: error genérico (RPC, network, etc.).
  return {
    title: data.error ?? "Error desconocido al guardar la ODS.",
    bullets: [],
    technical,
  };
}
