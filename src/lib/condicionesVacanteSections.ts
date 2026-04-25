import {
  isCompleteAsistente,
  ASESOR_AGENCIA_CARGO,
  normalizeAsistenteLike,
} from "@/lib/asistentes";
import {
  CONDICIONES_VACANTE_FAILED_VISIT_MIN_SIGNIFICANT_ATTENDEES,
  CONDICIONES_VACANTE_FAILED_VISIT_OPTIONAL_FIELDS,
  CONDICIONES_VACANTE_MIN_SIGNIFICANT_ATTENDEES,
  CONDICIONES_VACANTE_MIN_SIGNIFICANT_DISCAPACIDADES,
  type CondicionesVacanteValues,
} from "@/lib/validations/condicionesVacante";

type CondicionesVacanteFieldId = keyof CondicionesVacanteValues;

export type CondicionesVacanteContentSectionId =
  | "vacancy"
  | "education"
  | "capabilities"
  | "postures"
  | "risks"
  | "disabilities"
  | "recommendations"
  | "attendees";

export type CondicionesVacanteSectionId =
  | "company"
  | CondicionesVacanteContentSectionId;

export const CONDICIONES_VACANTE_SECTION_IDS = [
  "company",
  "vacancy",
  "education",
  "capabilities",
  "postures",
  "risks",
  "disabilities",
  "recommendations",
  "attendees",
] as const satisfies readonly CondicionesVacanteSectionId[];

export const CONDICIONES_VACANTE_CONTENT_SECTION_IDS = [
  "vacancy",
  "education",
  "capabilities",
  "postures",
  "risks",
  "disabilities",
  "recommendations",
  "attendees",
] as const satisfies readonly CondicionesVacanteContentSectionId[];

export const CONDICIONES_VACANTE_COMPAT_STEP_TO_SECTION_ID: Record<
  number,
  CondicionesVacanteContentSectionId
> = {
  0: "vacancy",
  1: "education",
  2: "capabilities",
  3: "postures",
  4: "risks",
  5: "disabilities",
  6: "recommendations",
  7: "attendees",
};

export const CONDICIONES_VACANTE_COMPAT_SECTION_TO_STEP: Record<
  CondicionesVacanteContentSectionId,
  number
> = {
  vacancy: 0,
  education: 1,
  capabilities: 2,
  postures: 3,
  risks: 4,
  disabilities: 5,
  recommendations: 6,
  attendees: 7,
};

export const CONDICIONES_VACANTE_SECTION_LABELS: Record<
  CondicionesVacanteSectionId,
  string
> = {
  company: "Empresa",
  vacancy: "Características de la vacante",
  education: "Formación, horarios y experiencia",
  capabilities: "Habilidades y capacidades",
  postures: "Posturas y movimientos",
  risks: "Peligros y riesgos",
  disabilities: "Discapacidades compatibles",
  recommendations: "Observaciones y recomendaciones",
  attendees: "Asistentes",
};

export const INITIAL_CONDICIONES_VACANTE_COLLAPSED_SECTIONS: Record<
  CondicionesVacanteSectionId,
  boolean
> = {
  company: false,
  vacancy: false,
  education: false,
  capabilities: false,
  postures: false,
  risks: false,
  disabilities: false,
  recommendations: false,
  attendees: false,
};

export const CONDICIONES_VACANTE_COMPANY_REQUIRED_FIELDS = [
  "fecha_visita",
  "modalidad",
  "nit_empresa",
] as const satisfies readonly CondicionesVacanteFieldId[];

export const CONDICIONES_VACANTE_VACANCY_REQUIRED_FIELDS = [
  "nombre_vacante",
  "numero_vacantes",
  "nivel_cargo",
  "genero",
  "edad",
  "modalidad_trabajo",
  "lugar_trabajo",
  "salario_asignado",
  "firma_contrato",
  "aplicacion_pruebas",
  "tipo_contrato",
  "beneficios_adicionales",
  "cargo_flexible_genero",
  "beneficios_mujeres",
  "requiere_certificado",
  "requiere_certificado_observaciones",
] as const satisfies readonly CondicionesVacanteFieldId[];

export const CONDICIONES_VACANTE_EDUCATION_CHECKBOX_FIELDS = [
  "nivel_primaria",
  "nivel_bachiller",
  "nivel_tecnico_profesional",
  "nivel_profesional",
  "nivel_especializacion",
  "nivel_tecnologo",
] as const satisfies readonly CondicionesVacanteFieldId[];

export const CONDICIONES_VACANTE_EDUCATION_REQUIRED_FIELDS = [
  "especificaciones_formacion",
  "conocimientos_basicos",
  "horarios_asignados",
  "hora_ingreso",
  "hora_salida",
  "tiempo_almuerzo",
  "break_descanso",
  "dias_laborables",
  "dias_flexibles",
  "observaciones",
  "experiencia_meses",
  "funciones_tareas",
  "herramientas_equipos",
] as const satisfies readonly CondicionesVacanteFieldId[];

export const CONDICIONES_VACANTE_CAPABILITIES_REQUIRED_FIELDS = [
  "lectura",
  "comprension_lectora",
  "escritura",
  "comunicacion_verbal",
  "razonamiento_logico",
  "conteo_reporte",
  "clasificacion_objetos",
  "velocidad_ejecucion",
  "concentracion",
  "memoria",
  "ubicacion_espacial",
  "atencion",
  "observaciones_cognitivas",
  "agarre",
  "precision",
  "digitacion",
  "agilidad_manual",
  "coordinacion_ojo_mano",
  "observaciones_motricidad_fina",
  "esfuerzo_fisico",
  "equilibrio_corporal",
  "lanzar_objetos",
  "observaciones_motricidad_gruesa",
  "seguimiento_instrucciones",
  "resolucion_conflictos",
  "autonomia_tareas",
  "trabajo_equipo",
  "adaptabilidad",
  "flexibilidad",
  "comunicacion_asertiva",
  "manejo_tiempo",
  "liderazgo",
  "escucha_activa",
  "proactividad",
  "observaciones_transversales",
] as const satisfies readonly CondicionesVacanteFieldId[];

export const CONDICIONES_VACANTE_POSTURES_REQUIRED_FIELDS = [
  "sentado_tiempo",
  "sentado_frecuencia",
  "semisentado_tiempo",
  "semisentado_frecuencia",
  "de_pie_tiempo",
  "de_pie_frecuencia",
  "agachado_tiempo",
  "agachado_frecuencia",
  "uso_extremidades_superiores_tiempo",
  "uso_extremidades_superiores_frecuencia",
] as const satisfies readonly CondicionesVacanteFieldId[];

export const CONDICIONES_VACANTE_RISKS_REQUIRED_FIELDS = [
  "ruido",
  "iluminacion",
  "temperaturas_externas",
  "vibraciones",
  "presion_atmosferica",
  "radiaciones",
  "polvos_organicos_inorganicos",
  "fibras",
  "liquidos",
  "gases_vapores",
  "humos_metalicos",
  "humos_no_metalicos",
  "material_particulado",
  "electrico",
  "locativo",
  "accidentes_transito",
  "publicos",
  "mecanico",
  "gestion_organizacional",
  "caracteristicas_organizacion",
  "caracteristicas_grupo_social",
  "condiciones_tarea",
  "interfase_persona_tarea",
  "jornada_trabajo",
  "postura_trabajo",
  "puesto_trabajo",
  "movimientos_repetitivos",
  "manipulacion_cargas",
  "herramientas_equipos_riesgo",
  "organizacion_trabajo",
  "observaciones_peligros",
] as const satisfies readonly CondicionesVacanteFieldId[];

export const CONDICIONES_VACANTE_RECOMMENDATIONS_REQUIRED_FIELDS = [
  "observaciones_recomendaciones",
] as const satisfies readonly CondicionesVacanteFieldId[];

function isFilled(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function areFieldsFilled(
  values: CondicionesVacanteValues,
  fieldIds: readonly CondicionesVacanteFieldId[]
) {
  return fieldIds.every((fieldId) => isFilled(values[fieldId]));
}

function isFailedVisitOptionalField(
  fieldId: CondicionesVacanteFieldId,
  failedVisitAppliedAt?: string | null
) {
  return Boolean(
    failedVisitAppliedAt &&
      CONDICIONES_VACANTE_FAILED_VISIT_OPTIONAL_FIELDS.includes(
        fieldId as (typeof CONDICIONES_VACANTE_FAILED_VISIT_OPTIONAL_FIELDS)[number]
      )
  );
}

function isOptionalAgencyAdvisorRow(
  asistentes: CondicionesVacanteValues["asistentes"],
  index: number,
  failedVisitAppliedAt?: string | null
) {
  if (!failedVisitAppliedAt || index !== asistentes.length - 1) {
    return false;
  }

  const normalized = normalizeAsistenteLike(asistentes[index] ?? {});
  return (
    !normalized.nombre &&
    normalized.cargo.toLocaleLowerCase("es-CO") ===
      ASESOR_AGENCIA_CARGO.toLocaleLowerCase("es-CO")
  );
}

export function getCondicionesVacanteSectionIdForStep(step: number) {
  return CONDICIONES_VACANTE_COMPAT_STEP_TO_SECTION_ID[step] ?? "vacancy";
}

export function getCondicionesVacanteCompatStepForSection(
  sectionId: CondicionesVacanteContentSectionId
) {
  return CONDICIONES_VACANTE_COMPAT_SECTION_TO_STEP[sectionId];
}

export function isCondicionesVacanteCompanySectionComplete(values: {
  hasEmpresa: boolean;
  fecha_visita?: string;
  modalidad?: string;
  nit_empresa?: string;
}) {
  return (
    values.hasEmpresa &&
    Boolean(
      values.fecha_visita &&
        values.modalidad &&
        values.nit_empresa?.trim()
    )
  );
}

export function isCondicionesVacanteVacancySectionComplete(
  values: CondicionesVacanteValues
) {
  return CONDICIONES_VACANTE_VACANCY_REQUIRED_FIELDS.every((fieldId) => {
    if (isFailedVisitOptionalField(fieldId, values.failed_visit_applied_at)) {
      return true;
    }

    return isFilled(values[fieldId]);
  });
}

export function isCondicionesVacanteEducationSectionComplete(
  values: CondicionesVacanteValues
) {
  if (values.failed_visit_applied_at) {
    return CONDICIONES_VACANTE_EDUCATION_REQUIRED_FIELDS.every((fieldId) => {
      if (isFailedVisitOptionalField(fieldId, values.failed_visit_applied_at)) {
        return true;
      }

      return isFilled(values[fieldId]);
    });
  }

  const hasEducationLevel = CONDICIONES_VACANTE_EDUCATION_CHECKBOX_FIELDS.some(
    (fieldId) => values[fieldId]
  );

  return (
    hasEducationLevel &&
    areFieldsFilled(values, CONDICIONES_VACANTE_EDUCATION_REQUIRED_FIELDS)
  );
}

export function isCondicionesVacanteCapabilitiesSectionComplete(
  values: CondicionesVacanteValues
) {
  return areFieldsFilled(
    values,
    CONDICIONES_VACANTE_CAPABILITIES_REQUIRED_FIELDS
  );
}

export function isCondicionesVacantePosturesSectionComplete(
  values: CondicionesVacanteValues
) {
  return areFieldsFilled(values, CONDICIONES_VACANTE_POSTURES_REQUIRED_FIELDS);
}

export function isCondicionesVacanteRisksSectionComplete(
  values: CondicionesVacanteValues
) {
  return areFieldsFilled(values, CONDICIONES_VACANTE_RISKS_REQUIRED_FIELDS);
}

export function isCondicionesVacanteDisabilitiesSectionComplete(
  values: Pick<CondicionesVacanteValues, "discapacidades" | "failed_visit_applied_at">
) {
  if (values.failed_visit_applied_at) {
    return true;
  }

  const meaningfulRows = values.discapacidades.filter((row) =>
    row.discapacidad.trim()
  );

  return meaningfulRows.length >= CONDICIONES_VACANTE_MIN_SIGNIFICANT_DISCAPACIDADES;
}

export function isCondicionesVacanteRecommendationsSectionComplete(
  values: Pick<CondicionesVacanteValues, "observaciones_recomendaciones">
) {
  return values.observaciones_recomendaciones.trim().length > 0;
}

export function isCondicionesVacanteAttendeesSectionComplete(
  values: Pick<
    CondicionesVacanteValues,
    "asistentes" | "failed_visit_applied_at"
  >
) {
  const failedVisitAppliedAt = values.failed_visit_applied_at;
  const meaningfulAsistentes = values.asistentes.filter((asistente, index) => {
    if (
      isOptionalAgencyAdvisorRow(
        values.asistentes,
        index,
        failedVisitAppliedAt
      )
    ) {
      return false;
    }

    const normalized = normalizeAsistenteLike(asistente);
    return Boolean(normalized.nombre || normalized.cargo);
  });
  const requiredMeaningfulAttendees = failedVisitAppliedAt
    ? CONDICIONES_VACANTE_FAILED_VISIT_MIN_SIGNIFICANT_ATTENDEES
    : CONDICIONES_VACANTE_MIN_SIGNIFICANT_ATTENDEES;

  return (
    meaningfulAsistentes.length >= requiredMeaningfulAttendees &&
    meaningfulAsistentes.every((asistente) => isCompleteAsistente(asistente))
  );
}
