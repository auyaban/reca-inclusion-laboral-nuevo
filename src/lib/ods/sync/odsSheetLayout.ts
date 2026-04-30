// Port directo de `app/google_sheet_layouts.py` del legacy RECA_ODS.
// Define el layout (25 columnas) de la pestaña ODS_INPUT del spreadsheet
// mensual y los helpers de coerción que el legacy aplica antes de escribir.
//
// IMPORTANTE: el orden de los headers es ANCLA — los formularios y fórmulas
// del spreadsheet dependen del orden exacto. NO reordenar.

export const ODS_INPUT_HEADERS: readonly string[] = [
  "ID",
  "PROFESIONAL",
  "NUEVO CÓDIGO",
  "EMPRESA",
  "NIT",
  "CCF",
  "FECHA",
  "OFERENTES",
  "CEDULA",
  "TIPO DE DISCAPACIDAD",
  "FECHA INGRESO",
  "OBSERVACIONES",
  "MODALIDAD",
  "CLAUSULADA",
  "GENERO",
  "TIPO DE CONTRATO",
  "ASESOR",
  "SEDE",
  "OBSERVACION AGENCIA",
  "SEGUIMIENTO",
  "CARGO",
  "PERSONAS",
  "TOTAL HORAS",
  "MES",
  "AÑO",
] as const;

/** Aliases aceptados para detectar la pestaña "input" en el spreadsheet. */
export const INPUT_SHEET_ALIASES = new Set(["input", "ods_input"]);

/** Abreviaturas de mes en INGLÉS — alineado con el legacy. */
export const MONTH_ABBREVIATIONS: Record<number, string> = {
  1: "JAN",
  2: "FEB",
  3: "MAR",
  4: "APR",
  5: "MAY",
  6: "JUN",
  7: "JUL",
  8: "AUG",
  9: "SEP",
  10: "OCT",
  11: "NOV",
  12: "DEC",
};

/** Aliases del campo "año_servicio" (legacy lidió con varias codificaciones). */
const YEAR_FIELD_ALIASES = [
  "ano_servicio",
  "año_servicio",
] as const;

/**
 * Resuelve el nombre del spreadsheet mensual: "ODS_{MMM}_{YYYY}".
 * Lanza si el mes/año son inválidos. Port de resolve_monthly_spreadsheet_name.
 */
export function resolveMonthlySpreadsheetName(month: number, year: number): string {
  const m = Math.trunc(Number(month));
  const y = Math.trunc(Number(year));
  if (!MONTH_ABBREVIATIONS[m]) {
    throw new Error(`Mes invalido para sincronizacion: ${month}`);
  }
  if (y < 2000) {
    throw new Error(`Ano invalido para sincronizacion: ${year}`);
  }
  return `ODS_${MONTH_ABBREVIATIONS[m]}_${y}`;
}

/** Convierte cualquier valor a string seguro para celda de texto. */
export function toSheetText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

/** Convierte a número, o devuelve "" si no se puede. Para columnas numéricas. */
export function toSheetNumberOrBlank(value: unknown): number | "" {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return n;
}

/** Convierte boolean / "si"/"no"/"true"/"1" a "SI" o "NO" exacto del legacy. */
export function boolToSiNo(value: unknown): "SI" | "NO" {
  if (value === true) return "SI";
  if (value === false) return "NO";
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "t", "1", "si", "sí"].includes(text)) return "SI";
  return "NO";
}

/** Lee el campo año_servicio tolerando aliases. */
export function getYearValue(row: Record<string, unknown>): unknown {
  for (const key of YEAR_FIELD_ALIASES) {
    if (key in row) return row[key];
  }
  return null;
}

/**
 * Construye la fila de 25 valores en el orden exacto de ODS_INPUT_HEADERS.
 * Port literal de `ods_input_row_from_record` del legacy.
 */
export function odsInputRowFromRecord(
  row: Record<string, unknown>
): Array<string | number | ""> {
  return [
    toSheetText(row.id),
    toSheetText(row.nombre_profesional),
    toSheetText(row.codigo_servicio),
    toSheetText(row.nombre_empresa),
    toSheetText(row.nit_empresa),
    toSheetText(row.caja_compensacion),
    toSheetText(row.fecha_servicio),
    toSheetText(row.nombre_usuario),
    toSheetText(row.cedula_usuario),
    toSheetText(row.discapacidad_usuario),
    toSheetText(row.fecha_ingreso),
    toSheetText(row.observaciones),
    toSheetText(row.modalidad_servicio),
    boolToSiNo(row.orden_clausulada),
    toSheetText(row.genero_usuario),
    toSheetText(row.tipo_contrato),
    toSheetText(row.asesor_empresa),
    toSheetText(row.sede_empresa),
    toSheetText(row.observacion_agencia),
    toSheetText(row.seguimiento_servicio),
    toSheetText(row.cargo_servicio),
    Math.trunc(Number(row.total_personas) || 0),
    toSheetNumberOrBlank(row.horas_interprete),
    Math.trunc(Number(row.mes_servicio) || 0),
    Math.trunc(Number(getYearValue(row)) || 0),
  ];
}

/** Convierte indice 1-based a letra de columna A1 (1→A, 27→AA). */
export function columnLetter(index: number): string {
  if (index <= 0) return "";
  const letters: string[] = [];
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    letters.push(String.fromCharCode(65 + remainder));
    current = Math.floor((current - 1) / 26);
  }
  return letters.reverse().join("");
}

/** Normaliza headers para comparación case/space-insensitive. */
export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export const NORMALIZED_INPUT_HEADERS: readonly string[] = ODS_INPUT_HEADERS.map(
  (h) => normalizeHeader(h)
);
