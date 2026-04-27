import { z } from "zod";

export const MODALIDAD_OPTIONS = [
  "Presencial",
  "Virtual",
  "Mixta",
  "No aplica",
] as const;

export type ModalidadValue = (typeof MODALIDAD_OPTIONS)[number];
export type ModalidadFormValue = ModalidadValue | "";

const MODALIDAD_SET = new Set<string>(MODALIDAD_OPTIONS);
const MODALIDAD_ALIASES: Record<string, ModalidadValue> = {
  Mixto: "Mixta",
};

export const modalidadRequiredSchema = z
  .string({
    required_error: "Selecciona la modalidad",
    invalid_type_error: "Selecciona la modalidad",
  })
  .trim()
  .min(1, "Selecciona la modalidad")
  .refine((value) => MODALIDAD_SET.has(value), {
    message: "Selecciona una modalidad valida",
  }) as z.ZodType<ModalidadFormValue>;

export function normalizeModalidad(
  value: unknown,
  fallback: ModalidadValue
): ModalidadValue;
export function normalizeModalidad(
  value: unknown,
  fallback?: ModalidadFormValue
): ModalidadFormValue;
export function normalizeModalidad(value: unknown, fallback: string): string;
export function normalizeModalidad(
  value: unknown,
  fallback: string = ""
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  if (MODALIDAD_SET.has(value)) {
    return value as ModalidadValue;
  }

  return MODALIDAD_ALIASES[value] ?? fallback;
}
