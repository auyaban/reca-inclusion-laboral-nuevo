import { z } from "zod";
import { contratacionSchema } from "@/lib/validations/contratacion";
import { condicionesVacanteSchema } from "@/lib/validations/condicionesVacante";
import { presentacionSchema } from "@/lib/validations/presentacion";
import { seleccionSchema } from "@/lib/validations/seleccion";
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

export const contratacionFinalizeRequestSchema = z.object({
  empresa: empresaPayloadSchema,
  formData: contratacionSchema,
  finalization_identity: finalizationIdentitySchema,
});

export const seleccionFinalizeRequestSchema = z.object({
  empresa: empresaPayloadSchema,
  formData: seleccionSchema,
  finalization_identity: finalizationIdentitySchema,
});

export const condicionesVacanteFinalizeRequestSchema = z.object({
  empresa: empresaPayloadSchema,
  formData: condicionesVacanteSchema,
  finalization_identity: finalizationIdentitySchema,
});

export type EmpresaPayload = z.infer<typeof empresaPayloadSchema>;
export type PresentacionFinalizeRequest = z.infer<
  typeof presentacionFinalizeRequestSchema
>;
export type SensibilizacionFinalizeRequest = z.infer<
  typeof sensibilizacionFinalizeRequestSchema
>;
export type ContratacionFinalizeRequest = z.infer<
  typeof contratacionFinalizeRequestSchema
>;
export type SeleccionFinalizeRequest = z.infer<
  typeof seleccionFinalizeRequestSchema
>;
export type CondicionesVacanteFinalizeRequest = z.infer<
  typeof condicionesVacanteFinalizeRequestSchema
>;
