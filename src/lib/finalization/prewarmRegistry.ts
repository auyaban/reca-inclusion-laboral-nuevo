import { getMeaningfulAsistentes } from "@/lib/asistentes";
import { buildUnusedAttendeeRowHides } from "@/lib/finalization/attendeeRows";
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
  buildInterpreteLscStructuralMutation,
  deriveInterpreteLscStructure,
  INTERPRETE_LSC_SHEET_NAME,
} from "@/lib/finalization/interpreteLscSheet";
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
  getPresentacionPrewarmVariant,
  getPresentacionSheetNameForVariant,
  normalizePresentacionPrewarmVariant,
  PRESENTACION_ATTENDEES_BASE_ROWS,
  PRESENTACION_ATTENDEES_START_ROW,
  PRESENTACION_MOTIVACION_CELLS,
} from "@/lib/finalization/presentacionSheet";
import {
  SELECCION_OFERENTE_BLOCK_HEIGHT,
  SELECCION_OFERENTE_FIRST_BLOCK_START_ROW,
  SELECCION_OFERENTE_SECOND_BLOCK_INSERT_INDEX,
  SELECCION_SECTION_6_BASE_ROWS,
  SELECCION_SECTION_6_BASE_START_ROW,
  SELECCION_SHEET_NAME,
} from "@/lib/finalization/seleccionSheet";
import {
  SENSIBILIZACION_ATTENDEES_BASE_ROWS,
  SENSIBILIZACION_ATTENDEES_START_ROW,
  SENSIBILIZACION_SHEET_NAME,
} from "@/lib/finalization/sensibilizacionSheet";
import {
  countMeaningfulInterpreteLscAsistentes,
  countMeaningfulInterpreteLscInterpretes,
  countMeaningfulInterpreteLscOferentes,
} from "@/lib/interpreteLsc";
import { normalizePresentacionPrewarmAttendeesEstimate } from "@/lib/presentacion";
import { PRESENTACION_PREWARM_ATTENDEES_ESTIMATE_FIELD } from "@/lib/validations/presentacion";
import { coerceTrimmedText, isRecord } from "@/lib/finalization/valueUtils";
import type { PrewarmBuildContext, PrewarmHint } from "@/lib/finalization/prewarmTypes";
import { PREWARM_TEMPLATE_REVISIONS } from "@/lib/finalization/prewarmConfig";

type PrewarmDefinition = {
  buildHint: (formData: unknown, provisionalName: string) => PrewarmHint;
  getBundleSheetNames: (hint: PrewarmHint) => string[];
  getActiveSheetName: (hint: PrewarmHint) => string;
  buildStructuralMutation: (hint: PrewarmHint) => FormSheetMutation;
};

export type PrewarmCapViolation = {
  code: "prewarm_cap_exceeded";
  formSlug: FinalizationFormSlug;
  field: string;
  count: number;
  max: number;
  message: string;
};

export const PREWARM_PRESENTACION_MAX_ASISTENTES = 80;
export const PREWARM_SENSIBILIZACION_MAX_ASISTENTES = 80;
export const PREWARM_DEFAULT_MAX_ASISTENTES = 50;
export const PREWARM_DEFAULT_MAX_REPEATABLE_BLOCKS = 50;

const PREWARM_CAPS = {
  presentacion: { asistentes: PREWARM_PRESENTACION_MAX_ASISTENTES },
  sensibilizacion: { asistentes: PREWARM_SENSIBILIZACION_MAX_ASISTENTES },
  "condiciones-vacante": {
    asistentes: PREWARM_DEFAULT_MAX_ASISTENTES,
    discapacidades: PREWARM_DEFAULT_MAX_REPEATABLE_BLOCKS,
  },
  seleccion: {
    asistentes: PREWARM_DEFAULT_MAX_ASISTENTES,
    oferentes: PREWARM_DEFAULT_MAX_REPEATABLE_BLOCKS,
  },
  contratacion: {
    asistentes: PREWARM_DEFAULT_MAX_ASISTENTES,
    vinculados: PREWARM_DEFAULT_MAX_REPEATABLE_BLOCKS,
  },
  evaluacion: { asistentes: PREWARM_DEFAULT_MAX_ASISTENTES },
  "interprete-lsc": {
    asistentes: 10,
    interpretes: 5,
    oferentes: 10,
  },
  "induccion-organizacional": {
    asistentes: PREWARM_DEFAULT_MAX_ASISTENTES,
  },
  "induccion-operativa": {
    asistentes: PREWARM_DEFAULT_MAX_ASISTENTES,
  },
} as const satisfies Record<FinalizationFormSlug, Record<string, number>>;

const DEFAULT_PREWARM_SUPPORT_SHEET_NAMES = ["Caracterización"] as const;
const PREWARM_SUPPORT_SHEET_NAMES = {
  presentacion: [...DEFAULT_PREWARM_SUPPORT_SHEET_NAMES],
  sensibilizacion: [...DEFAULT_PREWARM_SUPPORT_SHEET_NAMES],
  "condiciones-vacante": [],
  seleccion: [...DEFAULT_PREWARM_SUPPORT_SHEET_NAMES],
  contratacion: [...DEFAULT_PREWARM_SUPPORT_SHEET_NAMES],
  evaluacion: [...DEFAULT_PREWARM_SUPPORT_SHEET_NAMES],
  "interprete-lsc": [],
  "induccion-organizacional": [...DEFAULT_PREWARM_SUPPORT_SHEET_NAMES],
  "induccion-operativa": [...DEFAULT_PREWARM_SUPPORT_SHEET_NAMES],
} as const satisfies Record<FinalizationFormSlug, readonly string[]>;

type PrewarmSignatureEntry = readonly [key: string, value: string | number];

function getRecord(value: unknown) {
  return isRecord(value) ? value : {};
}

function getRepeatedCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function getMeaningfulAttendeeCount(value: unknown) {
  return Array.isArray(value) ? getMeaningfulAsistentes(value).length : 0;
}

function getPresentacionPrewarmAttendeeCount(record: Record<string, unknown>) {
  const actualCount = getMeaningfulAttendeeCount(record.asistentes);
  const estimatedCount = normalizePresentacionPrewarmAttendeesEstimate(
    record[PRESENTACION_PREWARM_ATTENDEES_ESTIMATE_FIELD]
  );

  return Math.max(actualCount, estimatedCount ?? 0);
}

function getMeaningfulDisabilityCount(value: unknown) {
  if (!Array.isArray(value)) {
    return 0;
  }

  return value.filter((row) => coerceTrimmedText(getRecord(row).discapacidad)).length;
}

function buildSignature(entries: readonly PrewarmSignatureEntry[]) {
  return `{${[...entries]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`)
    .join(",")}}`;
}

function buildHint(options: {
  formSlug: FinalizationFormSlug;
  bundleKey: string;
  variantKey: string;
  repeatedCounts: Record<string, number>;
  provisionalName: string;
  signatureEntries: readonly PrewarmSignatureEntry[];
}): PrewarmHint {
  const templateRevision = getPrewarmTemplateRevision(options.formSlug);
  return {
    bundleKey: options.bundleKey,
    structureSignature: buildSignature([
      ...options.signatureEntries,
      ["templateRevision", templateRevision],
    ]),
    templateRevision,
    variantKey: options.variantKey,
    repeatedCounts: options.repeatedCounts,
    provisionalName: options.provisionalName,
  };
}

export function getPrewarmTemplateRevision(formSlug: FinalizationFormSlug) {
  return PREWARM_TEMPLATE_REVISIONS[formSlug];
}

function getPresentacionVariantFromHint(hint: Pick<PrewarmHint, "variantKey">) {
  return normalizePresentacionPrewarmVariant(hint.variantKey);
}

export function getPrewarmCapViolation(
  formSlug: FinalizationFormSlug,
  hint: Pick<PrewarmHint, "repeatedCounts">
): PrewarmCapViolation | null {
  const caps = PREWARM_CAPS[formSlug];

  for (const [field, max] of Object.entries(caps)) {
    const count = hint.repeatedCounts[field] ?? 0;
    if (count <= max) {
      continue;
    }

    return {
      code: "prewarm_cap_exceeded",
      formSlug,
      field,
      count,
      max,
      message: `${formSlug} permite prewarm automatico hasta ${max} filas en ${field}. Ajusta el borrador o finaliza sin prewarm listo.`,
    };
  }

  return null;
}

const PREWARM_REGISTRY = {
  presentacion: {
    buildHint(formData, provisionalName) {
      const record = getRecord(formData);
      const asistentesCount = getPresentacionPrewarmAttendeeCount(record);
      const variant = getPresentacionPrewarmVariant(record.tipo_visita);

      return buildHint({
        formSlug: "presentacion",
        bundleKey: variant,
        variantKey: variant,
        repeatedCounts: { asistentes: asistentesCount },
        provisionalName,
        signatureEntries: [
          ["variantKey", variant],
          ["asistentesCount", asistentesCount],
        ],
      });
    },
    getBundleSheetNames(hint) {
      return [
        getPresentacionSheetNameForVariant(getPresentacionVariantFromHint(hint)),
      ];
    },
    getActiveSheetName(hint) {
      return getPresentacionSheetNameForVariant(getPresentacionVariantFromHint(hint));
    },
    buildStructuralMutation(hint) {
      const sheetName = getPresentacionSheetNameForVariant(
        getPresentacionVariantFromHint(hint)
      );
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
                    PRESENTACION_ATTENDEES_START_ROW +
                    PRESENTACION_ATTENDEES_BASE_ROWS -
                    1,
                  count: extraRows,
                  templateRow:
                    PRESENTACION_ATTENDEES_START_ROW +
                    PRESENTACION_ATTENDEES_BASE_ROWS -
                    1,
                },
              ]
            : [],
        checkboxValidations: [
          {
            sheetName,
            cells: [...PRESENTACION_MOTIVACION_CELLS],
          },
        ],
        hiddenRows: buildUnusedAttendeeRowHides({
          sheetName,
          startRow: PRESENTACION_ATTENDEES_START_ROW,
          baseRows: PRESENTACION_ATTENDEES_BASE_ROWS,
          usedRows: hint.repeatedCounts.asistentes ?? 0,
        }),
      };
    },
  },
  sensibilizacion: {
    buildHint(formData, provisionalName) {
      const record = getRecord(formData);
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);

      return buildHint({
        formSlug: "sensibilizacion",
        bundleKey: "sensibilizacion",
        variantKey: "default",
        repeatedCounts: { asistentes: asistentesCount },
        provisionalName,
        signatureEntries: [["asistentesCount", asistentesCount]],
      });
    },
    getBundleSheetNames() {
      return [SENSIBILIZACION_SHEET_NAME];
    },
    getActiveSheetName() {
      return SENSIBILIZACION_SHEET_NAME;
    },
    buildStructuralMutation(hint) {
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
        hiddenRows: buildUnusedAttendeeRowHides({
          sheetName: SENSIBILIZACION_SHEET_NAME,
          startRow: SENSIBILIZACION_ATTENDEES_START_ROW,
          baseRows: SENSIBILIZACION_ATTENDEES_BASE_ROWS,
          usedRows: hint.repeatedCounts.asistentes ?? 0,
        }),
      };
    },
  },
  "condiciones-vacante": {
    buildHint(formData, provisionalName) {
      const record = getRecord(formData);
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);
      const discapacidadesCount = getMeaningfulDisabilityCount(
        record.discapacidades
      );

      return buildHint({
        formSlug: "condiciones-vacante",
        bundleKey: "condiciones-vacante",
        variantKey: "default",
        repeatedCounts: {
          asistentes: asistentesCount,
          discapacidades: discapacidadesCount,
        },
        provisionalName,
        signatureEntries: [
          ["asistentesCount", asistentesCount],
          ["discapacidadesCount", discapacidadesCount],
        ],
      });
    },
    getBundleSheetNames() {
      return [CONDICIONES_VACANTE_SHEET_NAME];
    },
    getActiveSheetName() {
      return CONDICIONES_VACANTE_SHEET_NAME;
    },
    buildStructuralMutation(hint) {
      const disabilitiesExtraRows = Math.max(
        0,
        (hint.repeatedCounts.discapacidades ?? 0) -
          CONDICIONES_VACANTE_SECTION_6_BASE_ROWS
      );
      const section8StartRow =
        CONDICIONES_VACANTE_SECTION_8_START_BASE_ROW + disabilitiesExtraRows;
      const attendeesExtraRows = Math.max(
        0,
        (hint.repeatedCounts.asistentes ?? 0) -
          CONDICIONES_VACANTE_SECTION_8_BASE_ROWS
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
                    section8StartRow +
                    CONDICIONES_VACANTE_SECTION_8_BASE_ROWS -
                    1,
                  count: attendeesExtraRows,
                  templateRow:
                    section8StartRow +
                    CONDICIONES_VACANTE_SECTION_8_BASE_ROWS -
                    1,
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
        hiddenRows: buildUnusedAttendeeRowHides({
          sheetName: CONDICIONES_VACANTE_SHEET_NAME,
          startRow: section8StartRow,
          baseRows: CONDICIONES_VACANTE_SECTION_8_BASE_ROWS,
          usedRows: hint.repeatedCounts.asistentes ?? 0,
        }),
      };
    },
  },
  seleccion: {
    buildHint(formData, provisionalName) {
      const record = getRecord(formData);
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);
      const oferentesCount = Math.max(1, getRepeatedCount(record.oferentes));

      return buildHint({
        formSlug: "seleccion",
        bundleKey: "seleccion",
        variantKey: oferentesCount > 1 ? "grupal" : "individual",
        repeatedCounts: {
          asistentes: asistentesCount,
          oferentes: oferentesCount,
        },
        provisionalName,
        signatureEntries: [
          ["asistentesCount", asistentesCount],
          ["oferentesCount", oferentesCount],
        ],
      });
    },
    getBundleSheetNames() {
      return [SELECCION_SHEET_NAME];
    },
    getActiveSheetName() {
      return SELECCION_SHEET_NAME;
    },
    buildStructuralMutation(hint) {
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
                  templateRow: asistentesStartRow,
                },
              ]
            : [],
        hiddenRows: buildUnusedAttendeeRowHides({
          sheetName: SELECCION_SHEET_NAME,
          startRow: asistentesStartRow,
          baseRows: SELECCION_SECTION_6_BASE_ROWS,
          usedRows: hint.repeatedCounts.asistentes ?? 0,
        }),
      };
    },
  },
  contratacion: {
    buildHint(formData, provisionalName) {
      const record = getRecord(formData);
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);
      const vinculadosCount = Math.max(1, getRepeatedCount(record.vinculados));

      return buildHint({
        formSlug: "contratacion",
        bundleKey: "contratacion",
        variantKey: vinculadosCount > 1 ? "grupal" : "individual",
        repeatedCounts: {
          asistentes: asistentesCount,
          vinculados: vinculadosCount,
        },
        provisionalName,
        signatureEntries: [
          ["asistentesCount", asistentesCount],
          ["vinculadosCount", vinculadosCount],
        ],
      });
    },
    getBundleSheetNames() {
      return [CONTRATACION_SHEET_NAME];
    },
    getActiveSheetName() {
      return CONTRATACION_SHEET_NAME;
    },
    buildStructuralMutation(hint) {
      const totalVinculados = Math.max(1, hint.repeatedCounts.vinculados ?? 1);
      const sectionShift =
        (totalVinculados - 1) * CONTRATACION_VINCULADO_BLOCK_HEIGHT;
      const asistentesStartRow =
        CONTRATACION_SECTION_7_BASE_START_ROW + sectionShift;
      const asistentesExtraRows = Math.max(
        0,
        (hint.repeatedCounts.asistentes ?? 0) -
          CONTRATACION_SECTION_7_BASE_ROWS
      );

      return {
        writes: [],
        templateBlockInsertions:
          totalVinculados > 1
            ? [
                {
                  sheetName: CONTRATACION_SHEET_NAME,
                  insertAtRow: CONTRATACION_VINCULADO_SECOND_BLOCK_INSERT_INDEX,
                  templateStartRow:
                    CONTRATACION_VINCULADO_FIRST_BLOCK_START_ROW,
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
                  templateRow: asistentesStartRow,
                },
              ]
            : [],
        hiddenRows: buildUnusedAttendeeRowHides({
          sheetName: CONTRATACION_SHEET_NAME,
          startRow: asistentesStartRow,
          baseRows: CONTRATACION_SECTION_7_BASE_ROWS,
          usedRows: hint.repeatedCounts.asistentes ?? 0,
        }),
      };
    },
  },
  evaluacion: {
    buildHint(formData, provisionalName) {
      const record = getRecord(formData);
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);

      return buildHint({
        formSlug: "evaluacion",
        bundleKey: "evaluacion",
        variantKey: "default",
        repeatedCounts: { asistentes: asistentesCount },
        provisionalName,
        signatureEntries: [["asistentesCount", asistentesCount]],
      });
    },
    getBundleSheetNames() {
      return [EVALUACION_SHEET_NAME, "2.1 EVALUACION FOTOS"];
    },
    getActiveSheetName() {
      return EVALUACION_SHEET_NAME;
    },
    buildStructuralMutation(hint) {
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
                    EVALUACION_SECTION_8_START_ROW +
                    EVALUACION_SECTION_8_BASE_ROWS -
                    1,
                  count: asistentesExtraRows,
                  templateRow:
                    EVALUACION_SECTION_8_START_ROW +
                    EVALUACION_SECTION_8_BASE_ROWS -
                    1,
                },
              ]
            : [],
        hiddenRows: buildUnusedAttendeeRowHides({
          sheetName: EVALUACION_SHEET_NAME,
          startRow: EVALUACION_SECTION_8_START_ROW,
          baseRows: EVALUACION_SECTION_8_BASE_ROWS,
          usedRows: hint.repeatedCounts.asistentes ?? 0,
        }),
      };
    },
  },
  "interprete-lsc": {
    buildHint(formData, provisionalName) {
      const record = getRecord(formData);
      const oferentesCount = Array.isArray(record.oferentes)
        ? countMeaningfulInterpreteLscOferentes(record.oferentes as never)
        : 0;
      const interpretesCount = Array.isArray(record.interpretes)
        ? countMeaningfulInterpreteLscInterpretes(record.interpretes as never)
        : 0;
      const asistentesCount = Array.isArray(record.asistentes)
        ? countMeaningfulInterpreteLscAsistentes(record.asistentes as never)
        : 0;
      const structure = deriveInterpreteLscStructure({
        oferentesCount,
        interpretesCount,
        asistentesCount,
      });

      return buildHint({
        formSlug: "interprete-lsc",
        bundleKey: "interprete-lsc",
        variantKey: "default",
        repeatedCounts: structure.repeatedCounts,
        provisionalName,
        signatureEntries: structure.signatureEntries,
      });
    },
    getBundleSheetNames() {
      return [INTERPRETE_LSC_SHEET_NAME];
    },
    getActiveSheetName() {
      return INTERPRETE_LSC_SHEET_NAME;
    },
    buildStructuralMutation(hint) {
      return buildInterpreteLscStructuralMutation({
        oferentesCount: hint.repeatedCounts.oferentes ?? 0,
        interpretesCount: hint.repeatedCounts.interpretes ?? 0,
        asistentesCount: hint.repeatedCounts.asistentes ?? 0,
      });
    },
  },
  "induccion-organizacional": {
    buildHint(formData, provisionalName) {
      const record = getRecord(formData);
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);

      return buildHint({
        formSlug: "induccion-organizacional",
        bundleKey: "induccion-organizacional",
        variantKey: "individual",
        repeatedCounts: { asistentes: asistentesCount },
        provisionalName,
        signatureEntries: [["asistentesCount", asistentesCount]],
      });
    },
    getBundleSheetNames() {
      return [INDUCCION_ORGANIZACIONAL_SHEET_NAME];
    },
    getActiveSheetName() {
      return INDUCCION_ORGANIZACIONAL_SHEET_NAME;
    },
    buildStructuralMutation(hint) {
      const asistentesExtraRows = Math.max(
        0,
        (hint.repeatedCounts.asistentes ?? 0) -
          INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS
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
        hiddenRows: buildUnusedAttendeeRowHides({
          sheetName: INDUCCION_ORGANIZACIONAL_SHEET_NAME,
          startRow: INDUCCION_ORGANIZACIONAL_SECTION_6_START_ROW,
          baseRows: INDUCCION_ORGANIZACIONAL_SECTION_6_BASE_ROWS,
          usedRows: hint.repeatedCounts.asistentes ?? 0,
        }),
      };
    },
  },
  "induccion-operativa": {
    buildHint(formData, provisionalName) {
      const record = getRecord(formData);
      const asistentesCount = getMeaningfulAttendeeCount(record.asistentes);

      return buildHint({
        formSlug: "induccion-operativa",
        bundleKey: "induccion-operativa",
        variantKey: "individual",
        repeatedCounts: { asistentes: asistentesCount },
        provisionalName,
        signatureEntries: [["asistentesCount", asistentesCount]],
      });
    },
    getBundleSheetNames() {
      return [INDUCCION_OPERATIVA_SHEET_NAME];
    },
    getActiveSheetName() {
      return INDUCCION_OPERATIVA_SHEET_NAME;
    },
    buildStructuralMutation(hint) {
      const asistentesExtraRows = Math.max(
        0,
        (hint.repeatedCounts.asistentes ?? 0) -
          INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS
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
        hiddenRows: buildUnusedAttendeeRowHides({
          sheetName: INDUCCION_OPERATIVA_SHEET_NAME,
          startRow: INDUCCION_OPERATIVA_SECTION_9_BASE_START_ROW,
          baseRows: INDUCCION_OPERATIVA_SECTION_9_BASE_ROWS,
          usedRows: hint.repeatedCounts.asistentes ?? 0,
        }),
      };
    },
  },
} as const satisfies Record<FinalizationFormSlug, PrewarmDefinition>;

export { getPresentacionSheetName } from "@/lib/finalization/presentacionSheet";

function getPrewarmDefinition(formSlug: FinalizationFormSlug) {
  return PREWARM_REGISTRY[formSlug];
}

export function buildPrewarmHintForForm(options: {
  formSlug: FinalizationFormSlug;
  formData: unknown;
  provisionalName: string;
}): PrewarmHint {
  return getPrewarmDefinition(options.formSlug).buildHint(
    options.formData,
    options.provisionalName
  );
}

export function getPrewarmBundleSheetNames(
  formSlug: FinalizationFormSlug,
  hint: Pick<PrewarmHint, "bundleKey" | "variantKey">
) {
  return getPrewarmDefinition(formSlug).getBundleSheetNames(hint as PrewarmHint);
}

export function getPrewarmActiveSheetName(
  formSlug: FinalizationFormSlug,
  hint: Pick<PrewarmHint, "variantKey">
) {
  return getPrewarmDefinition(formSlug).getActiveSheetName(hint as PrewarmHint);
}

export function getPrewarmSupportSheetNames(formSlug: FinalizationFormSlug) {
  return [...PREWARM_SUPPORT_SHEET_NAMES[formSlug]];
}

export function buildStructuralMutationForForm(
  formSlug: FinalizationFormSlug,
  hint: PrewarmHint
): FormSheetMutation {
  return getPrewarmDefinition(formSlug).buildStructuralMutation(hint);
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
