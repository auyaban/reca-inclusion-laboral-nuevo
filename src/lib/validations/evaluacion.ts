import { z } from "zod";
import { normalizeAsistenteLike } from "@/lib/asistentes";
import {
  FAILED_VISIT_AUDIT_FIELD,
  failedVisitAuditFieldSchema,
} from "@/lib/failedVisitContract";
import {
  EVALUACION_COMPANY_FIELD_DESCRIPTORS,
  isEvaluacionFailedVisitOptionalPath,
  EVALUACION_MIN_SIGNIFICANT_ATTENDEES,
  EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION,
  isEvaluacionQuestionFieldOptional,
  EVALUACION_QUESTION_SECTION_IDS,
  EVALUACION_SECTION_4_DESCRIPTIONS,
  EVALUACION_SECTION_4_FIELD_DESCRIPTORS,
  EVALUACION_SECTION_4_OPTIONS,
  EVALUACION_SECTION_5_APLICA_OPTIONS,
  EVALUACION_SECTION_5_ITEMS,
  type EvaluacionQuestionFieldKey,
  type EvaluacionQuestionSectionId,
} from "@/lib/evaluacionSections";
import { calculateEvaluacionAccessibilitySummary } from "@/lib/evaluacionAccessibility";

export const EVALUACION_QUESTION_ANSWER_KEYS = [
  "accesible",
  "respuesta",
  "secundaria",
  "terciaria",
  "cuaternaria",
  "quinary",
  "observaciones",
  "detalle",
] as const satisfies readonly EvaluacionQuestionFieldKey[];

export type EvaluacionQuestionAnswer = Record<
  (typeof EVALUACION_QUESTION_ANSWER_KEYS)[number],
  string
>;

export type EvaluacionQuestionSectionValues = Record<
  string,
  EvaluacionQuestionAnswer
>;

export type EvaluacionSection4Values = {
  nivel_accesibilidad: string;
  descripcion: string;
  justificacion_nivel_accesibilidad: string;
};

export type EvaluacionSection5ItemValue = {
  aplica: string;
  nota: string;
  ajustes: string;
};

export type EvaluacionSection5Values = Record<string, EvaluacionSection5ItemValue>;

export const EVALUACION_FAILED_VISIT_MIN_SIGNIFICANT_ATTENDEES = 1;

export const evaluacionAsistenteSchema = z.object({
  nombre: z.string(),
  cargo: z.string(),
});

export type EvaluacionAsistente = z.infer<typeof evaluacionAsistenteSchema>;

export type EvaluacionValues = {
  failed_visit_applied_at: string | null;
  fecha_visita: string;
  nombre_empresa: string;
  direccion_empresa: string;
  correo_1: string;
  contacto_empresa: string;
  caja_compensacion: string;
  asesor: string;
  modalidad: string;
  ciudad_empresa: string;
  nit_empresa: string;
  telefono_empresa: string;
  cargo: string;
  sede_empresa: string;
  profesional_asignado: string;
  section_2_1: EvaluacionQuestionSectionValues;
  section_2_2: EvaluacionQuestionSectionValues;
  section_2_3: EvaluacionQuestionSectionValues;
  section_2_4: EvaluacionQuestionSectionValues;
  section_2_5: EvaluacionQuestionSectionValues;
  section_2_6: EvaluacionQuestionSectionValues;
  section_3: EvaluacionQuestionSectionValues;
  section_4: EvaluacionSection4Values;
  section_5: EvaluacionSection5Values;
  observaciones_generales: string;
  cargos_compatibles: string;
  asistentes: EvaluacionAsistente[];
};

const evaluacionQuestionAnswerSchema = z.object({
  accesible: z.string(),
  respuesta: z.string(),
  secundaria: z.string(),
  terciaria: z.string(),
  cuaternaria: z.string(),
  quinary: z.string(),
  observaciones: z.string(),
  detalle: z.string(),
});

const evaluacionSection4Schema = z.object({
  nivel_accesibilidad: z.string(),
  descripcion: z.string(),
  justificacion_nivel_accesibilidad: z.string(),
});

const evaluacionSection5ItemSchema = z.object({
  aplica: z.string(),
  nota: z.string(),
  ajustes: z.string(),
});

function buildCompanyShape() {
  const shape: Record<string, z.ZodString> = {};

  EVALUACION_COMPANY_FIELD_DESCRIPTORS.forEach((field) => {
    shape[field.id] = z.string();
  });

  return shape;
}

function buildQuestionSectionShape(sectionId: EvaluacionQuestionSectionId) {
  const shape: Record<string, typeof evaluacionQuestionAnswerSchema> = {};

  EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION[sectionId].forEach((question) => {
    shape[question.id] = evaluacionQuestionAnswerSchema;
  });

  return shape;
}

function buildSection5Shape() {
  const shape: Record<string, typeof evaluacionSection5ItemSchema> = {};

  EVALUACION_SECTION_5_ITEMS.forEach((item) => {
    shape[item.id] = evaluacionSection5ItemSchema;
  });

  return shape;
}

function isFilled(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function addRequiredIssue(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  message: string
) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message,
    path,
  });
}

function validateAllowedOption(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  value: string,
  options: readonly string[]
) {
  if (!value.trim() || options.length === 0) {
    return;
  }

  if (options.includes(value)) {
    return;
  }

  addRequiredIssue(ctx, path, "Selecciona una opción válida");
}

const evaluacionSchemaShape = {
  [FAILED_VISIT_AUDIT_FIELD]: failedVisitAuditFieldSchema,
  ...buildCompanyShape(),
  section_2_1: z.object(buildQuestionSectionShape("section_2_1")),
  section_2_2: z.object(buildQuestionSectionShape("section_2_2")),
  section_2_3: z.object(buildQuestionSectionShape("section_2_3")),
  section_2_4: z.object(buildQuestionSectionShape("section_2_4")),
  section_2_5: z.object(buildQuestionSectionShape("section_2_5")),
  section_2_6: z.object(buildQuestionSectionShape("section_2_6")),
  section_3: z.object(buildQuestionSectionShape("section_3")),
  section_4: evaluacionSection4Schema,
  section_5: z.object(buildSection5Shape()),
  observaciones_generales: z.string(),
  cargos_compatibles: z.string(),
  asistentes: z.array(evaluacionAsistenteSchema),
} satisfies Record<string, z.ZodTypeAny>;

function validateCompanyFields(values: EvaluacionValues, ctx: z.RefinementCtx) {
  EVALUACION_COMPANY_FIELD_DESCRIPTORS.forEach((field) => {
    if (field.readonly) {
      return;
    }

    const value = values[field.id as keyof typeof values];
    if (!isFilled(value)) {
      addRequiredIssue(ctx, [field.id], `${field.label} es requerido`);
      return;
    }

    if (field.options.length > 0) {
      validateAllowedOption(ctx, [field.id], String(value), field.options);
    }
  });
}

function validateQuestionSections(values: EvaluacionValues, ctx: z.RefinementCtx) {
  const failedVisitApplied = Boolean(values.failed_visit_applied_at);

  EVALUACION_QUESTION_SECTION_IDS.forEach((sectionId) => {
    const sectionValues = values[sectionId];
    const questionDescriptors =
      EVALUACION_QUESTION_DESCRIPTORS_BY_SECTION[sectionId];

    questionDescriptors.forEach((question) => {
      const answer = sectionValues[question.id];

      question.fields.forEach((field) => {
        const value = answer[field.key];
        const path = [sectionId, question.id, field.key] as const;
        const optionalInFailedVisit =
          failedVisitApplied &&
          isEvaluacionFailedVisitOptionalPath(path.join("."));

        if (!isFilled(value)) {
          if (
            isEvaluacionQuestionFieldOptional(field.key) ||
            optionalInFailedVisit
          ) {
            return;
          }

          addRequiredIssue(
            ctx,
            [...path],
            `${question.label} - ${field.label} es requerido`
          );
          return;
        }

        validateAllowedOption(ctx, [...path], value, field.options);
      });
    });
  });
}

function validateSection4(values: EvaluacionValues, ctx: z.RefinementCtx) {
  const failedVisitApplied = Boolean(values.failed_visit_applied_at);
  const section4Level = values.section_4.nivel_accesibilidad.trim();
  const section4Description = values.section_4.descripcion.trim();
  const section4Justification =
    values.section_4.justificacion_nivel_accesibilidad.trim();
  const suggestedLevel = calculateEvaluacionAccessibilitySummary(values).suggestion;

  if (!section4Level) {
    if (!failedVisitApplied) {
      addRequiredIssue(
        ctx,
        ["section_4", "nivel_accesibilidad"],
        `${EVALUACION_SECTION_4_FIELD_DESCRIPTORS[0]?.label ?? "Nivel"} es requerido`
      );
    }
  } else {
    validateAllowedOption(
      ctx,
      ["section_4", "nivel_accesibilidad"],
      section4Level,
      EVALUACION_SECTION_4_OPTIONS
    );
  }

  if (!section4Description) {
    if (failedVisitApplied && !section4Level) {
      addRequiredIssue(
        ctx,
        ["section_4", "descripcion"],
        "La descripcion es requerida en visita fallida"
      );
    } else {
      addRequiredIssue(
        ctx,
        ["section_4", "nivel_accesibilidad"],
        "Revisa el nivel de accesibilidad para regenerar la descripcion derivada"
      );
    }
  } else if (
    section4Level &&
    EVALUACION_SECTION_4_DESCRIPTIONS[
      section4Level as keyof typeof EVALUACION_SECTION_4_DESCRIPTIONS
    ] !== section4Description
  ) {
    addRequiredIssue(
      ctx,
      ["section_4", "nivel_accesibilidad"],
      "La descripcion derivada no coincide con el nivel seleccionado"
    );
  }

  if (
    section4Level &&
    suggestedLevel &&
    section4Level !== suggestedLevel &&
    !section4Justification
  ) {
    addRequiredIssue(
      ctx,
      ["section_4", "justificacion_nivel_accesibilidad"],
      "Justifica por que el nivel elegido difiere del nivel sugerido por el sistema"
    );
  }
}

function validateSection5(values: EvaluacionValues, ctx: z.RefinementCtx) {
  EVALUACION_SECTION_5_ITEMS.forEach((item) => {
    const itemValue = values.section_5[item.id];
    const applyPath = ["section_5", item.id, "aplica"] as const;

    if (!isFilled(itemValue.aplica)) {
      addRequiredIssue(ctx, [...applyPath], `${item.label} - Aplica es requerido`);
    } else {
      validateAllowedOption(
        ctx,
        [...applyPath],
        itemValue.aplica,
        EVALUACION_SECTION_5_APLICA_OPTIONS
      );
    }

    if (!isFilled(itemValue.nota)) {
      addRequiredIssue(
        ctx,
        ["section_5", item.id, "nota"],
        `${item.label} - La nota es requerida`
      );
    }

    if (!isFilled(itemValue.ajustes)) {
      addRequiredIssue(
        ctx,
        [...applyPath],
        `${item.label} - Revisa la seleccion para regenerar los ajustes`
      );
    } else {
      const expectedAjustes =
        itemValue.aplica === "Aplica"
          ? item.ajustes
          : itemValue.aplica === "No aplica"
            ? "No aplica"
            : "";

      if (expectedAjustes && itemValue.ajustes !== expectedAjustes) {
        addRequiredIssue(
          ctx,
          [...applyPath],
          "Los ajustes derivados no coinciden con la seleccion"
        );
      }
    }
  });
}

function validateNarratives(values: EvaluacionValues, ctx: z.RefinementCtx) {
  if (
    values.failed_visit_applied_at &&
    !values.observaciones_generales.trim()
  ) {
    addRequiredIssue(
      ctx,
      ["observaciones_generales"],
      "Las observaciones generales son requeridas en visita fallida"
    );
  }

  if (!values.cargos_compatibles.trim()) {
    addRequiredIssue(
      ctx,
      ["cargos_compatibles"],
      "Los cargos compatibles son requeridos"
    );
  }
}

function validateAttendees(values: EvaluacionValues, ctx: z.RefinementCtx) {
  const minimumMeaningfulRows = values.failed_visit_applied_at
    ? EVALUACION_FAILED_VISIT_MIN_SIGNIFICANT_ATTENDEES
    : EVALUACION_MIN_SIGNIFICANT_ATTENDEES;
  let meaningfulRows = 0;

  values.asistentes.forEach((row, index) => {
    const normalized = normalizeAsistenteLike(row);
    if (!normalized.nombre && !normalized.cargo) {
      return;
    }

    meaningfulRows += 1;

    if (!normalized.nombre) {
      addRequiredIssue(ctx, ["asistentes", index, "nombre"], "El nombre es requerido");
    }

    if (!normalized.cargo) {
      addRequiredIssue(ctx, ["asistentes", index, "cargo"], "El cargo es requerido");
    }
  });

  if (meaningfulRows < minimumMeaningfulRows) {
    const minimumAttendeesMessage = `Agrega al menos ${minimumMeaningfulRows} asistentes significativos.`;
    addRequiredIssue(ctx, ["asistentes", 0, "nombre"], minimumAttendeesMessage);
    addRequiredIssue(ctx, ["asistentes"], minimumAttendeesMessage);
  }
}

function validateEvaluacionValues(
  values: EvaluacionValues,
  ctx: z.RefinementCtx,
  options: {
    includeSection5: boolean;
  }
) {
  validateCompanyFields(values, ctx);
  validateQuestionSections(values, ctx);
  validateSection4(values, ctx);

  if (options.includeSection5) {
    validateSection5(values, ctx);
  }

  validateNarratives(values, ctx);
  validateAttendees(values, ctx);
}

function buildEvaluacionSchema(options: { includeSection5: boolean }) {
  return z
    .object(evaluacionSchemaShape)
    .superRefine((values, ctx) => {
      validateEvaluacionValues(values as EvaluacionValues, ctx, options);
    }) as unknown as z.ZodType<EvaluacionValues>;
}

export const evaluacionRuntimeSchema = buildEvaluacionSchema({
  includeSection5: false,
});

export const evaluacionSchema = buildEvaluacionSchema({
  includeSection5: true,
});

export function countMeaningfulEvaluacionAsistentes(
  asistentes: EvaluacionValues["asistentes"]
) {
  return asistentes.filter((row) => {
    const normalized = normalizeAsistenteLike(row);
    return Boolean(normalized.nombre || normalized.cargo);
  }).length;
}
