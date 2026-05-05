export const DISCAPACIDADES = [
  "Intelectual",
  "Múltiple",
  "Física",
  "Visual",
  "Auditiva",
  "Hipoacusia",
  "Psicosocial",
  "N/A",
] as const;

export type Discapacidad = (typeof DISCAPACIDADES)[number];

export const GENEROS = ["Hombre", "Mujer", "Otro"] as const;

export type Genero = (typeof GENEROS)[number];

export const TIPOS_CONTRATO = [
  "Laboral",
  "Contrato Aprendiz Especial",
  "Orientación Laboral",
] as const;

export type TipoContrato = (typeof TIPOS_CONTRATO)[number];
