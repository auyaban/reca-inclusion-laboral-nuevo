import { z } from "zod";
import { presentacionSchema } from "@/lib/validations/presentacion";
import { sensibilizacionSchema } from "@/lib/validations/sensibilizacion";

export const empresaPayloadSchema = z.object({
  id: z.string(),
  nombre_empresa: z.string().trim().min(1, "La empresa es requerida"),
  nit_empresa: z.string().nullable().optional(),
  direccion_empresa: z.string().nullable().optional(),
  ciudad_empresa: z.string().nullable().optional(),
  sede_empresa: z.string().nullable().optional(),
  zona_empresa: z.string().nullable().optional(),
  correo_1: z.string().nullable().optional(),
  contacto_empresa: z.string().nullable().optional(),
  telefono_empresa: z.string().nullable().optional(),
  cargo: z.string().nullable().optional(),
  profesional_asignado: z.string().nullable().optional(),
  correo_profesional: z.string().nullable().optional(),
  asesor: z.string().nullable().optional(),
  correo_asesor: z.string().nullable().optional(),
  caja_compensacion: z.string().nullable().optional(),
});

export const finalizationIdentitySchema = z.object({
  draft_id: z.string().trim().min(1).optional(),
  local_draft_session_id: z
    .string()
    .trim()
    .min(1, "La sesión local del borrador es requerida"),
});

export const presentacionFinalizeRequestSchema = presentacionSchema.extend({
  empresa: empresaPayloadSchema,
  finalization_identity: finalizationIdentitySchema,
});

export const sensibilizacionFinalizeRequestSchema = sensibilizacionSchema.extend({
  empresa: empresaPayloadSchema,
  finalization_identity: finalizationIdentitySchema,
});

export type EmpresaPayload = z.infer<typeof empresaPayloadSchema>;
export type PresentacionFinalizeRequest = z.infer<
  typeof presentacionFinalizeRequestSchema
>;
export type SensibilizacionFinalizeRequest = z.infer<
  typeof sensibilizacionFinalizeRequestSchema
>;
