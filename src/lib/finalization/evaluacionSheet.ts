import type { CellWrite, FormSheetMutation } from "@/lib/google/sheets";
import { EVALUACION_FIELD_REGISTRY } from "@/lib/evaluacionSections";
import type { FinalizationSection1Data } from "@/lib/finalization/routeHelpers";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";

export const EVALUACION_SHEET_NAME = "2. EVALUACIÓN DE ACCESIBILIDAD";
export const EVALUACION_SECTION_8_START_ROW = 212;
export const EVALUACION_SECTION_8_BASE_ROWS = 2;
export const EVALUACION_SECTION_8_NAME_COL = "C";
export const EVALUACION_SECTION_8_CARGO_COL = "O";

function cellRef(cell: string) {
  return `'${EVALUACION_SHEET_NAME}'!${cell}`;
}

function getValueAtPath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

function toSheetValue(value: unknown) {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  return typeof value === "string" ? value : String(value ?? "");
}

function buildRegistryWrites(formData: EvaluacionValues) {
  return EVALUACION_FIELD_REGISTRY.filter(
    (entry) =>
      Boolean(entry.sheetCell) &&
      !entry.path.startsWith("asistentes[].") &&
      entry.classification !== "auxiliary_sheet" &&
      entry.classification !== "deferred_blocker"
  ).map((entry): CellWrite => {
    const valueAtPath = getValueAtPath(formData, entry.path);

    if (valueAtPath === undefined) {
      console.warn("[evaluacion.sheet_registry_missing_value]", {
        path: entry.path,
        sheetCell: entry.sheetCell,
      });
    }

    return {
      range: cellRef(entry.sheetCell!),
      value: toSheetValue(valueAtPath),
    };
  });
}

export function buildEvaluacionSheetMutation({
  section1Data,
  formData,
  asistentes,
}: {
  section1Data: FinalizationSection1Data;
  formData: EvaluacionValues;
  asistentes: Array<{ nombre: string; cargo: string }>;
}): FormSheetMutation {
  const formDataWithSection1 = {
    ...formData,
    ...section1Data,
  };
  const writes = buildRegistryWrites(formDataWithSection1);

  asistentes.forEach((asistente, index) => {
    const row = EVALUACION_SECTION_8_START_ROW + index;
    writes.push({
      range: cellRef(`${EVALUACION_SECTION_8_NAME_COL}${row}`),
      value: asistente.nombre,
    });
    writes.push({
      range: cellRef(`${EVALUACION_SECTION_8_CARGO_COL}${row}`),
      value: asistente.cargo,
    });
  });

  return {
    writes,
    rowInsertions:
      asistentes.length > EVALUACION_SECTION_8_BASE_ROWS
        ? [
            {
              sheetName: EVALUACION_SHEET_NAME,
              insertAtRow:
                EVALUACION_SECTION_8_START_ROW +
                EVALUACION_SECTION_8_BASE_ROWS -
                1,
              count: asistentes.length - EVALUACION_SECTION_8_BASE_ROWS,
              templateRow:
                EVALUACION_SECTION_8_START_ROW +
                EVALUACION_SECTION_8_BASE_ROWS -
                1,
            },
          ]
        : [],
  };
}
