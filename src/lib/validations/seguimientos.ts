import { z } from "zod";
import {
  SEGUIMIENTOS_BASE_STAGE_ID,
  SEGUIMIENTOS_COMPANY_TYPE_OPTIONS,
  SEGUIMIENTOS_DEFAULT_VISIBLE_ATTENDEES,
  SEGUIMIENTOS_EVAL_OPTIONS,
  SEGUIMIENTOS_FUNCTION_ITEMS_PER_COLUMN,
  SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT,
  SEGUIMIENTOS_FOLLOWUP_INDEXES,
  SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT,
  SEGUIMIENTOS_MAX_ATTENDEES,
  SEGUIMIENTOS_TIPO_APOYO_OPTIONS,
  SEGUIMIENTOS_TIMELINE_BLOCK_SIZE,
  buildSeguimientosFollowupStageId,
  type SeguimientosModalidadValue,
} from "@/lib/seguimientos";
import {
  normalizeSeguimientosDateInput,
} from "@/lib/seguimientosDates";
import { MODALIDAD_OPTIONS } from "@/lib/modalidad";

function buildFixedStringArray(length: number) {
  return z.array(z.string()).length(length);
}

function dateLikeField() {
  return z.string().transform((value, ctx) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    const normalized = normalizeSeguimientosDateInput(trimmed);
    if (normalized) {
      return normalized;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Usa una fecha valida.",
    });
    return z.NEVER;
  });
}

const editableStageIdSchema = z.union([
  z.literal(SEGUIMIENTOS_BASE_STAGE_ID),
  z.literal(buildSeguimientosFollowupStageId(1)),
  z.literal(buildSeguimientosFollowupStageId(2)),
  z.literal(buildSeguimientosFollowupStageId(3)),
  z.literal(buildSeguimientosFollowupStageId(4)),
  z.literal(buildSeguimientosFollowupStageId(5)),
  z.literal(buildSeguimientosFollowupStageId(6)),
]);

const overrideGrantSchema = z.object({
  stageId: editableStageIdSchema,
  token: z.string().trim().min(1, "Falta el token del override."),
});

export const seguimientosBaseStageSchema = z.object({
  fecha_visita: dateLikeField(),
  modalidad: z.custom<SeguimientosModalidadValue>(
    (value) => value === "" || MODALIDAD_OPTIONS.includes(value as never),
    {
      message: "Selecciona una modalidad valida.",
    }
  ),
  nombre_empresa: z.string(),
  ciudad_empresa: z.string(),
  direccion_empresa: z.string(),
  nit_empresa: z.string(),
  correo_1: z.string(),
  telefono_empresa: z.string(),
  contacto_empresa: z.string(),
  cargo: z.string(),
  asesor: z.string(),
  sede_empresa: z.string(),
  caja_compensacion: z.string(),
  profesional_asignado: z.string(),
  nombre_vinculado: z.string(),
  cedula: z.string(),
  telefono_vinculado: z.string(),
  correo_vinculado: z.string(),
  contacto_emergencia: z.string(),
  parentesco: z.string(),
  telefono_emergencia: z.string(),
  cargo_vinculado: z.string(),
  certificado_discapacidad: z.string(),
  certificado_porcentaje: z.string(),
  discapacidad: z.string(),
  tipo_contrato: z.string(),
  fecha_inicio_contrato: dateLikeField(),
  fecha_fin_contrato: dateLikeField(),
  fecha_firma_contrato: dateLikeField(),
  apoyos_ajustes: z.string(),
  funciones_1_5: buildFixedStringArray(SEGUIMIENTOS_FUNCTION_ITEMS_PER_COLUMN),
  funciones_6_10: buildFixedStringArray(SEGUIMIENTOS_FUNCTION_ITEMS_PER_COLUMN),
  seguimiento_fechas_1_3: buildFixedStringArray(SEGUIMIENTOS_TIMELINE_BLOCK_SIZE),
  seguimiento_fechas_4_6: buildFixedStringArray(SEGUIMIENTOS_TIMELINE_BLOCK_SIZE),
});

export const seguimientosBaseStageSaveSchema = z.object({
  activeStageId: z.literal(SEGUIMIENTOS_BASE_STAGE_ID),
  baseValues: seguimientosBaseStageSchema,
  overrideGrant: overrideGrantSchema.optional(),
  expectedCaseUpdatedAt: z.string().trim().nullable().optional(),
});

export type SeguimientosBaseStageValues = z.infer<
  typeof seguimientosBaseStageSchema
>;

function buildFollowupStageSchema() {
  return z.object({
    modalidad: z.custom<SeguimientosModalidadValue>(
      (value) => value === "" || MODALIDAD_OPTIONS.includes(value as never),
      {
        message: "Selecciona una modalidad valida.",
      }
    ),
    seguimiento_numero: z.string(),
    fecha_seguimiento: dateLikeField(),
    item_labels: buildFixedStringArray(SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT),
    item_observaciones: buildFixedStringArray(SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT),
    item_autoevaluacion: z
      .array(
        z.custom<string>(
          (value) => value === "" || SEGUIMIENTOS_EVAL_OPTIONS.includes(value as never),
          {
            message: "Selecciona una evaluacion valida.",
          }
        )
      )
      .length(SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT),
    item_eval_empresa: z
      .array(
        z.custom<string>(
          (value) => value === "" || SEGUIMIENTOS_EVAL_OPTIONS.includes(value as never),
          {
            message: "Selecciona una evaluacion valida.",
          }
        )
      )
      .length(SEGUIMIENTOS_FOLLOWUP_ITEM_COUNT),
    tipo_apoyo: z.custom<string>(
      (value) =>
        value === "" || SEGUIMIENTOS_TIPO_APOYO_OPTIONS.includes(value as never),
      {
        message: "Selecciona un tipo de apoyo valido.",
      }
    ),
    empresa_item_labels: buildFixedStringArray(SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT),
    empresa_eval: z
      .array(
        z.custom<string>(
          (value) => value === "" || SEGUIMIENTOS_EVAL_OPTIONS.includes(value as never),
          {
            message: "Selecciona una evaluacion valida.",
          }
        )
      )
      .length(SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT),
    empresa_observacion: buildFixedStringArray(
      SEGUIMIENTOS_FOLLOWUP_COMPANY_ITEM_COUNT
    ),
    situacion_encontrada: z.string(),
    estrategias_ajustes: z.string(),
    asistentes: z
      .array(
        z.object({
          nombre: z.string(),
          cargo: z.string(),
        })
      )
      .min(
        1,
        `Registra al menos ${1} asistente para continuar.`
      )
      .max(
        SEGUIMIENTOS_MAX_ATTENDEES,
        `El seguimiento admite hasta ${SEGUIMIENTOS_MAX_ATTENDEES} asistentes.`
      )
      .transform((asistentes) => {
        const normalized = asistentes.map((asistente) => ({
          nombre: asistente.nombre.trim(),
          cargo: asistente.cargo.trim(),
        }));

        while (normalized.length < SEGUIMIENTOS_DEFAULT_VISIBLE_ATTENDEES) {
          normalized.push({ nombre: "", cargo: "" });
        }

        return normalized;
      }),
  });
}

export const seguimientosFollowupStageSchema = buildFollowupStageSchema();

const seguimientosFollowupsByIndexSchema = z
  .object(
    Object.fromEntries(
      SEGUIMIENTOS_FOLLOWUP_INDEXES.map((index) => [
        String(index),
        seguimientosFollowupStageSchema.optional(),
      ])
    ) as Record<string, z.ZodOptional<typeof seguimientosFollowupStageSchema>>
  )
  .partial();

export const seguimientosStagesSaveSchema = z.object({
  activeStageId: editableStageIdSchema,
  companyType: z.enum(SEGUIMIENTOS_COMPANY_TYPE_OPTIONS),
  baseValues: seguimientosBaseStageSchema,
  followupValuesByIndex: seguimientosFollowupsByIndexSchema,
  dirtyStageIds: z
    .array(editableStageIdSchema)
    .min(1, "No hay cambios pendientes para guardar."),
  overrideGrants: z.array(overrideGrantSchema).default([]),
  expectedCaseUpdatedAt: z.string().trim().nullable().optional(),
});

export const seguimientosPdfExportSchema = z.object({
  optionId: z
    .string()
    .trim()
    .regex(
      /^(base_only|base_plus_followup_[1-6](?:_plus_final)?)$/,
      "Selecciona una variante valida de PDF."
    ),
});

export const seguimientosStageOverrideSchema = z.object({
  stageIds: z
    .array(editableStageIdSchema)
    .min(1, "Selecciona al menos una etapa para desbloquear."),
});

export type SeguimientosFollowupStageValues = z.infer<
  typeof seguimientosFollowupStageSchema
>;

export type SeguimientosStagesSaveValues = z.infer<
  typeof seguimientosStagesSaveSchema
>;

export type SeguimientosPdfExportValues = z.infer<
  typeof seguimientosPdfExportSchema
>;

export type SeguimientosStageOverrideValues = z.infer<
  typeof seguimientosStageOverrideSchema
>;
