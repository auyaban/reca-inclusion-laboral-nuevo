import { getMeaningfulAsistentes } from "@/lib/asistentes";
import { normalizePresentacionTipoVisita } from "@/lib/presentacion";
import type { FinalizationFormSlug } from "@/lib/finalization/formSlugs";
import type { FormSheetMutation } from "@/lib/google/sheets";
import {
  CONDICIONES_VACANTE_SECTION_6_BASE_ROWS,
  CONDICIONES_VACANTE_SECTION_6_START_ROW,
  CONDICIONES_VACANTE_SECTION_8_BASE_ROWS,
  CONDICIONES_VACANTE_SECTION_8_START_BASE_ROW,
  CONDICIONES_VACANTE_SHEET_NAME,
} from "@/lib/finalization/condicionesVacanteSheet";
import {
  CONTRATACION_SECTION_7_BASE_ROWS,
  CONTRATACION_SECTION_7_BASE_START_ROW,
  CONTRATACION_SHEET_NAME,
  CONTRATACION_VINCULADO_BLOCK_HEIGHT,
  CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW,
  CONTRATACION_VINCULADO_SECOND_BLOCK_INSERT_INDEX,
} from "@/lib/finalization/contratacionSheet";
import {
  EVALUACION_SECTION_8_BASE_ROWS,
  EVALUACION_SECTION_8_START_ROW,
  EVALUACION_SHEET_NAME,
} from "@/lib/finalization/evaluacionSheet";
import {
  INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS,
  INDUCCION_OPERATIVA_SECTION_9_BASE_START_ROW,
  INDUCCION_OPERATIVA_SHEET_NAME,
} from "@/lib/finalization/induccionOperativaSheet";
import {
  INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS,
  INDUCCION_ORGANIZACIONAL_SECTION_6_START_ROW,
  INDUCCION_ORGANIZACIONAL_SHEET_NAME,
} from "@/lib/finalization/induccionOrganizacionalSheet";
import {
  SELECCION_OFERENTE_BLOCK_HEIGHT,
  SELECCION_OFERENTE_FIRST_BLOCK_START_ROW,
  SELECCION_OFERENTE_SECOND_BLOCK_INSERT_INDEX,
  SELECCION_SECTION_6_BASE_ROWS,
  SELECCION_SECTION_6_BASE_START_ROW,
  SELECCION_SHEET_NAME,
} from "@/lib/finalization/seleccionSheet";
import { coerceTrimmedText, isRecord } from "@/lib/finalization/valueUtils";
import type { PrewarmBuildContext, PrewarmHint } from "@/lib/finalization/prewarmTypes";

const PRESENTACION_ATTENDEES_START_ROW = 75;
const PRESENTACION_ATTENDEES_BASE_ROWS = 3;
const PRESENTACION_MOTIVACION_CELLS = ["U60", "U61", "U62", "U63", "U64", "U65", "U66", "U67"];
const SENSIBILIZACION_SHEET_NAME = "8. SENSIBILIZACIÓN";
const SENSIBILIZACION_ATTENDEES_START_ROW = 32;
const SENSIBILIZACION_ATTENDEES_BASE_ROWS = 4;

function getRecord(value: unknown) {
  return isRecord(value) ? value : {};
}

function getRepeatedCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function getMeaningfulAttendeeCount(value: unknown) {
  return Array.isArray(value) ? getMeaningfulAsistentes(value).length : 0;
}

function getMeaningfulDisabilityCount(value: unknown) {
  if (!Array.isArray(value)) {
    return 0;
  }

  return value.filter((row) => coerceTrimmedText(getRecord(row).discapacidad)).length;
}

function buildSignature(parts: Record<string, unknown>) {
  return JSON.stringify(parts);
}

export function getPresentacionSheetName(formData: unknown) {
  const tipoVisita = normalizePresentacionTipoVisita(
    getRecord(formData).tipo_visita
  );

  return tipoVisita === "Reactivación"
    ? "1.2 REACTIVACIÓN DEL PROGRAMA IL"
    : "1. PRESENTACIÓN DEL PROGRAMA IL";
}

export function buildPrewarmHintForForm(options: {
  formSlug: FinalizationFormSlug;
  formData: unknown;
  provisionalName: string;
}): PrewarmHint {
  const record = getRecord(options.formData);

  switch (options.formSlug) {
    case "presentacion": {
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);
      const variantKey = normalizePresentacionTipoVisita(record.tipo_visita);
      return {
        bundleKey: variantKey === "Reactivación" ? "reactivacion" : "presentacion",
        structureSignature: buildSignature({ variantKey, asistentesCount }),
        variantKey,
        repeatedCounts: { asistentes: asistentesCount },
        provisionalName: options.provisionalName,
      };
    }
    case "sensibilizacion": {
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);
      return {
        bundleKey: "sensibilizacion",
        structureSignature: buildSignature({ asistentesCount }),
        variantKey: "default",
        repeatedCounts: { asistentes: asistentesCount },
        provisionalName: options.provisionalName,
      };
    }
    case "condiciones-vacante": {
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);
      const discapacidadesCount = getMeaningfulDisabilityCount(record.discapacidades);
      return {
        bundleKey: "condiciones-vacante",
        structureSignature: buildSignature({
          asistentesCount,
          discapacidadesCount,
        }),
        variantKey: "default",
        repeatedCounts: {
          asistentes: asistentesCount,
          discapacidades: discapacidadesCount,
        },
        provisionalName: options.provisionalName,
      };
    }
    case "seleccion": {
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);
      const oferentesCount = Math.max(1, getRepeatedCount(record.oferentes));
      return {
        bundleKey: "seleccion",
        structureSignature: buildSignature({ asistentesCount, oferentesCount }),
        variantKey: oferentesCount > 1 ? "grupal" : "individual",
        repeatedCounts: {
          asistentes: asistentesCount,
          oferentes: oferentesCount,
        },
        provisionalName: options.provisionalName,
      };
    }
    case "contratacion": {
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);
      const vinculadosCount = Math.max(1, getRepeatedCount(record.vinculados));
      return {
        bundleKey: "contratacion",
        structureSignature: buildSignature({ asistentesCount, vinculadosCount }),
        variantKey: vinculadosCount > 1 ? "grupal" : "individual",
        repeatedCounts: {
          asistentes: asistentesCount,
          vinculados: vinculadosCount,
        },
        provisionalName: options.provisionalName,
      };
    }
    case "evaluacion": {
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);
      return {
        bundleKey: "evaluacion",
        structureSignature: buildSignature({ asistentesCount }),
        variantKey: "default",
        repeatedCounts: { asistentes: asistentesCount },
        provisionalName: options.provisionalName,
      };
    }
    case "induccion-organizacional": {
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);
      return {
        bundleKey: "induccion-organizacional",
        structureSignature: buildSignature({ asistentesCount }),
        variantKey: "individual",
        repeatedCounts: { asistentes: asistentesCount },
        provisionalName: options.provisionalName,
      };
    }
    case "induccion-operativa": {
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);
      return {
        bundleKey: "induccion-operativa",
        structureSignature: buildSignature({ asistentesCount }),
        variantKey: "individual",
        repeatedCounts: { asistentes: asistentesCount },
        provisionalName: options.provisionalName,
      };
    }
  }
}

export function getPrewarmBundleSheetNames(
  formSlug: FinalizationFormSlug,
  hint: Pick<PrewarmHint, "bundleKey" | "variantKey">
) {
  switch (formSlug) {
    case "presentacion":
      return [hint.variantKey === "Reactivación" ? "1.2 REACTIVACIÓN DEL PROGRAMA IL" : "1. PRESENTACIÓN DEL PROGRAMA IL"];
    case "sensibilizacion":
      return [SENSIBILIZACION_SHEET_NAME];
    case "condiciones-vacante":
      return [CONDICIONES_VACANTE_SHEET_NAME];
    case "seleccion":
      return [SELECCION_SHEET_NAME];
    case "contratacion":
      return [CONTRATACION_SHEET_NAME];
    case "evaluacion":
      return [EVALUACION_SHEET_NAME, "2.1 EVALUACION FOTOS"];
    case "induccion-organizacional":
      return [INDUCCION_ORGANIZACIONAL_SHEET_NAME];
    case "induccion-operativa":
      return [INDUCCION_OPERATIVA_SHEET_NAME];
  }
}

export function getPrewarmActiveSheetName(
  formSlug: FinalizationFormSlug,
  hint: Pick<PrewarmHint, "variantKey">
) {
  switch (formSlug) {
    case "presentacion":
      return hint.variantKey === "Reactivación"
        ? "1.2 REACTIVACIÓN DEL PROGRAMA IL"
        : "1. PRESENTACIÓN DEL PROGRAMA IL";
    case "sensibilizacion":
      return SENSIBILIZACION_SHEET_NAME;
    case "condiciones-vacante":
      return CONDICIONES_VACANTE_SHEET_NAME;
    case "seleccion":
      return SELECCION_SHEET_NAME;
    case "contratacion":
      return CONTRATACION_SHEET_NAME;
    case "evaluacion":
      return EVALUACION_SHEET_NAME;
    case "induccion-organizacional":
      return INDUCCION_ORGANIZACIONAL_SHEET_NAME;
    case "induccion-operativa":
      return INDUCCION_OPERATIVA_SHEET_NAME;
  }
}

export function buildStructuralMutationForForm(
  formSlug: FinalizationFormSlug,
  hint: PrewarmHint
): FormSheetMutation {
  switch (formSlug) {
    case "presentacion": {
      const sheetName = getPrewarmActiveSheetName(formSlug, hint);
      const extraRows = Math.max(
        0,
        (hint.repeatedCounts.asistentes ?? 0) - PRESENTACION_ATTENDEES_BASE_ROWS
      );
      return {
        writes: [],
        rowInsertions:
          extraRows > 0
            ? [
                {
                  sheetName,
                  insertAtRow:
                    PRESENTACION_ATTENDEES_START_ROW + PRESENTACION_ATTENDEES_BASE_ROWS - 1,
                  count: extraRows,
                  templateRow:
                    PRESENTACION_ATTENDEES_START_ROW + PRESENTACION_ATTENDEES_BASE_ROWS - 1,
                },
              ]
            : [],
        checkboxValidations: [
          {
            sheetName,
            cells: [...PRESENTACION_MOTIVACION_CELLS],
          },
        ],
      };
    }
    case "sensibilizacion": {
      const extraRows = Math.max(
        0,
        (hint.repeatedCounts.asistentes ?? 0) - SENSIBILIZACION_ATTENDEES_BASE_ROWS
      );
      return {
        writes: [],
        rowInsertions:
          extraRows > 0
            ? [
                {
                  sheetName: SENSIBILIZACION_SHEET_NAME,
                  insertAtRow:
                    SENSIBILIZACION_ATTENDEES_START_ROW +
                    SENSIBILIZACION_ATTENDEES_BASE_ROWS -
                    1,
                  count: extraRows,
                  templateRow:
                    SENSIBILIZACION_ATTENDEES_START_ROW +
                    SENSIBILIZACION_ATTENDEES_BASE_ROWS -
                    1,
                },
              ]
            : [],
      };
    }
    case "condiciones-vacante": {
      const disabilitiesExtraRows = Math.max(
        0,
        (hint.repeatedCounts.discapacidades ?? 0) - CONDICIONES_VACANTE_SECTION_6_BASE_ROWS
      );
      const section8StartRow =
        CONDICIONES_VACANTE_SECTION_8_START_BASE_ROW + disabilitiesExtraRows;
      const attendeesExtraRows = Math.max(
        0,
        (hint.repeatedCounts.asistentes ?? 0) - CONDICIONES_VACANTE_SECTION_8_BASE_ROWS
      );

      return {
        writes: [],
        rowInsertions: [
          ...(disabilitiesExtraRows > 0
            ? [
                {
                  sheetName: CONDICIONES_VACANTE_SHEET_NAME,
                  insertAtRow:
                    CONDICIONES_VACANTE_SECTION_6_START_ROW +
                    CONDICIONES_VACANTE_SECTION_6_BASE_ROWS -
                    1,
                  count: disabilitiesExtraRows,
                  templateRow:
                    CONDICIONES_VACANTE_SECTION_6_START_ROW +
                    CONDICIONES_VACANTE_SECTION_6_BASE_ROWS -
                    1,
                },
              ]
            : []),
          ...(attendeesExtraRows > 0
            ? [
                {
                  sheetName: CONDICIONES_VACANTE_SHEET_NAME,
                  insertAtRow:
                    section8StartRow + CONDICIONES_VACANTE_SECTION_8_BASE_ROWS - 1,
                  count: attendeesExtraRows,
                  templateRow:
                    section8StartRow + CONDICIONES_VACANTE_SECTION_8_BASE_ROWS - 1,
                },
              ]
            : []),
        ],
        checkboxValidations: [
          {
            sheetName: CONDICIONES_VACANTE_SHEET_NAME,
            cells: ["G36", "L36", "R36", "G37", "L37", "R37"],
          },
        ],
      };
    }
    case "seleccion": {
      const totalOferentes = Math.max(1, hint.repeatedCounts.oferentes ?? 1);
      const sectionShift = (totalOferentes - 1) * SELECCION_OFERENTE_BLOCK_HEIGHT;
      const asistentesStartRow = SELECCION_SECTION_6_BASE_START_ROW + sectionShift;
      const asistentesExtraRows = Math.max(
        0,
        (hint.repeatedCounts.asistentes ?? 0) - SELECCION_SECTION_6_BASE_ROWS
      );
      return {
        writes: [],
        templateBlockInsertions:
          totalOferentes > 1
            ? [
                {
                  sheetName: SELECCION_SHEET_NAME,
                  insertAtRow: SELECCION_OFERENTE_SECOND_BLOCK_INSERT_INDEX,
                  templateStartRow: SELECCION_OFERENTE_FIRST_BLOCK_START_ROW,
                  templateEndRow:
                    SELECCION_OFERENTE_FIRST_BLOCK_START_ROW +
                    SELECCION_OFERENTE_BLOCK_HEIGHT -
                    1,
                  repeatCount: totalOferentes - 1,
                  copyRowHeights: true,
                },
              ]
            : [],
        rowInsertions:
          asistentesExtraRows > 0
            ? [
                {
                  sheetName: SELECCION_SHEET_NAME,
                  insertAtRow:
                    asistentesStartRow + SELECCION_SECTION_6_BASE_ROWS - 1,
                  count: asistentesExtraRows,
                  templateRow:
                    asistentesStartRow + SELECCION_SECTION_6_BASE_ROWS - 1,
                },
              ]
            : [],
      };
    }
    case "contratacion": {
      const totalVinculados = Math.max(1, hint.repeatedCounts.vinculados ?? 1);
      const sectionShift = (totalVinculados - 1) * CONTRATACION_VINCULADO_BLOCK_HEIGHT;
      const asistentesStartRow = CONTRATACION_SECTION_7_BASE_START_ROW + sectionShift;
      const asistentesExtraRows = Math.max(
        0,
        (hint.repeatedCounts.asistentes ?? 0) - CONTRATACION_SECTION_7_BASE_ROWS
      );
      return {
        writes: [],
        templateBlockInsertions:
          totalVinculados > 1
            ? [
                {
                  sheetName: CONTRATACION_SHEET_NAME,
                  insertAtRow: CONTRATACION_VINCULADO_SECOND_BLOCK_INSERT_INDEX,
                  templateStartRow: CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW,
                  templateEndRow:
                    CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW +
                    CONTRATACION_VINCULADO_BLOCK_HEIGHT -
                    1,
                  repeatCount: totalVinculados - 1,
                  copyRowHeights: true,
                },
              ]
            : [],
        rowInsertions:
          asistentesExtraRows > 0
            ? [
                {
                  sheetName: CONTRATACION_SHEET_NAME,
                  insertAtRow:
                    asistentesStartRow + CONTRATACION_SECTION_7_BASE_ROWS - 1,
                  count: asistentesExtraRows,
                  templateRow:
                    asistentesStartRow + CONTRATACION_SECTION_7_BASE_ROWS - 1,
                },
              ]
            : [],
      };
    }
    case "evaluacion": {
      const asistentesExtraRows = Math.max(
        0,
        (hint.repeatedCounts.asistentes ?? 0) - EVALUACION_SECTION_8_BASE_ROWS
      );
      return {
        writes: [],
        rowInsertions:
          asistentesExtraRows > 0
            ? [
                {
                  sheetName: EVALUACION_SHEET_NAME,
                  insertAtRow:
                    EVALUACION_SECTION_8_START_ROW + EVALUACION_SECTION_8_BASE_ROWS - 1,
                  count: asistentesExtraRows,
                  templateRow:
                    EVALUACION_SECTION_8_START_ROW + EVALUACION_SECTION_8_BASE_ROWS - 1,
                },
              ]
            : [],
      };
    }
    case "induccion-organizacional": {
      const asistentesExtraRows = Math.max(
        0,
        (hint.repeatedCounts.asistentes ?? 0) - INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS
      );
      return {
        writes: [],
        rowInsertions:
          asistentesExtraRows > 0
            ? [
                {
                  sheetName: INDUCCION_ORGANIZACIONAL_SHEET_NAME,
                  insertAtRow:
                    INDUCCION_ORGANIZACIONAL_SECTION_6_START_ROW +
                    INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS -
                    1,
                  count: asistentesExtraRows,
                  templateRow:
                    INDUCCION_ORGANIZACIONAL_SECTION_6_START_ROW +
                    INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS -
                    1,
                },
              ]
            : [],
      };
    }
    case "induccion-operativa": {
      const asistentesExtraRows = Math.max(
        0,
        (hint.repeatedCounts.asistentes ?? 0) - INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS
      );
      return {
        writes: [],
        rowInsertions:
          asistentesExtraRows > 0
            ? [
                {
                  sheetName: INDUCCION_OPERATIVA_SHEET_NAME,
                  insertAtRow:
                    INDUCCION_OPERATIVA_SECTION_9_BASE_START_ROW +
                    INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS -
                    1,
                  count: asistentesExtraRows,
                  templateRow:
                    INDUCCION_OPERATIVA_SECTION_9_BASE_START_ROW +
                    INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS -
                    1,
                },
              ]
            : [],
      };
    }
  }
}

export function buildStructuralContext(
  formSlug: FinalizationFormSlug,
  hint: PrewarmHint
): PrewarmBuildContext {
  return {
    formSlug,
    bundleKey: hint.bundleKey,
    variantKey: hint.variantKey,
    repeatedCounts: hint.repeatedCounts,
  };
}
