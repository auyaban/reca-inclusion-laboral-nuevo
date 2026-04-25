import { z } from "zod";
import {
  FAILED_VISIT_AUDIT_FIELD,
  failedVisitAuditFieldSchema,
} from "@/lib/failedVisitContract";
import {
  ASESOR_AGENCIA_CARGO,
  normalizeAsistenteLike,
} from "@/lib/asistentes";
import { MODALIDAD_OPTIONS } from "@/lib/modalidad";

export const MOTIVACION_OPTIONS = [
  "Responsabilidad Social Empresarial",
  "Objetivos y metas para la diversidad, equidad e inclusión.",
  "Avances a nivel global de impacto en Colombia",
  "Beneficios Tributarios",
  "Beneficios en la contratación de población en riesgo de exclusión",
  "Ventaja en licitaciones públicas",
  "Cumplimiento de la normativa establecida por el Estado Colombiano.",
  "Experiencia en la vinculación de personas en condición de discapacidad.",
] as const;

export const asistenteSchema = z.object({
  nombre: z.string(),
  cargo: z.string(),
});

export const PRESENTACION_MIN_SIGNIFICANT_ATTENDEES = 2;
export const PRESENTACION_FAILED_VISIT_MIN_SIGNIFICANT_ATTENDEES = 1;

function isOptionalAgencyAdvisorRow(
  asistentes: Array<z.infer<typeof asistenteSchema>>,
  index: number,
  failedVisitAppliedAt: string | null
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

export function countMeaningfulPresentacionAsistentes(
  asistentes: Array<z.infer<typeof asistenteSchema>>,
  failedVisitAppliedAt: string | null
) {
  return asistentes.reduce((count, asistente, index) => {
    if (isOptionalAgencyAdvisorRow(asistentes, index, failedVisitAppliedAt)) {
      return count;
    }

    const normalized = normalizeAsistenteLike(asistente);
    return normalized.nombre || normalized.cargo ? count + 1 : count;
  }, 0);
}

export const presentacionSchemaBase = z.object({
  [FAILED_VISIT_AUDIT_FIELD]: failedVisitAuditFieldSchema,
  tipo_visita: z.enum(["Presentación", "Reactivación"], {
    required_error: "Selecciona el tipo de visita",
  }),
  fecha_visita: z.string().min(1, "La fecha es requerida"),
  modalidad: z.enum(MODALIDAD_OPTIONS, {
    required_error: "Selecciona la modalidad",
  }),
  nit_empresa: z.string().min(1, "El NIT es requerido"),
  motivacion: z
    .array(z.string())
    .min(1, "Selecciona al menos una motivación"),
  acuerdos_observaciones: z
    .string()
    .min(1, "Los acuerdos y observaciones son requeridos"),
  asistentes: z.array(asistenteSchema),
});

function applyPresentacionAttendeesValidation(
  values: z.infer<typeof presentacionSchemaBase>,
  ctx: z.RefinementCtx
) {
  const failedVisitAppliedAt = values.failed_visit_applied_at;
  const requiredMeaningfulAttendees = failedVisitAppliedAt
    ? PRESENTACION_FAILED_VISIT_MIN_SIGNIFICANT_ATTENDEES
    : PRESENTACION_MIN_SIGNIFICANT_ATTENDEES;

  values.asistentes.forEach((asistente, index) => {
    if (
      isOptionalAgencyAdvisorRow(values.asistentes, index, failedVisitAppliedAt)
    ) {
      return;
    }

    const normalized = normalizeAsistenteLike(asistente);
    if (!normalized.nombre && !normalized.cargo) {
      return;
    }

    if (!normalized.nombre) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre es requerido",
        path: ["asistentes", index, "nombre"],
      });
    }
  });

  if (
    countMeaningfulPresentacionAsistentes(
      values.asistentes,
      failedVisitAppliedAt
    ) < requiredMeaningfulAttendees
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Agrega al menos ${requiredMeaningfulAttendees} asistentes significativos.`,
      path: ["asistentes"],
    });
  }
}

export const presentacionSchema = presentacionSchemaBase.superRefine(
  applyPresentacionAttendeesValidation
);

export type PresentacionValues = z.infer<typeof presentacionSchema>;

export const STEP_FIELDS: Record<number, (keyof PresentacionValues)[]> = {
  0: ["tipo_visita", "fecha_visita", "modalidad", "nit_empresa"],
  1: ["motivacion"],
  2: ["acuerdos_observaciones"],
  3: ["asistentes"],
};
