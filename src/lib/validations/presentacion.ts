import { z } from "zod";
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
  nombre: z.string().min(1, "El nombre es requerido"),
  cargo: z.string(),
});

export const presentacionSchema = z.object({
  // Sección 1 — Datos generales
  tipo_visita: z.enum(["Presentación", "Reactivación"], {
    required_error: "Selecciona el tipo de visita",
  }),
  fecha_visita: z.string().min(1, "La fecha es requerida"),
  modalidad: z.enum(MODALIDAD_OPTIONS, {
    required_error: "Selecciona la modalidad",
  }),
  nit_empresa: z.string().min(1, "El NIT es requerido"),

  // Sección 2 — Motivación empresarial (al menos 1)
  motivacion: z
    .array(z.string())
    .min(1, "Selecciona al menos una motivación"),

  // Sección 3 — Acuerdos y observaciones
  acuerdos_observaciones: z
    .string()
    .min(1, "Los acuerdos y observaciones son requeridos"),

  // Sección 4 — Asistentes (al menos 1)
  asistentes: z
    .array(asistenteSchema)
    .min(1, "Agrega al menos un asistente"),
});

export type PresentacionValues = z.infer<typeof presentacionSchema>;

// Campos que se validan en cada paso del wizard
export const STEP_FIELDS: Record<number, (keyof PresentacionValues)[]> = {
  0: ["tipo_visita", "fecha_visita", "modalidad", "nit_empresa"],
  1: ["motivacion"],
  2: ["acuerdos_observaciones"],
  3: ["asistentes"],
};
