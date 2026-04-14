import { z } from "zod";
import {
  getMeaningfulAsistentes,
  normalizeAsistenteLike,
} from "@/lib/asistentes";

export const MODALIDAD_OPTIONS = [
  "Presencial",
  "Virtual",
  "Mixta",
  "No aplica",
] as const;

export const TEMAS_SENSIBILIZACION = [
  "Objetivo de la sensibilizacion y alcance general.",
  "Generalidades del concepto discapacidad.",
  "Tipos de discapacidad.",
  "Pautas de comunicacion e interaccion segun necesidad.",
  "Impacto en el clima laboral y recomendaciones de inclusion.",
] as const;

export const SENSIBILIZACION_MIN_SIGNIFICANT_ATTENDEES = 2;

export const asistenteSchema = z.object({
  nombre: z.string(),
  cargo: z.string(),
});

export const sensibilizacionSchema = z.object({
  fecha_visita: z.string().min(1, "La fecha es requerida"),
  modalidad: z.enum(MODALIDAD_OPTIONS, {
    required_error: "Selecciona la modalidad",
  }),
  nit_empresa: z.string().trim().min(1, "El NIT es requerido"),
  observaciones: z
    .string()
    .trim()
    .min(1, "Las observaciones son requeridas"),
  asistentes: z
    .array(asistenteSchema)
    .superRefine((asistentes, ctx) => {
      let meaningfulRows = 0;

      asistentes.forEach((asistente, index) => {
        const normalized = normalizeAsistenteLike(asistente);
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

      if (meaningfulRows < SENSIBILIZACION_MIN_SIGNIFICANT_ATTENDEES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Agrega al menos ${SENSIBILIZACION_MIN_SIGNIFICANT_ATTENDEES} asistentes significativos.`,
        });
      }
    }),
});

export type SensibilizacionValues = z.infer<typeof sensibilizacionSchema>;

export function countMeaningfulSensibilizacionAsistentes(
  asistentes: SensibilizacionValues["asistentes"]
) {
  return getMeaningfulAsistentes(asistentes).length;
}
