export const MODALIDAD_OPTIONS = [
  "Presencial",
  "Virtual",
  "Mixta",
  "No aplica",
] as const;

export type ModalidadValue = (typeof MODALIDAD_OPTIONS)[number];

const MODALIDAD_SET = new Set<string>(MODALIDAD_OPTIONS);
const MODALIDAD_ALIASES: Record<string, ModalidadValue> = {
  Mixto: "Mixta",
};

export function normalizeModalidad(
  value: unknown,
  fallback: ModalidadValue
): ModalidadValue {
  if (typeof value !== "string") {
    return fallback;
  }

  if (MODALIDAD_SET.has(value)) {
    return value as ModalidadValue;
  }

  return MODALIDAD_ALIASES[value] ?? fallback;
}
