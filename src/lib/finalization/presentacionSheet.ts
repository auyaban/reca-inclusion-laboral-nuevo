import { normalizePresentacionTipoVisita } from "@/lib/presentacion";

export const PRESENTACION_PREWARM_VARIANTS = [
  "presentacion",
  "reactivacion",
] as const;

export type PresentacionPrewarmVariant =
  (typeof PRESENTACION_PREWARM_VARIANTS)[number];

export const PRESENTACION_SHEET_NAME = "1. PRESENTACIÓN DEL PROGRAMA IL";
export const REACTIVACION_SHEET_NAME =
  "1.2 REACTIVACIÓN DEL PROGRAMA IL";
export const PRESENTACION_ACUERDOS_CELL = "A71";
export const PRESENTACION_ATTENDEES_START_ROW = 75;
export const PRESENTACION_ATTENDEES_BASE_ROWS = 3;
export const PRESENTACION_ATTENDEES_NAME_COL = "C";
export const PRESENTACION_ATTENDEES_CARGO_COL = "N";
export const PRESENTACION_MOTIVACION_CELLS = [
  "U60",
  "U61",
  "U62",
  "U63",
  "U64",
  "U65",
  "U66",
  "U67",
] as const;

const REACTIVACION_TIPO_VISITA = normalizePresentacionTipoVisita("Reactivación");

export function getPresentacionPrewarmVariant(
  tipoVisita: unknown
): PresentacionPrewarmVariant {
  return normalizePresentacionTipoVisita(tipoVisita) === REACTIVACION_TIPO_VISITA
    ? "reactivacion"
    : "presentacion";
}

export function normalizePresentacionPrewarmVariant(
  value: unknown
): PresentacionPrewarmVariant {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "presentacion") {
      return "presentacion";
    }

    if (normalized === "reactivacion") {
      return "reactivacion";
    }
  }

  return getPresentacionPrewarmVariant(value);
}

export function getPresentacionSheetNameForVariant(
  variant: PresentacionPrewarmVariant
) {
  return variant === "reactivacion"
    ? REACTIVACION_SHEET_NAME
    : PRESENTACION_SHEET_NAME;
}

export function getPresentacionSheetName(tipoVisita: unknown) {
  return getPresentacionSheetNameForVariant(
    getPresentacionPrewarmVariant(tipoVisita)
  );
}
