import { z } from "zod";
import { DISCAPACIDADES, GENEROS, TIPOS_CONTRATO } from "./catalogs";

// --- UsuarioNuevo ---

export const usuarioNuevoSchema = z.object({
  cedula_usuario: z.string().trim().regex(/^[0-9]+$/, "Cédula solo dígitos"),
  nombre_usuario: z.string().trim().min(1, "El nombre es obligatorio"),
  discapacidad_usuario: z.enum(DISCAPACIDADES, { errorMap: () => ({ message: "Discapacidad inválida" }) }),
  genero_usuario: z.enum(GENEROS, { errorMap: () => ({ message: "Género inválido" }) }),
  fecha_ingreso: z.string().date().optional(),
  tipo_contrato: z.enum(TIPOS_CONTRATO).optional(),
  cargo_servicio: z.string().optional(),
});

export type UsuarioNuevo = z.infer<typeof usuarioNuevoSchema>;

// --- OdsPayload ---

const odsPayloadBaseSchema = z.object({
  orden_clausulada: z.enum(["si", "no"], {
    errorMap: () => ({ message: "Debe ser 'si' o 'no'" }),
  }),
  nombre_profesional: z.string().trim().min(1, "El profesional es obligatorio"),
  nit_empresa: z.string().trim().min(1, "El NIT es obligatorio"),
  nombre_empresa: z.string().trim().min(1, "La empresa es obligatoria"),
  caja_compensacion: z.string().optional(),
  asesor_empresa: z.string().optional(),
  sede_empresa: z.string().optional(),
  fecha_servicio: z.string().date("Fecha de servicio inválida"),
  codigo_servicio: z.string().trim().min(1, "El código de servicio es obligatorio"),
  referencia_servicio: z.string().trim().min(1, "La referencia es obligatoria"),
  descripcion_servicio: z.string().trim().min(1, "La descripción es obligatoria"),
  modalidad_servicio: z.enum(["Virtual", "Bogotá", "Fuera de Bogotá", "Todas las modalidades"], {
    errorMap: () => ({ message: "Modalidad inválida" }),
  }),
  valor_virtual: z.number().default(0),
  valor_bogota: z.number().default(0),
  valor_otro: z.number().default(0),
  todas_modalidades: z.number().default(0),
  horas_interprete: z.number().optional(),
  valor_interprete: z.number().default(0),
  valor_total: z.number(),
  nombre_usuario: z.string().optional(),
  cedula_usuario: z.string().optional(),
  discapacidad_usuario: z.string().optional(),
  genero_usuario: z.string().optional(),
  fecha_ingreso: z.string().optional(),
  tipo_contrato: z.string().optional(),
  cargo_servicio: z.string().optional(),
  total_personas: z.number().int().min(0).default(0),
  observaciones: z.string().optional(),
  observacion_agencia: z.string().optional(),
  seguimiento_servicio: z.string().optional(),
  mes_servicio: z.number().int().min(1).max(12, "Mes debe estar entre 1 y 12"),
  ano_servicio: z.number().int(),
  formato_finalizado_id: z.string().uuid("ID de formato finalizado inválido").optional(),
  session_id: z.string().uuid("Session ID inválido").optional(),
  started_at: z.string().datetime().optional(),
  submitted_at: z.string().datetime().optional(),
});

export const odsPayloadSchema = odsPayloadBaseSchema
  .refine(
    (data) => {
      const sumaModalidades = data.valor_virtual + data.valor_bogota + data.valor_otro + data.todas_modalidades;
      const expected = data.valor_interprete > 0 ? data.valor_interprete : sumaModalidades;
      return Math.abs(data.valor_total - expected) <= 0.01;
    },
    {
      message:
        "valor_total debe ser igual a valor_interprete si hay interpretacion, o a la suma de modalidades si no",
      path: ["valor_total"],
    }
  )
  .refine(
    (data) => {
      if (data.started_at && data.submitted_at) {
        return new Date(data.submitted_at) >= new Date(data.started_at);
      }
      return true;
    },
    {
      message: "submitted_at debe ser posterior o igual a started_at",
      path: ["submitted_at"],
    }
  );

export { odsPayloadBaseSchema };

export type OdsPayload = z.infer<typeof odsPayloadSchema>;

// --- TerminarServicioRequest ---

export const terminarServicioRequestSchema = z.object({
  ods: odsPayloadSchema,
  usuarios_nuevos: z.array(usuarioNuevoSchema).default([]),
});

export type TerminarServicioRequest = z.infer<typeof terminarServicioRequestSchema>;

// --- ImportarResult ---

export const importResolutionSchema = z.object({
  strategy: z.enum(["finalized_record", "parser"]),
  reason: z.enum([
    "acta_ref_lookup",
    "payload_normalized",
    "no_acta_ref",
    "acta_ref_lookup_failed",
    "acta_ref_invalid_payload",
    "acta_ref_not_found",
    "direct_parser",
  ]),
  acta_ref: z.string(),
});

export const importWarningSchema = z.object({
  message: z.string(),
  severity: z.enum(["info", "warning", "error"]).default("warning"),
});

export const importParticipantSchema = z.object({
  cedula_usuario: z.string(),
  nombre_usuario: z.string(),
  discapacidad_usuario: z.string(),
  genero_usuario: z.string(),
  exists: z.boolean(),
});

export const importarResultSchema = z.object({
  success: z.boolean(),
  resolution: importResolutionSchema.optional(),
  empresa: z
    .object({
      nit_empresa: z.string(),
      nombre_empresa: z.string(),
      caja_compensacion: z.string().optional(),
      asesor_empresa: z.string().optional(),
      sede_empresa: z.string().optional(),
    })
    .optional(),
  profesional: z
    .object({
      nombre_profesional: z.string(),
      is_interpreter: z.boolean(),
    })
    .optional(),
  servicio: z
    .object({
      fecha_servicio: z.string().date().optional(),
      codigo_servicio: z.string().optional(),
      modalidad_servicio: z.string().optional(),
      interpreter_hours: z.number().optional(),
    })
    .optional(),
  participants: z.array(importParticipantSchema).default([]),
  observaciones: z.string().optional(),
  observacion_agencia: z.string().optional(),
  seguimiento_servicio: z.string().optional(),
  warnings: z.array(importWarningSchema).default([]),
  userFacingMessage: z.string().optional(),
});

export type ImportResolution = z.infer<typeof importResolutionSchema>;
export type ImportWarning = z.infer<typeof importWarningSchema>;
export type ImportParticipant = z.infer<typeof importParticipantSchema>;
export type ImportarResult = z.infer<typeof importarResultSchema>;
