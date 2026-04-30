import { z } from "zod";
import processProfilesData from "./processProfiles.json";

const profileFieldSchema = z.object({
  field_key: z.string(),
  label: z.string(),
  section: z.string().optional(),
  row: z.union([z.number(), z.array(z.number())]).optional(),
  col: z.string().optional(),
  type: z.string(),
  options: z.array(z.string()).optional(),
  note: z.string().optional(),
});

const profileFieldSourceSchema = z.object({
  field_key: z.string(),
  label: z.string(),
  section: z.string().optional(),
  row: z.union([z.number(), z.array(z.number())]).optional(),
  col: z.string().optional(),
  source_type: z.string(),
  source_sheet: z.string().optional(),
  source_cell: z.string().optional(),
});

const processProfileSchema = z.object({
  document_kind: z.string(),
  sheet_name: z.string(),
  code: z.string(),
  keep_sections: z.array(z.string()).default([]),
  ignore_sections: z.array(z.string()).default([]),
  section_aliases: z.record(z.string(), z.string()).default({}),
  required_fields: z.array(profileFieldSchema).default([]),
  field_sources: z.array(profileFieldSourceSchema).default([]),
  field_priority: z.record(z.string(), z.array(z.string())).default({}),
  forbid_fields: z.array(z.string()).default([]),
  line_mode: z.string().optional(),
  note: z.string().optional(),
});

export type ProcessProfile = z.infer<typeof processProfileSchema>;
export type ProfileField = z.infer<typeof profileFieldSchema>;
export type ProfileFieldSource = z.infer<typeof profileFieldSourceSchema>;

function normalizeProfile(raw: unknown): ProcessProfile {
  const profile = processProfileSchema.parse(raw);
  profile.section_aliases = profile.section_aliases ?? {};
  profile.keep_sections = profile.keep_sections ?? [];
  profile.ignore_sections = profile.ignore_sections ?? [];
  profile.required_fields = profile.required_fields ?? [];
  profile.field_sources = profile.field_sources ?? [];
  profile.field_priority = profile.field_priority ?? {};
  profile.forbid_fields = profile.forbid_fields ?? [];
  profile.line_mode = profile.line_mode ?? "";
  return profile;
}

let _profilesCache: Map<string, ProcessProfile> | null = null;

function loadProfiles(): Map<string, ProcessProfile> {
  if (_profilesCache) return _profilesCache;

  const payload = z.object({
    version: z.string(),
    source: z.string(),
    documents: z.array(z.unknown()),
  }).parse(processProfilesData);

  const map = new Map<string, ProcessProfile>();
  for (const doc of payload.documents) {
    if (typeof doc !== "object" || doc === null) continue;
    const record = doc as Record<string, unknown>;
    const kind = String(record.document_kind ?? "").trim();
    if (!kind) continue;
    map.set(kind, normalizeProfile(record));
  }

  _profilesCache = map;
  return map;
}

export function getProcessProfile(documentKind: string): ProcessProfile | null {
  const kind = String(documentKind || "").trim();
  if (!kind) return null;
  return loadProfiles().get(kind) ?? null;
}

export function getProfilePriorityLabels(documentKind: string): string[] {
  const profile = getProcessProfile(documentKind);
  if (!profile) return [];

  const labels: string[] = [];
  const seen = new Set<string>();

  for (const values of Object.values(profile.field_priority ?? {})) {
    for (const value of values ?? []) {
      const text = String(value || "").trim();
      if (text && !seen.has(text)) {
        seen.add(text);
        labels.push(text);
      }
    }
  }

  for (const field of profile.required_fields ?? []) {
    const label = String(field.label || "").trim();
    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }

  return labels;
}

export function buildProfilePromptContext(documentKind: string): string {
  const profile = getProcessProfile(documentKind);
  if (!profile) return "";

  const { keep_sections, ignore_sections, section_aliases, field_priority, forbid_fields } = profile;

  const lines: string[] = [`document_kind_profile: ${documentKind}`];

  if (keep_sections.length > 0) {
    const rendered = keep_sections.map((s) => `${s}=${section_aliases[s] ?? s}`);
    lines.push(`usar_solo_secciones: ${rendered.join("; ")}`);
  }

  if (ignore_sections.length > 0) {
    const rendered = ignore_sections.map((s) => `${s}=${section_aliases[s] ?? s}`);
    lines.push(`ignorar_secciones: ${rendered.join("; ")}`);
  }

  if (field_priority && Object.keys(field_priority).length > 0) {
    const parts: string[] = [];
    for (const [fieldName, labels] of Object.entries(field_priority)) {
      const clean = (labels ?? []).filter((l) => String(l || "").trim());
      if (clean.length > 0) {
        parts.push(`${fieldName}=>${clean.join(" > ")}`);
      }
    }
    if (parts.length > 0) {
      lines.push(`prioridades_campos: ${parts.join("; ")}`);
    }
  }

  if (forbid_fields.length > 0) {
    lines.push(`campos_que_deben_ir_vacios: ${forbid_fields.join(", ")}`);
  }

  return lines.join("\n");
}

const DETAILED_INSTRUCTION_OVERRIDES: Record<string, {
  description?: string;
  extract_sections?: string[];
  ignore_sections?: string[];
  field_rules?: string[];
  hard_rules?: string[];
}> = {
  vacancy_review: {
    description: "Revision de condiciones de la vacante.",
    extract_sections: [
      "1. DATOS GENERALES",
      "2. CARACTERISTICAS DE LA VACANTE",
      "8. ASISTENTES",
    ],
    ignore_sections: [
      "3. HABILIDADES Y CAPACIDADES REQUERIDAS PARA EL CARGO",
      "4. POSTURAS Y MOVIMIENTOS",
      "5. PELIGROS Y RIESGOS EN EL DESARROLLO DE LA LABOR",
      "6. LA VACANTE ES ACCESIBLE Y COMPATIBLE...",
      "7. OBSERVACIONES / RECOMENDACIONES",
    ],
    field_rules: [
      "fecha_servicio sale de 'Fecha de la Visita' en DATOS GENERALES",
      "modalidad_servicio sale siempre de 'Modalidad' en DATOS GENERALES",
      "nombre_empresa sale de 'Nombre de la Empresa'",
      "nit_empresa sale de 'Numero de NIT'",
      "nombre_profesional sale de ASISTENTES, no del asesor ni de 'Profesional asignado RECA'",
      "cargo_objetivo sale solo de 'Nombre de la vacante'",
      "total_vacantes sale solo de 'Numero de vacantes'",
    ],
    hard_rules: [
      "Ignora modalidad o cargo que aparezcan en otras secciones si contradicen DATOS GENERALES o Nombre de la vacante",
      "numero_seguimiento debe ir vacio en este formato",
      "total_empresas debe ir vacio o 0 en este formato",
      "cargo_objetivo nunca sale de asistentes",
    ],
  },
  inclusive_selection: {
    description: "Proceso de seleccion incluyente.",
    extract_sections: [
      "1. DATOS DE LA EMPRESA",
      "2. DATOS DEL OFERENTE",
      "6. ASISTENTES",
    ],
    ignore_sections: [
      "3. DESARROLLO DE LA ACTIVIDAD",
      "4. CARACTERIZACION DEL OFERENTE",
      "4.1 Condiciones medicas y de salud",
      "4.2 Habilidades basicas de la vida diaria",
      "5. AJUSTES RAZONABLES / RECOMENDACIONES AL PROCESO DE SELECCION",
    ],
    field_rules: [
      "fecha_servicio sale de 'Fecha de la Visita'",
      "modalidad_servicio sale siempre de DATOS DE LA EMPRESA o DATOS GENERALES",
      "participantes salen de la tabla de DATOS DEL OFERENTE",
      "cargo_objetivo sale solo del campo rotulado 'Cargo' dentro de DATOS DEL OFERENTE, no del Cargo del contacto de empresa",
      "en seleccion incluyente, el cargo objetivo suele aparecer muy cerca de Nombre oferente y Cedula, en la fila inferior de la misma tabla",
      "nombre_profesional sale de asistentes, pero cargo_objetivo nunca sale de asistentes",
    ],
    hard_rules: [
      "numero_seguimiento debe ir vacio",
      "ignora cualquier 'Cargo' que aparezca en DATOS DE LA EMPRESA o junto al contacto de la empresa",
      "si el cargo aparece solo como texto libre fuera de una etiqueta valida, dejar cargo_objetivo vacio",
    ],
  },
  inclusive_hiring: {
    description: "Proceso de contratacion incluyente.",
    extract_sections: [
      "1. DATOS DE LA EMPRESA",
      "2. DATOS DEL VINCULADO",
      "3. DATOS ADICIONALES",
      "7. ASISTENTES",
    ],
    ignore_sections: [
      "4. DESARROLLO DE LA ACTIVIDAD",
      "5. ACOMPANAMIENTO AL PROCESO",
      "5.1 Condiciones de la vacante",
      "5.2 Prestaciones de ley",
      "5.3 Deberes y derechos del trabajador",
      "5. AJUSTES RAZONABLES / RECOMENDACIONES",
    ],
    field_rules: [
      "modalidad_servicio sale de DATOS DE LA EMPRESA o DATOS GENERALES",
      "participantes salen de DATOS DEL VINCULADO",
      "cargo_objetivo sale solo del campo 'Cargo'",
      "tipo de contrato sale de DATOS ADICIONALES",
    ],
    hard_rules: [
      "numero_seguimiento debe ir vacio",
      "cargo_objetivo nunca sale de asistentes",
    ],
  },
  follow_up: {
    description: "Seguimiento al proceso IL.",
    extract_sections: [
      "1. DATOS DE LA EMPRESA",
      "2. DATOS DEL VINCULADO",
      "3. DATOS DEL CARGO OCUPADO POR EL VINCULADO",
      "5. FECHAS DE SEGUIMIENTO Y ACOMPANAMIENTO",
    ],
    ignore_sections: ["4. FUNCIONES DEL VINCULADO"],
    field_rules: [
      "modalidad_servicio sale de DATOS DE LA EMPRESA o DATOS GENERALES",
      "numero_seguimiento solo aplica si el documento trae un seguimiento identificado",
      "cargo_objetivo sale de 'Cargo que ocupa'",
    ],
    hard_rules: [
      "si no hay numero de seguimiento claro, dejar numero_seguimiento vacio y marcar needs_review",
    ],
  },
  interpreter_service: {
    description: "Servicio interprete LSC.",
    extract_sections: [
      "DATOS GENERALES",
      "DATOS DEL INTERPRETE",
      "DATOS DEL OFERENTE",
      "ASISTENTES",
    ],
    ignore_sections: [
      "DESARROLLO DE LA ACTIVIDAD",
      "OBSERVACIONES / RECOMENDACIONES",
    ],
    field_rules: [
      "nombre_profesional sale de 'Nombre interprete'",
      "si hay varios interpretes, devuelvelos todos en 'interpretes'",
      "prioriza 'SUMATORIA HORAS INTERPRETES'; si no existe usa 'Total Tiempo'",
      "nombre_empresa sale de 'Nombre de la empresa' en DATOS GENERALES",
      "fecha_servicio sale de 'Fecha de la visita' en DATOS GENERALES",
      "participantes salen de DATOS DEL OFERENTE usando Nombre oferente y Cedula",
      "modalidad_servicio sale de DATOS GENERALES",
    ],
    hard_rules: [
      "cargo_objetivo debe ir vacio",
      "no tomes nombre_interprete, nombre_oferente ni cedula desde ASISTENTES si el documento trae secciones especificas",
      "si falta nit_empresa, usa solo el nombre de empresa; la conciliacion final se hace afuera",
      "si falta Nombre interprete y no existe un campo explicito, solo entonces usa asistentes como fallback",
    ],
  },
};

export function buildDetailedExtractionInstructions(documentKind: string): string {
  const profile = getProcessProfile(documentKind);
  const override = DETAILED_INSTRUCTION_OVERRIDES[documentKind] ?? {};

  if (!profile && !Object.keys(override).length) return "";

  const aliases = profile?.section_aliases ?? {};
  const keepSections = profile?.keep_sections ?? [];
  const ignoreSections = profile?.ignore_sections ?? [];
  const requiredFields = profile?.required_fields ?? [];
  const fieldSources = profile?.field_sources ?? [];
  const fieldPriority = profile?.field_priority ?? {};

  const lines: string[] = ["guia_extraccion_especifica:"];

  const description = String(override.description ?? "").trim();
  if (description) {
    lines.push(`- tipo: ${description}`);
  }

  const extractSections = (override.extract_sections ?? []).length > 0
    ? override.extract_sections!
    : keepSections.map((s) => aliases[s] ?? s);

  if (extractSections.length > 0) {
    lines.push("- extraer_solo_de:");
    for (const section of extractSections) {
      lines.push(`  * ${section}`);
    }
  }

  const ignored = (override.ignore_sections ?? []).length > 0
    ? override.ignore_sections!
    : ignoreSections.map((s) => aliases[s] ?? s);

  if (ignored.length > 0) {
    lines.push("- ignorar:");
    for (const section of ignored) {
      lines.push(`  * ${section}`);
    }
  }

  const fieldRules = override.field_rules ?? [];
  if (fieldRules.length > 0) {
    lines.push("- reglas_campos:");
    for (const rule of fieldRules) {
      lines.push(`  * ${rule}`);
    }
  }

  const hardRules = override.hard_rules ?? [];
  if (hardRules.length > 0) {
    lines.push("- reglas_duras:");
    for (const rule of hardRules) {
      lines.push(`  * ${rule}`);
    }
  }

  if (requiredFields.length > 0) {
    lines.push("- etiquetas_clave:");
    for (const field of requiredFields.slice(0, 12)) {
      if (typeof field !== "object" || field === null) continue;
      const label = String(field.label ?? "").trim();
      const section = String(field.section ?? "").trim();
      if (label) {
        const sectionName = section ? (aliases[section] ?? section) : "";
        lines.push(sectionName ? `  * ${label} [${sectionName}]` : `  * ${label}`);
      }
    }
  }

  if (Object.keys(fieldPriority).length > 0) {
    lines.push("- mapa_campos_prioritarios:");
    for (const [fieldName, labels] of Object.entries(fieldPriority)) {
      const clean = (labels ?? []).filter((l) => String(l || "").trim());
      if (clean.length > 0) {
        lines.push(`  * ${fieldName}: ${clean.join(" > ")}`);
      }
    }
  }

  if (fieldSources.length > 0) {
    lines.push("- campos_de_apoyo_o_heredados:");
    for (const field of fieldSources.slice(0, 10)) {
      if (typeof field !== "object" || field === null) continue;
      const fieldKey = String(field.field_key ?? "").trim();
      const label = String(field.label ?? "").trim();
      const section = String(field.section ?? "").trim();
      const sourceType = String(field.source_type ?? "").trim();
      const sectionName = section ? (aliases[section] ?? section) : "";
      const pieces = [fieldKey, label, sectionName, sourceType].filter(Boolean);
      if (pieces.length > 0) {
        lines.push(`  * ${pieces.join(" | ")}`);
      }
    }
  }

  lines.push("- regla_global: modalidad_servicio siempre sale de DATOS GENERALES o DATOS DE LA EMPRESA, no de secciones posteriores");
  lines.push("- regla_global: cargo_objetivo nunca puede salir de asistentes");
  lines.push("- regla_global: cargo_objetivo solo es valido si viene junto a una etiqueta explicita como Cargo, Nombre de la vacante o Cargo que ocupa");
  if (documentKind !== "interpreter_service") {
    lines.push("- regla_global: nombre_profesional siempre sale de la seccion ASISTENTES; no usar asesor ni profesional asignado RECA");
  }
  lines.push("- regla_global: usa el PDF como fuente primaria; ignora cualquier OCR local faltante o desordenado");

  return lines.join("\n");
}

export function clearProfilesCache(): void {
  _profilesCache = null;
}
