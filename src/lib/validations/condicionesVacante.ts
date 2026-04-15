import { z } from "zod";
import { normalizeAsistenteLike } from "@/lib/asistentes";
import { MODALIDAD_OPTIONS } from "@/lib/modalidad";

export { MODALIDAD_OPTIONS };

export const CONDICIONES_VACANTE_COMPETENCIAS_LENGTH = 8;
export const CONDICIONES_VACANTE_BASE_DISCAPACIDADES_ROWS = 4;
export const CONDICIONES_VACANTE_BASE_ASISTENTES_ROWS = 3;
export const CONDICIONES_VACANTE_MIN_SIGNIFICANT_DISCAPACIDADES = 1;
export const CONDICIONES_VACANTE_MIN_SIGNIFICANT_ATTENDEES = 2;

export const CONDICIONES_VACANTE_NIVEL_CARGO_OPTIONS = [
  "Administrativo.",
  "Operativo.",
  "Servicios.",
] as const;

export const CONDICIONES_VACANTE_GENERO_OPTIONS = [
  "Hombre",
  "Mujer",
  "Hombre - Mujer",
  "Otro",
  "Indiferente",
] as const;

export const CONDICIONES_VACANTE_TIPO_CONTRATO_OPTIONS = [
  "Término Fijo.",
  "Término Indefinido.",
  "Obra o Labor.",
  "Prestación de Servicios.",
  "Término Indefinido con Cláusula presuntiva.",
  "Nombramiento.",
  "Contrato de Aprendizaje.",
  "Nombramiento provisional.",
] as const;

export const CONDICIONES_VACANTE_REQUIERE_CERTIFICADO_OPTIONS = [
  "Sí",
  "No",
  "En Trámite",
] as const;

export const CONDICIONES_VACANTE_HORARIOS_ASIGNADOS_OPTIONS = [
  "Horarios Fijos.",
  "Horarios Rotativos.",
  "Flexibilización de horarios",
] as const;

export const CONDICIONES_VACANTE_TIEMPO_ALMUERZO_OPTIONS = [
  "15 minutos.",
  "30 minutos.",
  "45 minutos.",
  "1 hora.",
  "2 horas.",
  "No aplica.",
] as const;

export const CONDICIONES_VACANTE_BREAK_DESCANSO_OPTIONS = [
  "15 minutos",
  "30 minutos",
  "45 minutos",
  "1 hora",
  "No aplica",
] as const;

export const CONDICIONES_VACANTE_EXPERIENCIA_MESES_OPTIONS = [
  "Sin experiencia laboral.",
  "Tres Meses",
  "Seis meses.",
  "Las prácticas son válidas como experiencia laboral.",
  "Con o Sin Experiencia",
  "Un año.",
  "Año y medio.",
  "Dos Años",
  "Dos años y medio",
  "Tres Años",
  "Cuatro Años",
  "Cinco Años",
] as const;

export const CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS = [
  "Bajo.",
  "Medio.",
  "Alto.",
  "No aplica",
] as const;

export const CONDICIONES_VACANTE_TIEMPO_OPTIONS = [
  "De 1 a 2 horas.",
  "De 2 a 4 horas.",
  "De 4 a 6 horas.",
  "De 6 a 8 horas.",
  "No aplica",
] as const;

export const CONDICIONES_VACANTE_FRECUENCIA_OPTIONS = [
  "Mensual.",
  "Quincenal.",
  "Semanal.",
  "Diario.",
  "No aplica.",
] as const;

export const CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS = [
  "Bajo.",
  "Medio.",
  "Alto.",
  "No aplica",
] as const;

export const CONDICIONES_VACANTE_TEXT_FIELDS = [
  "fecha_visita",
  "nit_empresa",
  "nombre_vacante",
  "numero_vacantes",
  "edad",
  "modalidad_trabajo",
  "lugar_trabajo",
  "salario_asignado",
  "firma_contrato",
  "aplicacion_pruebas",
  "beneficios_adicionales",
  "cargo_flexible_genero",
  "beneficios_mujeres",
  "requiere_certificado_observaciones",
  "especificaciones_formacion",
  "conocimientos_basicos",
  "hora_ingreso",
  "hora_salida",
  "dias_laborables",
  "dias_flexibles",
  "observaciones",
  "funciones_tareas",
  "herramientas_equipos",
  "observaciones_cognitivas",
  "observaciones_motricidad_fina",
  "observaciones_motricidad_gruesa",
  "observaciones_transversales",
  "observaciones_peligros",
  "observaciones_recomendaciones",
] as const;

export const CONDICIONES_VACANTE_CHECKBOX_FIELDS = [
  "nivel_primaria",
  "nivel_bachiller",
  "nivel_tecnico_profesional",
  "nivel_profesional",
  "nivel_especializacion",
  "nivel_tecnologo",
] as const;

export const CONDICIONES_VACANTE_OPTION_FIELDS = {
  modalidad: MODALIDAD_OPTIONS,
  nivel_cargo: CONDICIONES_VACANTE_NIVEL_CARGO_OPTIONS,
  genero: CONDICIONES_VACANTE_GENERO_OPTIONS,
  tipo_contrato: CONDICIONES_VACANTE_TIPO_CONTRATO_OPTIONS,
  requiere_certificado: CONDICIONES_VACANTE_REQUIERE_CERTIFICADO_OPTIONS,
  horarios_asignados: CONDICIONES_VACANTE_HORARIOS_ASIGNADOS_OPTIONS,
  tiempo_almuerzo: CONDICIONES_VACANTE_TIEMPO_ALMUERZO_OPTIONS,
  break_descanso: CONDICIONES_VACANTE_BREAK_DESCANSO_OPTIONS,
  experiencia_meses: CONDICIONES_VACANTE_EXPERIENCIA_MESES_OPTIONS,
  lectura: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  comprension_lectora: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  escritura: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  comunicacion_verbal: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  razonamiento_logico: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  conteo_reporte: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  clasificacion_objetos: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  velocidad_ejecucion: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  concentracion: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  memoria: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  ubicacion_espacial: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  atencion: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  agarre: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  precision: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  digitacion: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  agilidad_manual: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  coordinacion_ojo_mano: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  esfuerzo_fisico: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  equilibrio_corporal: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  lanzar_objetos: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  seguimiento_instrucciones: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  resolucion_conflictos: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  autonomia_tareas: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  trabajo_equipo: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  adaptabilidad: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  flexibilidad: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  comunicacion_asertiva: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  manejo_tiempo: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  liderazgo: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  escucha_activa: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  proactividad: CONDICIONES_VACANTE_HABILIDAD_LEVEL_OPTIONS,
  sentado_tiempo: CONDICIONES_VACANTE_TIEMPO_OPTIONS,
  sentado_frecuencia: CONDICIONES_VACANTE_FRECUENCIA_OPTIONS,
  semisentado_tiempo: CONDICIONES_VACANTE_TIEMPO_OPTIONS,
  semisentado_frecuencia: CONDICIONES_VACANTE_FRECUENCIA_OPTIONS,
  de_pie_tiempo: CONDICIONES_VACANTE_TIEMPO_OPTIONS,
  de_pie_frecuencia: CONDICIONES_VACANTE_FRECUENCIA_OPTIONS,
  agachado_tiempo: CONDICIONES_VACANTE_TIEMPO_OPTIONS,
  agachado_frecuencia: CONDICIONES_VACANTE_FRECUENCIA_OPTIONS,
  uso_extremidades_superiores_tiempo: CONDICIONES_VACANTE_TIEMPO_OPTIONS,
  uso_extremidades_superiores_frecuencia:
    CONDICIONES_VACANTE_FRECUENCIA_OPTIONS,
  ruido: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  iluminacion: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  temperaturas_externas: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  vibraciones: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  presion_atmosferica: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  radiaciones: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  polvos_organicos_inorganicos: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  fibras: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  liquidos: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  gases_vapores: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  humos_metalicos: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  humos_no_metalicos: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  material_particulado: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  electrico: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  locativo: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  accidentes_transito: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  publicos: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  mecanico: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  gestion_organizacional: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  caracteristicas_organizacion: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  caracteristicas_grupo_social: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  condiciones_tarea: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  interfase_persona_tarea: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  jornada_trabajo: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  postura_trabajo: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  puesto_trabajo: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  movimientos_repetitivos: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  manipulacion_cargas: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  herramientas_equipos_riesgo: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
  organizacion_trabajo: CONDICIONES_VACANTE_RIESGO_LEVEL_OPTIONS,
} as const satisfies Record<string, readonly string[]>;

export const CONDICIONES_VACANTE_DEFAULT_NIVEL_CARGO =
  CONDICIONES_VACANTE_NIVEL_CARGO_OPTIONS[0];

function requiredTextField(message = "Este campo es obligatorio") {
  return z.string().trim().min(1, message);
}

function requiredOptionField(options: readonly string[]) {
  return z
    .string()
    .trim()
    .min(1, "Selecciona una opción")
    .refine((value) => options.includes(value), {
      message: "Selecciona una opción válida",
    });
}

function buildRequiredTextShape<const TFieldIds extends readonly string[]>(
  fieldIds: TFieldIds
) {
  const shape = {} as {
    [K in TFieldIds[number]]: ReturnType<typeof requiredTextField>;
  };

  for (const fieldId of fieldIds) {
    shape[fieldId as TFieldIds[number]] = requiredTextField();
  }

  return shape;
}

function buildRequiredOptionShape<
  const TFieldOptions extends Record<string, readonly string[]>,
>(fieldOptions: TFieldOptions) {
  const shape = {} as {
    [K in keyof TFieldOptions]: ReturnType<typeof requiredOptionField>;
  };

  for (const [fieldId, options] of Object.entries(fieldOptions) as [
    keyof TFieldOptions,
    readonly string[],
  ][]) {
    shape[fieldId] = requiredOptionField(options);
  }

  return shape;
}

function buildCheckboxShape<const TFieldIds extends readonly string[]>(
  fieldIds: TFieldIds
) {
  const shape = {} as { [K in TFieldIds[number]]: z.ZodBoolean };

  for (const fieldId of fieldIds) {
    shape[fieldId as TFieldIds[number]] = z.boolean();
  }

  return shape;
}

export const condicionesVacanteCompetenciaSchema = requiredTextField();

export const condicionesVacanteDiscapacidadRowSchema = z.object({
  discapacidad: z.string(),
  descripcion: z.string(),
});

export const condicionesVacanteAsistenteSchema = z.object({
  nombre: z.string(),
  cargo: z.string(),
});

export const condicionesVacanteSchema = z
  .object({
    ...buildRequiredTextShape(CONDICIONES_VACANTE_TEXT_FIELDS),
    ...buildRequiredOptionShape(CONDICIONES_VACANTE_OPTION_FIELDS),
    ...buildCheckboxShape(CONDICIONES_VACANTE_CHECKBOX_FIELDS),
    competencias: z
      .array(condicionesVacanteCompetenciaSchema)
      .length(
        CONDICIONES_VACANTE_COMPETENCIAS_LENGTH,
        `Debes conservar exactamente ${CONDICIONES_VACANTE_COMPETENCIAS_LENGTH} competencias derivadas.`
      ),
    discapacidades: z
      .array(condicionesVacanteDiscapacidadRowSchema)
      .superRefine((rows, ctx) => {
        let meaningfulRows = 0;

        rows.forEach((row) => {
          const discapacidad = row.discapacidad.trim();
          if (!discapacidad) {
            return;
          }

          meaningfulRows += 1;
        });

        if (meaningfulRows < CONDICIONES_VACANTE_MIN_SIGNIFICANT_DISCAPACIDADES) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Agrega al menos una discapacidad compatible.",
          });
        }
      }),
    asistentes: z.array(condicionesVacanteAsistenteSchema).superRefine((rows, ctx) => {
      let meaningfulRows = 0;

      rows.forEach((row, index) => {
        const normalized = normalizeAsistenteLike(row);
        if (!normalized.nombre && !normalized.cargo) {
          return;
        }

        meaningfulRows += 1;

        if (!normalized.nombre) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El nombre es requerido",
            path: [index, "nombre"],
          });
        }

        if (!normalized.cargo) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El cargo es requerido",
            path: [index, "cargo"],
          });
        }
      });

      if (meaningfulRows < CONDICIONES_VACANTE_MIN_SIGNIFICANT_ATTENDEES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Agrega al menos ${CONDICIONES_VACANTE_MIN_SIGNIFICANT_ATTENDEES} asistentes significativos.`,
        });
      }
    }),
  })
  .superRefine((values, ctx) => {
    const hasEducationLevel = CONDICIONES_VACANTE_CHECKBOX_FIELDS.some(
      (fieldId) => values[fieldId]
    );

    if (!hasEducationLevel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona al menos un nivel educativo.",
        path: ["nivel_primaria"],
      });
    }
  });

export type CondicionesVacanteValues = z.infer<typeof condicionesVacanteSchema>;
export type CondicionesVacanteCompetencias =
  CondicionesVacanteValues["competencias"];
export type CondicionesVacanteDiscapacidadRow = z.infer<
  typeof condicionesVacanteDiscapacidadRowSchema
>;
export type CondicionesVacanteAsistente = z.infer<
  typeof condicionesVacanteAsistenteSchema
>;

export function countMeaningfulCondicionesVacanteDiscapacidades(
  rows: CondicionesVacanteValues["discapacidades"]
) {
  return rows.filter((row) => row.discapacidad.trim()).length;
}

export function countMeaningfulCondicionesVacanteAsistentes(
  rows: CondicionesVacanteValues["asistentes"]
) {
  return rows.filter((row) => {
    const normalized = normalizeAsistenteLike(row);
    return Boolean(normalized.nombre || normalized.cargo);
  }).length;
}

