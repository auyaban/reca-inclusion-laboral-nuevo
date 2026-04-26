import { z } from "zod";
import {
  FAILED_VISIT_AUDIT_FIELD,
  failedVisitAuditFieldSchema,
} from "@/lib/failedVisitContract";
import { MODALIDAD_OPTIONS, modalidadRequiredSchema } from "@/lib/modalidad";
import {
  getMeaningfulAsistentes,
  normalizeAsistenteLike,
} from "@/lib/asistentes";
export { MODALIDAD_OPTIONS };

export const TEMAS_SENSIBILIZACION = [
  "Objetivo de la sensibilizacion y alcance general.",
  "Generalidades del concepto discapacidad.",
  "Tipos de discapacidad.",
  "Pautas de comunicacion e interaccion segun necesidad.",
  "Impacto en el clima laboral y recomendaciones de inclusion.",
] as const;

export const SENSIBILIZACION_MIN_SIGNIFICANT_ATTENDEES = 2;
export const SENSIBILIZACION_FAILED_VISIT_MIN_SIGNIFICANT_ATTENDEES = 1;

export const asistenteSchema = z.object({
  nombre: z.string(),
  cargo: z.string(),
});

export const sensibilizacionSchemaBase = z.object({
  [FAILED_VISIT_AUDIT_FIELD]: failedVisitAuditFieldSchema,
  fecha_visita: z.string().min(1, "La fecha es requerida"),
  modalidad: modalidadRequiredSchema,
  nit_empresa: z.string().trim().min(1, "El NIT es requerido"),
  observaciones: z
    .string()
    .trim()
    .min(1, "Las observaciones son requeridas"),
  asistentes: z.array(asistenteSchema),
});

function applySensibilizacionAttendeesValidation(
  values: z.infer<typeof sensibilizacionSchemaBase>,
  ctx: z.RefinementCtx
) {
  let meaningfulRows = 0;

  values.asistentes.forEach((asistente, index) => {
    const normalized = normalizeAsistenteLike(asistente);
    if (!normalized.nombre && !normalized.cargo) {
      return;
    }

    meaningfulRows += 1;

    if (!normalized.nombre) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre es requerido",
        path: ["asistentes", index, "nombre"],
      });
    }

    if (!normalized.cargo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El cargo es requerido",
        path: ["asistentes", index, "cargo"],
      });
    }
  });

  const requiredMeaningfulAttendees = values.failed_visit_applied_at
    ? SENSIBILIZACION_FAILED_VISIT_MIN_SIGNIFICANT_ATTENDEES
    : SENSIBILIZACION_MIN_SIGNIFICANT_ATTENDEES;

  if (meaningfulRows < requiredMeaningfulAttendees) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Agrega al menos ${requiredMeaningfulAttendees} asistentes significativos.`,
      path: ["asistentes"],
    });
  }
}

export const sensibilizacionSchema = sensibilizacionSchemaBase.superRefine(
  applySensibilizacionAttendeesValidation
);

export type SensibilizacionValues = z.infer<typeof sensibilizacionSchema>;

export function countMeaningfulSensibilizacionAsistentes(
  asistentes: SensibilizacionValues["asistentes"]
) {
  return getMeaningfulAsistentes(asistentes).length;
}
