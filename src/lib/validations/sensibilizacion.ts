import { z } from "zod";

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

export const asistenteSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es requerido"),
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
    .min(1, "Agrega al menos un asistente"),
});

export type SensibilizacionValues = z.infer<typeof sensibilizacionSchema>;

export const STEP_FIELDS: Record<number, (keyof SensibilizacionValues)[]> = {
  0: ["fecha_visita", "modalidad", "nit_empresa"],
  1: [],
  2: ["observaciones"],
  3: [],
  4: ["asistentes"],
};
