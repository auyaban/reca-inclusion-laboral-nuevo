import type { sheets_v4 } from "googleapis";
import {
  ACTA_FOOTER_ANCHOR,
  buildActaFooterValue,
} from "@/lib/finalization/actaRef";
import type { FooterMutationMarker } from "@/lib/finalization/requests";
import { getDriveClient, getSheetsClient } from "./auth";
import {
  requireDriveFileId,
  requireDriveWebViewLink,
} from "./driveQuery";

export interface CellWrite {
  range: string; // e.g. "'1. PRESENTACIÓN DEL PROGRAMA IL'!D7"
  value: string | number | boolean;
}

export interface RowInsertion {
  sheetName: string;
  insertAtRow: number; // 0-based
  count: number;
  templateRow?: number; // 1-based
}

export interface HiddenRows {
  sheetName: string;
  startRow: number; // 1-based
  count: number;
}

export interface TemplateBlockInsertion {
  sheetName: string;
  insertAtRow: number; // 0-based
  templateStartRow: number; // 1-based inclusive
  templateEndRow: number; // 1-based inclusive
  repeatCount: number;
  copyRowHeights?: boolean;
}

export interface CheckboxValidationConfig {
  sheetName: string;
  cells: string[];
}

export interface FooterActaRef {
  sheetName: string;
  actaRef: string;
}

export interface ResolvedFooterActaWrite extends CellWrite {
  sheetName: string;
  rowIndex: number; // 0-based
  columnIndex: number; // 0-based
}

export interface InspectedFooterActaWrite extends ResolvedFooterActaWrite {
  currentValue: string;
  applied: boolean;
}

export type AutoResizeExcludedRows = Record<string, number[]>;

export interface FormSheetMutation {
  writes: CellWrite[];
  templateBlockInsertions?: TemplateBlockInsertion[];
  rowInsertions?: RowInsertion[];
  hiddenRows?: HiddenRows[];
  checkboxValidations?: CheckboxValidationConfig[];
  footerActaRefs?: FooterActaRef[];
  autoResizeExcludedRows?: AutoResizeExcludedRows;
}

export interface SheetVisibilityState {
  sheetId: number;
  title: string;
  hidden?: boolean;
}

export interface SpreadsheetStructureMetadata {
  sheets: SheetVisibilityState[];
  protectedRangeIds: number[];
}

export type StructuralA1WriteIssueKind =
  | "write_crosses_row_insertion_anchor"
  | "write_crosses_template_insertion_anchor"
  | "write_crosses_multiple_structural_anchors";

export interface StructuralA1WriteAuditEntry {
  range: string;
  sheetName: string;
  startRow: number;
  endRow: number;
}

export interface StructuralA1TemplateBlockAuditEntry {
  sheetName: string;
  insertAtRow: number;
  templateStartRow: number;
  templateEndRow: number;
  repeatCount: number;
  destinationStartRow: number;
  destinationEndRow: number;
}

export interface StructuralA1WriteAuditIssue {
  sheetName: string;
  kind: StructuralA1WriteIssueKind;
  range: string;
  details: string;
}

export interface StructuralA1WriteAuditSheetSummary {
  sheetName: string;
  writeCount: number;
  rowInsertionCount: number;
  templateBlockInsertionCount: number;
  structuralAnchorRows: number[];
}

export interface StructuralA1WriteAuditReport {
  safe: boolean;
  issues: StructuralA1WriteAuditIssue[];
  writesBySheet: Record<string, StructuralA1WriteAuditEntry[]>;
  rowInsertionsBySheet: Record<string, RowInsertion[]>;
  templateBlockInsertionsBySheet: Record<string, StructuralA1TemplateBlockAuditEntry[]>;
  summary: StructuralA1WriteAuditSheetSummary[];
}

interface AutoResizeRowGroup {
  sheetName: string;
  startRow: number; // 1-based
  endRow: number; // 1-based inclusive
}

interface FormSheetMutationDeps {
  insertTemplateBlockRows: typeof insertTemplateBlockRows;
  insertRows: typeof insertRows;
  hideRows: typeof hideRows;
  resolveFooterActaWrites: typeof resolveFooterActaWrites;
  inspectFooterActaWrites: typeof inspectFooterActaWrites;
  writeFooterActaMarker: typeof writeFooterActaMarker;
  applyFormSheetStructureInsertions: typeof applyFormSheetStructureInsertions;
  applyFormSheetCellWrites: typeof applyFormSheetCellWrites;
  applyFooterActaTextFormat: typeof applyFooterActaTextFormat;
  batchWriteCells: typeof batchWriteCells;
  setCheckboxValidation: typeof setCheckboxValidation;
  autoResizeWrittenRows: typeof autoResizeWrittenRows;
}

interface FormSheetMutationOptions extends Partial<FormSheetMutationDeps> {
  onStep?: (label: string) => void;
}

interface SheetVisibilityPlan {
  requests: sheets_v4.Schema$Request[];
  keptSheetIds: Map<string, number>;
}

type SpreadsheetSheetProperties = NonNullable<sheets_v4.Schema$Sheet["properties"]>;

interface ClearProtectedRangesResult {
  deletedProtectedRangeIds: number[];
  deletedProtectedRangeCount: number;
}

const SHEET_TITLE_ALIASES = {
  "2. EVALUACIÓN DE ACCESIBILIDAD": ["2. EVALUACION DE ACCESIBILIDAD"],
  "2.1 EVALUACIÓN FOTOS": ["2.1 EVALUACION FOTOS"],
  "4. SELECCIÓN INCLUYENTE": ["4. SELECCION INCLUYENTE"],
} as const satisfies Record<string, readonly string[]>;

export function getRequestedSheetTitleCandidates(sheetName: string) {
  const normalizedSheetName = String(sheetName ?? "").trim();
  if (!normalizedSheetName) {
    return [];
  }

  const candidates = new Set<string>([normalizedSheetName]);
  const directAliases = SHEET_TITLE_ALIASES[
    normalizedSheetName as keyof typeof SHEET_TITLE_ALIASES
  ] as readonly string[] | undefined;
  for (const alias of directAliases ?? []) {
    candidates.add(alias);
  }

  if (
    normalizedSheetName === "6. INDUCCIÓN ORGANIZACIONAL" ||
    normalizedSheetName === "6. INDUCCION ORGANIZACIONAL"
  ) {
    candidates.add("6. INDUCCIÓN ORGANIZACIONAL");
    candidates.add("6. INDUCCION ORGANIZACIONAL");
  }

  for (const [canonicalTitle, aliases] of Object.entries(SHEET_TITLE_ALIASES)) {
    const typedAliases = aliases as readonly string[];
    if (
      canonicalTitle === normalizedSheetName ||
      typedAliases.includes(normalizedSheetName)
    ) {
      candidates.add(canonicalTitle);
      for (const alias of typedAliases) {
        candidates.add(alias);
      }
    }
  }

  return Array.from(candidates);
}

export function resolveRequestedSheetTitle(
  sheetName: string,
  availableTitles: Iterable<string>
) {
  const normalizedTitles = new Map<string, string>();
  for (const title of availableTitles) {
    const normalizedTitle = String(title ?? "").trim();
    if (normalizedTitle) {
      normalizedTitles.set(normalizedTitle, normalizedTitle);
    }
  }

  for (const candidate of getRequestedSheetTitleCandidates(sheetName)) {
    const match = normalizedTitles.get(candidate);
    if (match) {
      return match;
    }
  }

  return null;
}

/**
 * Copia el spreadsheet master a una carpeta de Drive.
 * Retorna el file_id y webViewLink del nuevo spreadsheet.
 */
export async function copyTemplate(
  templateId: string,
  newName: string,
  folderId: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient();

  const copied = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: newName,
      parents: [folderId],
    },
    fields: "id,webViewLink",
    supportsAllDrives: true,
  });

  return {
    fileId: requireDriveFileId(
      copied.data.id,
      `copiar spreadsheet plantilla "${newName}"`
    ),
    webViewLink: requireDriveWebViewLink(
      copied.data.webViewLink,
      `copiar spreadsheet plantilla "${newName}"`
    ),
  };
}

/**
 * Escribe múltiples celdas en un spreadsheet (batch update).
 */
export async function batchWriteCells(
  spreadsheetId: string,
  writes: CellWrite[]
): Promise<void> {
  if (writes.length === 0) {
    return;
  }

  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: writes.map((write) => ({
        range: normalizeA1Range(write.range),
        values: [[write.value]],
      })),
    },
  });
}

export function collectProtectedRangeIds(
  spreadsheetSheets: sheets_v4.Schema$Sheet[] = []
) {
  const protectedRangeIds: number[] = [];

  for (const sheet of spreadsheetSheets) {
    for (const protectedRange of sheet.protectedRanges ?? []) {
      if (protectedRange.protectedRangeId == null) {
        continue;
      }

      protectedRangeIds.push(protectedRange.protectedRangeId);
    }
  }

  return Array.from(new Set(protectedRangeIds));
}

export async function clearProtectedRanges(
  spreadsheetId: string
): Promise<ClearProtectedRangesResult> {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(protectedRanges(protectedRangeId))",
  });
  const protectedRangeIds = collectProtectedRangeIds(meta.data.sheets ?? []);

  if (protectedRangeIds.length === 0) {
    return {
      deletedProtectedRangeIds: [],
      deletedProtectedRangeCount: 0,
    };
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: protectedRangeIds.map((protectedRangeId) => ({
        deleteProtectedRange: {
          protectedRangeId,
        },
      })),
    },
  });

  return {
    deletedProtectedRangeIds: protectedRangeIds,
    deletedProtectedRangeCount: protectedRangeIds.length,
  };
}

export async function getSpreadsheetStructureMetadata(
  spreadsheetId: string
): Promise<SpreadsheetStructureMetadata> {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties,protectedRanges(protectedRangeId))",
  });

  const sheetStates = (meta.data.sheets ?? [])
    .map((sheet) => sheet.properties)
    .filter(
      (
        props
      ): props is SpreadsheetSheetProperties =>
        Boolean(props?.sheetId != null && props?.title)
    )
    .map((props) => ({
      sheetId: props.sheetId!,
      title: String(props.title ?? "").trim(),
      hidden: Boolean(props.hidden),
    }));

  return {
    sheets: sheetStates,
    protectedRangeIds: collectProtectedRangeIds(meta.data.sheets ?? []),
  };
}

async function getSheetIds(spreadsheetId: string, sheetNames: string[]) {
  const uniqueNames = Array.from(new Set(sheetNames.filter(Boolean)));
  const sheetIds = new Map<string, number>();

  if (uniqueNames.length === 0) {
    return sheetIds;
  }

  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const availableTitles = (meta.data.sheets ?? []).map((sheet) =>
    String(sheet.properties?.title ?? "").trim()
  );

  for (const name of uniqueNames) {
    const resolvedTitle = resolveRequestedSheetTitle(name, availableTitles);
    const tab = meta.data.sheets?.find(
      (sheet) => sheet.properties?.title === resolvedTitle
    );
    if (!tab || tab.properties?.sheetId == null) {
      throw new Error(`Pestaña "${name}" no encontrada en el spreadsheet`);
    }

    sheetIds.set(name, tab.properties.sheetId);
  }

  return sheetIds;
}

function getSpreadsheetUrl(spreadsheetId: string) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

/**
 * Obtiene el sheetId numérico de una pestaña por su nombre.
 */
async function getSheetId(
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  const sheetIds = await getSheetIds(spreadsheetId, [sheetName]);
  return sheetIds.get(sheetName)!;
}

export function quoteSheetNameForA1(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

export function normalizeA1Range(range: string) {
  const text = String(range ?? "").trim();
  const separatorIndex = text.lastIndexOf("!");
  if (separatorIndex <= 0 || separatorIndex === text.length - 1) {
    return text;
  }

  const rawSheetName = text.slice(0, separatorIndex).trim();
  const a1Notation = text.slice(separatorIndex + 1).trim();
  if (!rawSheetName || !a1Notation) {
    return text;
  }

  const normalizedSheetName = rawSheetName.startsWith("'")
    ? rawSheetName
        .slice(1, rawSheetName.endsWith("'") ? -1 : undefined)
        .replace(/''/g, "'")
    : rawSheetName;

  return `${quoteSheetNameForA1(normalizedSheetName)}!${a1Notation}`;
}

async function getSheetWithMerges(
  spreadsheetId: string,
  sheetName: string
): Promise<{
  sheetId: number;
  merges: sheets_v4.Schema$GridRange[];
}> {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title),merges)",
  });
  const resolvedTitle = resolveRequestedSheetTitle(
    sheetName,
    (meta.data.sheets ?? []).map((sheet) => String(sheet.properties?.title ?? "").trim())
  );
  const matchingSheet = meta.data.sheets?.find(
    (sheet) => sheet.properties?.title === resolvedTitle
  );
  const sheetId = matchingSheet?.properties?.sheetId;

  if (sheetId == null) {
    throw new Error(`Pestaña "${sheetName}" no encontrada en el spreadsheet`);
  }

  return {
    sheetId,
    merges: matchingSheet?.merges ?? [],
  };
}

async function unmergeIntersectingRows(
  spreadsheetId: string,
  sheetName: string,
  startRowIndex: number,
  endRowIndex: number
) {
  const { sheetId, merges } = await getSheetWithMerges(spreadsheetId, sheetName);
  const requests: sheets_v4.Schema$Request[] = [];

  for (const merge of merges) {
    const mergeStartRowIndex = merge.startRowIndex ?? 0;
    const mergeEndRowIndex = merge.endRowIndex ?? 0;

    if (
      mergeStartRowIndex >= endRowIndex ||
      mergeEndRowIndex <= startRowIndex
    ) {
      continue;
    }

    requests.push({
      unmergeCells: {
        range: {
          sheetId,
          startRowIndex: mergeStartRowIndex,
          endRowIndex: mergeEndRowIndex,
          startColumnIndex: merge.startColumnIndex ?? 0,
          endColumnIndex: merge.endColumnIndex ?? 0,
        },
      },
    });
  }

  if (requests.length === 0) {
    return;
  }

  const sheets = getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests,
    },
  });
}

async function getTemplateRowHeights(
  spreadsheetId: string,
  sheetName: string,
  templateStartRow: number,
  templateEndRow: number
) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges: [
      `${quoteSheetNameForA1(sheetName)}!A${templateStartRow}:A${templateEndRow}`,
    ],
    includeGridData: true,
    fields: "sheets.data.rowMetadata",
  });
  const expectedRowCount = (templateEndRow - templateStartRow) + 1;
  const rowHeights: number[] = [];

  for (const sheet of response.data.sheets ?? []) {
    for (const grid of sheet.data ?? []) {
      for (const rowMetadata of grid.rowMetadata ?? []) {
        const pixelSize = Number(rowMetadata.pixelSize ?? 0);
        rowHeights.push(pixelSize > 0 ? pixelSize : 21);
      }
      if (rowHeights.length > 0) {
        break;
      }
    }
    if (rowHeights.length > 0) {
      break;
    }
  }

  if (rowHeights.length < expectedRowCount) {
    rowHeights.push(...Array(expectedRowCount - rowHeights.length).fill(21));
  }

  return rowHeights.slice(0, expectedRowCount);
}

function buildRowHeightRequests(
  sheetId: number,
  destinationStartRowIndex: number,
  rowHeights: number[]
) {
  if (rowHeights.length === 0) {
    return [];
  }

  const requests: sheets_v4.Schema$Request[] = [];
  let runStartIndex = destinationStartRowIndex;
  let runHeight = rowHeights[0];

  for (let offset = 1; offset < rowHeights.length; offset += 1) {
    const nextHeight = rowHeights[offset];
    if (nextHeight === runHeight) {
      continue;
    }

    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: runStartIndex,
          endIndex: destinationStartRowIndex + offset,
        },
        properties: {
          pixelSize: runHeight,
        },
        fields: "pixelSize",
      },
    });
    runStartIndex = destinationStartRowIndex + offset;
    runHeight = nextHeight;
  }

  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: runStartIndex,
        endIndex: destinationStartRowIndex + rowHeights.length,
      },
      properties: {
        pixelSize: runHeight,
      },
      fields: "pixelSize",
    },
  });

  return requests;
}

export async function insertTemplateBlockRows(
  spreadsheetId: string,
  {
    sheetName,
    insertAtRow,
    templateStartRow,
    templateEndRow,
    repeatCount,
    copyRowHeights = false,
  }: TemplateBlockInsertion
): Promise<void> {
  const totalBlocks = Math.max(0, Math.trunc(repeatCount || 0));
  if (totalBlocks <= 0) {
    return;
  }

  const normalizedTemplateStartRow = Math.trunc(templateStartRow || 0);
  const normalizedTemplateEndRow = Math.trunc(templateEndRow || 0);
  if (
    normalizedTemplateStartRow <= 0 ||
    normalizedTemplateEndRow < normalizedTemplateStartRow
  ) {
    throw new Error(
      "templateStartRow/templateEndRow inválidos para insertar bloques."
    );
  }

  const normalizedInsertAtRow = Math.trunc(insertAtRow || 0);
  if (normalizedInsertAtRow < 0) {
    throw new Error("insertAtRow invalido para insertar bloques.");
  }

  if (normalizedInsertAtRow < normalizedTemplateEndRow) {
    throw new Error(
      `insertAtRow=${normalizedInsertAtRow} debe apuntar despues de templateEndRow=${normalizedTemplateEndRow} para duplicar bloques en la misma hoja.`
    );
  }

  const blockHeight =
    (normalizedTemplateEndRow - normalizedTemplateStartRow) + 1;
  const totalRows = blockHeight * totalBlocks;
  const sourceStartRowIndex = normalizedTemplateStartRow - 1;
  const sourceEndRowIndex = normalizedTemplateEndRow;
  const sheetId = await getSheetId(spreadsheetId, sheetName);
  const sheets = getSheetsClient();

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: normalizedInsertAtRow,
              endIndex: normalizedInsertAtRow + totalRows,
            },
            inheritFromBefore: normalizedInsertAtRow > 0,
          },
        },
      ],
    },
  });

  await unmergeIntersectingRows(
    spreadsheetId,
    sheetName,
    normalizedInsertAtRow,
    normalizedInsertAtRow + totalRows
  );

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: Array.from({ length: totalBlocks }, (_, blockIndex) => {
        const destinationStartRowIndex =
          normalizedInsertAtRow + (blockIndex * blockHeight);

        return {
          copyPaste: {
            source: {
              sheetId,
              startRowIndex: sourceStartRowIndex,
              endRowIndex: sourceEndRowIndex,
            },
            destination: {
              sheetId,
              startRowIndex: destinationStartRowIndex,
              endRowIndex: destinationStartRowIndex + blockHeight,
            },
            pasteType: "PASTE_NORMAL",
            pasteOrientation: "NORMAL",
          },
        };
      }),
    },
  });

  if (!copyRowHeights) {
    return;
  }

  const templateRowHeights = await getTemplateRowHeights(
    spreadsheetId,
    sheetName,
    normalizedTemplateStartRow,
    normalizedTemplateEndRow
  );
  const heightRequests = Array.from({ length: totalBlocks }).flatMap(
    (_, blockIndex) =>
      buildRowHeightRequests(
        sheetId,
        normalizedInsertAtRow + (blockIndex * blockHeight),
        templateRowHeights
      )
  );

  if (heightRequests.length === 0) {
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: heightRequests,
    },
  });
}

/**
 * Inserta filas vacías en una pestaña a partir de `startRow` (0-based).
 * Se usa cuando hay más asistentes que los pre-existentes en la plantilla.
 */
export async function insertRows(
  spreadsheetId: string,
  sheetName: string,
  startRow: number,
  count: number,
  templateRow?: number
): Promise<void> {
  if (count <= 0) {
    return;
  }

  const sheets = getSheetsClient();
  const sheetId = await getSheetId(spreadsheetId, sheetName);
  const requests: sheets_v4.Schema$Request[] = [
    {
      insertDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: startRow,
          endIndex: startRow + count,
        },
        inheritFromBefore: true,
      },
    },
  ];

  if (templateRow && templateRow > 0) {
    const templateIndex = templateRow - 1;
    requests.push({
      copyPaste: {
        source: {
          sheetId,
          startRowIndex: templateIndex,
          endRowIndex: templateIndex + 1,
        },
        destination: {
          sheetId,
          startRowIndex: startRow,
          endRowIndex: startRow + count,
        },
        pasteType: "PASTE_NORMAL",
        pasteOrientation: "NORMAL",
      },
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests,
    },
  });
}

export async function hideRows(
  spreadsheetId: string,
  { sheetName, startRow, count }: HiddenRows
): Promise<void> {
  const normalizedStartRow = Math.trunc(startRow || 0);
  const normalizedCount = Math.trunc(count || 0);
  if (normalizedStartRow <= 0 || normalizedCount <= 0) {
    return;
  }

  const sheets = getSheetsClient();
  const sheetId = await getSheetId(spreadsheetId, sheetName);
  const startIndex = normalizedStartRow - 1;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex,
              endIndex: startIndex + normalizedCount,
            },
            properties: {
              hiddenByUser: true,
            },
            fields: "hiddenByUser",
          },
        },
      ],
    },
  });
}

/**
 * Establece validación de checkbox (TRUE/FALSE) en las celdas indicadas.
 * Las celdas deben ser notación A1 dentro de la pestaña (sin nombre de tab).
 */
export async function setCheckboxValidation(
  spreadsheetId: string,
  sheetName: string,
  a1Notations: string[]
): Promise<void> {
  if (a1Notations.length === 0) {
    return;
  }

  const sheets = getSheetsClient();
  const sheetId = await getSheetId(spreadsheetId, sheetName);

  function a1ToGridRange(a1: string) {
    const col = a1.replace(/[0-9]/g, "");
    const row = Number.parseInt(a1.replace(/[^0-9]/g, ""), 10) - 1;
    const colIndex =
      col
        .toUpperCase()
        .split("")
        .reduce((acc, current) => acc * 26 + current.charCodeAt(0) - 64, 0) - 1;

    return {
      sheetId,
      startRowIndex: row,
      endRowIndex: row + 1,
      startColumnIndex: colIndex,
      endColumnIndex: colIndex + 1,
    };
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: a1Notations.map((cell) => ({
        setDataValidation: {
          range: a1ToGridRange(cell),
          rule: {
            condition: { type: "BOOLEAN" },
            strict: true,
            showCustomUi: true,
          },
        },
      })),
    },
  });
}

function parseSheetName(rawSheetName: string) {
  const value = rawSheetName.trim();

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  return value;
}

function columnIndexToA1(columnIndex: number) {
  let value = Math.max(1, Math.trunc(columnIndex));
  let column = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - 1) / 26);
  }

  return column;
}

function matchesActaFooterAnchor(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized.includes(ACTA_FOOTER_ANCHOR);
}

/**
 * Resuelve el footer ACTA ID usando la ultima ocurrencia del anchor por hoja.
 *
 * En resumes parciales puede quedar texto stale de una corrida previa en filas
 * intermedias. Si tomamos el primer match, esos anchors viejos secuestran el
 * footer real y disparan fail-safes falsos. Por eso aquí aplica last-match-wins:
 * el footer canónico siempre debe ser la ocurrencia más baja del anchor en la
 * hoja al momento de inspeccionarla.
 *
 * Follow-up deliberadamente fuera de esta fase: limpiar anchors stale ya
 * escritos en Google Sheets. Este helper solo los ignora al resolver el footer
 * operativo para recovery/resume.
 */
export async function resolveFooterActaWrites(
  spreadsheetId: string,
  footerActaRefs: FooterActaRef[] = []
) {
  if (footerActaRefs.length === 0) {
    return [] as ResolvedFooterActaWrite[];
  }

  const sheets = getSheetsClient();
  const refsBySheet = new Map<string, string>();

  for (const footerActaRef of footerActaRefs) {
    const sheetName = String(footerActaRef.sheetName || "").trim();
    const actaRef = String(footerActaRef.actaRef || "").trim();
    if (sheetName && actaRef) {
      refsBySheet.set(sheetName, actaRef);
    }
  }

  const writes: ResolvedFooterActaWrite[] = [];

  for (const [sheetName, actaRef] of refsBySheet.entries()) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: quoteSheetNameForA1(sheetName),
    });
    const values = (response.data.values as unknown[][] | undefined) ?? [];
    let footerRow = -1;
    let footerColumn = -1;

    for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
      const row = values[rowIndex] ?? [];
      for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
        if (!matchesActaFooterAnchor(row[columnIndex])) {
          continue;
        }

        footerRow = rowIndex;
        footerColumn = columnIndex;
        break;
      }
    }

    if (footerRow < 0 || footerColumn < 0) {
      throw new Error(
        `No se encontró el footer "${ACTA_FOOTER_ANCHOR}" en la pestaña "${sheetName}".`
      );
    }

    writes.push({
      sheetName,
      rowIndex: footerRow,
      columnIndex: footerColumn,
      range: `${quoteSheetNameForA1(sheetName)}!${columnIndexToA1(
        footerColumn + 1
      )}${footerRow + 1}`,
      value: buildActaFooterValue(actaRef),
    });
  }

  return writes;
}

export async function areFooterActaRefsApplied(
  spreadsheetId: string,
  footerActaRefs: FooterActaRef[] = []
) {
  const footerWrites = await inspectFooterActaWrites(spreadsheetId, footerActaRefs);
  if (footerWrites.length === 0) {
    return false;
  }

  for (const footerWrite of footerWrites) {
    if (!footerWrite.applied) {
      return false;
    }
  }

  return true;
}

export async function inspectFooterActaWrites(
  spreadsheetId: string,
  footerActaRefs: FooterActaRef[] = []
) {
  const resolvedWrites = await resolveFooterActaWrites(spreadsheetId, footerActaRefs);
  if (resolvedWrites.length === 0) {
    return [] as InspectedFooterActaWrite[];
  }

  const sheets = getSheetsClient();
  const inspectedWrites: InspectedFooterActaWrite[] = [];

  for (const footerWrite of resolvedWrites) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: footerWrite.range,
    });
    const currentValue = String(response.data.values?.[0]?.[0] ?? "").trim();
    inspectedWrites.push({
      ...footerWrite,
      currentValue,
      applied: currentValue === String(footerWrite.value).trim(),
    });
  }

  return inspectedWrites;
}

export function buildFooterMutationMarkers(options: {
  footerWrites: ResolvedFooterActaWrite[];
  footerActaRefs?: FooterActaRef[];
  mutation: Pick<FormSheetMutation, "rowInsertions" | "templateBlockInsertions">;
}) {
  const actaRefBySheet = new Map<string, string>();
  for (const footerActaRef of options.footerActaRefs ?? []) {
    actaRefBySheet.set(footerActaRef.sheetName, footerActaRef.actaRef);
  }

  return options.footerWrites.map((footerWrite) => {
    let expectedFinalRowIndex = footerWrite.rowIndex;
    let blockAdjustedFooterRowIndex = footerWrite.rowIndex;

    for (const insertion of options.mutation.templateBlockInsertions ?? []) {
      if (insertion.sheetName !== footerWrite.sheetName || insertion.repeatCount <= 0) {
        continue;
      }

      if (insertion.insertAtRow > footerWrite.rowIndex) {
        continue;
      }

      blockAdjustedFooterRowIndex +=
        (insertion.templateEndRow - insertion.templateStartRow + 1) *
        insertion.repeatCount;
    }

    let runningAdjustedFooterRowIndex = blockAdjustedFooterRowIndex;

    for (const insertion of options.mutation.rowInsertions ?? []) {
      if (insertion.sheetName !== footerWrite.sheetName || insertion.count <= 0) {
        continue;
      }

      if (typeof insertion.templateRow === "number") {
        const templateRowIndex = insertion.templateRow - 1;
        if (templateRowIndex >= runningAdjustedFooterRowIndex) {
          throw new Error(
            `La insercion estructural de "${footerWrite.sheetName}" reutiliza templateRow=${insertion.templateRow} con insertAtRow=${insertion.insertAtRow} sobre o despues del footer ACTA ID (footerRowIndex=${runningAdjustedFooterRowIndex}) y no se puede reanudar de forma segura.`
          );
        }
      }

      if (insertion.insertAtRow > runningAdjustedFooterRowIndex) {
        throw new Error(
          `La insercion estructural de "${footerWrite.sheetName}" ocurre despues del footer ACTA ID y no se puede reanudar de forma segura.`
        );
      }

      expectedFinalRowIndex += insertion.count;
      runningAdjustedFooterRowIndex += insertion.count;
    }

    for (const insertion of options.mutation.templateBlockInsertions ?? []) {
      if (insertion.sheetName !== footerWrite.sheetName || insertion.repeatCount <= 0) {
        continue;
      }

      const templateStartRowIndex = insertion.templateStartRow - 1;
      const templateEndRowIndex = insertion.templateEndRow - 1;

      if (
        templateStartRowIndex <= footerWrite.rowIndex &&
        templateEndRowIndex >= footerWrite.rowIndex
      ) {
        throw new Error(
          `La plantilla que se duplica en "${footerWrite.sheetName}" incluye el footer ACTA ID y no se puede reanudar de forma segura.`
        );
      }

      if (insertion.insertAtRow > footerWrite.rowIndex) {
        throw new Error(
          `La insercion de bloques de "${footerWrite.sheetName}" ocurre despues del footer ACTA ID y no se puede reanudar de forma segura.`
        );
      }

      expectedFinalRowIndex +=
        (insertion.templateEndRow - insertion.templateStartRow + 1) *
        insertion.repeatCount;
    }

    const actaRef = actaRefBySheet.get(footerWrite.sheetName);
    if (!actaRef) {
      throw new Error(
        `No se encontró el ACTA ID esperado para la hoja "${footerWrite.sheetName}" al construir los markers estructurales.`
      );
    }

    return {
      sheetName: footerWrite.sheetName,
      actaRef,
      initialRowIndex: footerWrite.rowIndex,
      expectedFinalRowIndex,
    } as FooterMutationMarker;
  });
}

export async function writeFooterActaMarker(
  spreadsheetId: string,
  footerWrites: ResolvedFooterActaWrite[]
) {
  if (footerWrites.length === 0) {
    return;
  }

  await batchWriteCells(spreadsheetId, footerWrites);
}

export async function applyFormSheetStructureInsertions(
  spreadsheetId: string,
  {
    templateBlockInsertions = [],
    rowInsertions = [],
    hiddenRows = [],
  }: Pick<
    FormSheetMutation,
    "templateBlockInsertions" | "rowInsertions" | "hiddenRows"
  >,
  options: Pick<FormSheetMutationOptions, "onStep"> = {}
) {
  for (const insertion of templateBlockInsertions) {
    await insertTemplateBlockRows(spreadsheetId, insertion);
  }
  if (templateBlockInsertions.length > 0) {
    options.onStep?.("mutation.insert_template_blocks");
  }

  for (const insertion of rowInsertions) {
    await insertRows(
      spreadsheetId,
      insertion.sheetName,
      insertion.insertAtRow,
      insertion.count,
      insertion.templateRow
    );
  }
  if (rowInsertions.length > 0) {
    options.onStep?.("mutation.insert_rows");
  }

  for (const group of hiddenRows) {
    await hideRows(spreadsheetId, group);
  }
  if (hiddenRows.length > 0) {
    options.onStep?.("mutation.hide_rows");
  }
}

function a1ToGridRangeWithSheetId(sheetId: number, a1: string) {
  const col = a1.replace(/[0-9]/g, "");
  const row = Number.parseInt(a1.replace(/[^0-9]/g, ""), 10) - 1;
  const colIndex =
    col
      .toUpperCase()
      .split("")
      .reduce((acc, current) => acc * 26 + current.charCodeAt(0) - 64, 0) - 1;

  return {
    sheetId,
    startRowIndex: row,
    endRowIndex: row + 1,
    startColumnIndex: colIndex,
    endColumnIndex: colIndex + 1,
  };
}

function getPreloadedSheetId(
  sheetIdsByTitle: Map<string, number>,
  requestedSheetName: string
) {
  const resolvedTitle = resolveRequestedSheetTitle(
    requestedSheetName,
    sheetIdsByTitle.keys()
  );
  const sheetId = resolvedTitle ? sheetIdsByTitle.get(resolvedTitle) : null;
  if (sheetId == null) {
    throw new Error(`Pestaña "${requestedSheetName}" no encontrada en el spreadsheet`);
  }

  return sheetId;
}

export async function applyPrewarmStructuralBatch(options: {
  spreadsheetId: string;
  metadata: SpreadsheetStructureMetadata;
  mutation: FormSheetMutation;
  visibleSheetNames: string[];
  onStep?: (label: string) => void;
}) {
  const {
    templateBlockInsertions = [],
    rowInsertions = [],
    hiddenRows = [],
    checkboxValidations = [],
  } = options.mutation;
  const sheets = getSheetsClient();
  const sheetIdsByTitle = new Map(
    options.metadata.sheets.map((sheet) => [sheet.title, sheet.sheetId])
  );

  let protectedRangeRequests: sheets_v4.Schema$Request[] =
    options.metadata.protectedRangeIds.map((protectedRangeId) => ({
      deleteProtectedRange: {
        protectedRangeId,
      },
    }));

  if (templateBlockInsertions.length > 0 && protectedRangeRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        requests: protectedRangeRequests,
      },
    });
    options.onStep?.("mutation.clear_protected_ranges");
    protectedRangeRequests = [];
  }

  for (const insertion of templateBlockInsertions) {
    await insertTemplateBlockRows(options.spreadsheetId, insertion);
  }
  if (templateBlockInsertions.length > 0) {
    options.onStep?.("mutation.insert_template_blocks");
  }

  const requests: sheets_v4.Schema$Request[] = [...protectedRangeRequests];

  for (const insertion of rowInsertions) {
    const count = Math.trunc(insertion.count || 0);
    if (count <= 0) {
      continue;
    }

    const sheetId = getPreloadedSheetId(sheetIdsByTitle, insertion.sheetName);
    requests.push({
      insertDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: insertion.insertAtRow,
          endIndex: insertion.insertAtRow + count,
        },
        inheritFromBefore: true,
      },
    });

    if (insertion.templateRow && insertion.templateRow > 0) {
      const templateIndex = insertion.templateRow - 1;
      requests.push({
        copyPaste: {
          source: {
            sheetId,
            startRowIndex: templateIndex,
            endRowIndex: templateIndex + 1,
          },
          destination: {
            sheetId,
            startRowIndex: insertion.insertAtRow,
            endRowIndex: insertion.insertAtRow + count,
          },
          pasteType: "PASTE_NORMAL",
          pasteOrientation: "NORMAL",
        },
      });
    }
  }

  for (const group of hiddenRows) {
    const normalizedStartRow = Math.trunc(group.startRow || 0);
    const normalizedCount = Math.trunc(group.count || 0);
    if (normalizedStartRow <= 0 || normalizedCount <= 0) {
      continue;
    }

    const sheetId = getPreloadedSheetId(sheetIdsByTitle, group.sheetName);
    const startIndex = normalizedStartRow - 1;
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex,
          endIndex: startIndex + normalizedCount,
        },
        properties: {
          hiddenByUser: true,
        },
        fields: "hiddenByUser",
      },
    });
  }

  for (const validation of checkboxValidations) {
    if (validation.cells.length === 0) {
      continue;
    }

    const sheetId = getPreloadedSheetId(sheetIdsByTitle, validation.sheetName);
    for (const cell of validation.cells) {
      requests.push({
        setDataValidation: {
          range: a1ToGridRangeWithSheetId(sheetId, cell),
          rule: {
            condition: { type: "BOOLEAN" },
            strict: true,
            showCustomUi: true,
          },
        },
      });
    }
  }

  const visibilityPlan = buildSheetVisibilityPlan(
    options.metadata.sheets,
    options.visibleSheetNames
  );
  requests.push(...visibilityPlan.requests);

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        requests,
      },
    });
    options.onStep?.("mutation.structural_batch");
  }

  return visibilityPlan.keptSheetIds;
}

export async function applyFormSheetCellWrites(
  spreadsheetId: string,
  {
    writes,
    footerActaRefs = [],
    checkboxValidations = [],
    autoResizeExcludedRows = {},
  }: Pick<
    FormSheetMutation,
    "writes" | "footerActaRefs" | "checkboxValidations" | "autoResizeExcludedRows"
  >,
  options: Pick<FormSheetMutationOptions, "onStep"> = {}
) {
  const footerWrites = await resolveFooterActaWrites(spreadsheetId, footerActaRefs);
  if (footerWrites.length > 0) {
    options.onStep?.("mutation.resolve_footer_acta_ref");
  }

  const effectiveWrites = [...writes, ...footerWrites];
  await batchWriteCells(spreadsheetId, effectiveWrites);
  options.onStep?.("mutation.write_cells");

  await applyFooterActaTextFormat(spreadsheetId, footerWrites);
  if (footerWrites.length > 0) {
    options.onStep?.("mutation.footer_acta_format");
  }

  for (const validation of checkboxValidations) {
    await setCheckboxValidation(spreadsheetId, validation.sheetName, validation.cells);
  }
  if (checkboxValidations.length > 0) {
    options.onStep?.("mutation.checkbox_validation");
  }

  await autoResizeWrittenRows(spreadsheetId, effectiveWrites, autoResizeExcludedRows);
  options.onStep?.("mutation.auto_resize");
}

export async function applyFooterActaTextFormat(
  spreadsheetId: string,
  footerWrites: ResolvedFooterActaWrite[]
) {
  if (footerWrites.length === 0) {
    return;
  }

  const sheets = getSheetsClient();
  const sheetIds = await getSheetIds(
    spreadsheetId,
    footerWrites.map((write) => write.sheetName)
  );

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: footerWrites.map((write) => ({
        repeatCell: {
          range: {
            sheetId: sheetIds.get(write.sheetName)!,
            startRowIndex: write.rowIndex,
            endRowIndex: write.rowIndex + 1,
            startColumnIndex: write.columnIndex,
            endColumnIndex: write.columnIndex + 1,
          },
          cell: {
            userEnteredFormat: {
              textFormat: {
                fontFamily: "Arial",
                fontSize: 6,
              },
            },
          },
          fields:
            "userEnteredFormat.textFormat.fontFamily,userEnteredFormat.textFormat.fontSize",
        },
      })),
    },
  });
}

function extractA1RowBounds(a1Notation: string) {
  const cleaned = a1Notation.trim().replace(/\$/g, "");
  const [startCell, endCell = startCell] = cleaned.split(":");
  const startRow = Number.parseInt(startCell.match(/\d+/)?.[0] ?? "", 10);
  const endRow = Number.parseInt(endCell.match(/\d+/)?.[0] ?? "", 10);

  if (!Number.isInteger(startRow) || !Number.isInteger(endRow)) {
    return null;
  }

  return {
    startRow: Math.min(startRow, endRow),
    endRow: Math.max(startRow, endRow),
  };
}

function parseWriteRange(range: string) {
  const separatorIndex = range.lastIndexOf("!");
  if (separatorIndex <= 0 || separatorIndex === range.length - 1) {
    return null;
  }

  const sheetName = parseSheetName(range.slice(0, separatorIndex));
  const rowBounds = extractA1RowBounds(range.slice(separatorIndex + 1));
  if (!rowBounds) {
    return null;
  }

  return {
    sheetName,
    ...rowBounds,
  };
}

function buildTemplateBlockAuditEntry(
  insertion: TemplateBlockInsertion
): StructuralA1TemplateBlockAuditEntry {
  const blockHeight =
    (insertion.templateEndRow - insertion.templateStartRow + 1) *
    insertion.repeatCount;

  return {
    sheetName: insertion.sheetName,
    insertAtRow: insertion.insertAtRow,
    templateStartRow: insertion.templateStartRow,
    templateEndRow: insertion.templateEndRow,
    repeatCount: insertion.repeatCount,
    destinationStartRow: insertion.insertAtRow + 1,
    destinationEndRow: insertion.insertAtRow + blockHeight,
  };
}

// Auditoria determinista para tests de builders con inserciones estructurales.
// Regla operativa: cualquier builder que agregue row/template insertions debe
// cubrir al menos un caso de overflow real con este helper antes de tocar runtime.
export function auditStructuralA1Writes(
  mutation: Pick<FormSheetMutation, "writes" | "rowInsertions" | "templateBlockInsertions">
): StructuralA1WriteAuditReport {
  const writesBySheet: Record<string, StructuralA1WriteAuditEntry[]> = {};
  const rowInsertionsBySheet: Record<string, RowInsertion[]> = {};
  const templateBlockInsertionsBySheet: Record<
    string,
    StructuralA1TemplateBlockAuditEntry[]
  > = {};
  const issues: StructuralA1WriteAuditIssue[] = [];

  for (const write of mutation.writes) {
    const parsedWrite = parseWriteRange(write.range);
    if (!parsedWrite) {
      continue;
    }

    const normalizedRange = normalizeA1Range(write.range);
    const bucket = writesBySheet[parsedWrite.sheetName] ?? [];
    bucket.push({
      range: normalizedRange,
      sheetName: parsedWrite.sheetName,
      startRow: parsedWrite.startRow,
      endRow: parsedWrite.endRow,
    });
    writesBySheet[parsedWrite.sheetName] = bucket;
  }

  for (const insertion of mutation.rowInsertions ?? []) {
    const bucket = rowInsertionsBySheet[insertion.sheetName] ?? [];
    bucket.push({ ...insertion });
    rowInsertionsBySheet[insertion.sheetName] = bucket;
  }

  for (const insertion of mutation.templateBlockInsertions ?? []) {
    const bucket = templateBlockInsertionsBySheet[insertion.sheetName] ?? [];
    bucket.push(buildTemplateBlockAuditEntry(insertion));
    templateBlockInsertionsBySheet[insertion.sheetName] = bucket;
  }

  const sheetNames = Array.from(
    new Set([
      ...Object.keys(writesBySheet),
      ...Object.keys(rowInsertionsBySheet),
      ...Object.keys(templateBlockInsertionsBySheet),
    ])
  ).sort((left, right) => left.localeCompare(right));

  const summary = sheetNames.map((sheetName) => {
    const rowInsertionAnchors = (rowInsertionsBySheet[sheetName] ?? []).map(
      (insertion) => insertion.insertAtRow + 1
    );
    const templateAnchors = (templateBlockInsertionsBySheet[sheetName] ?? []).map(
      (insertion) => insertion.destinationStartRow
    );

    return {
      sheetName,
      writeCount: writesBySheet[sheetName]?.length ?? 0,
      rowInsertionCount: rowInsertionsBySheet[sheetName]?.length ?? 0,
      templateBlockInsertionCount:
        templateBlockInsertionsBySheet[sheetName]?.length ?? 0,
      structuralAnchorRows: [...rowInsertionAnchors, ...templateAnchors].sort(
        (left, right) => left - right
      ),
    };
  });

  for (const [sheetName, sheetWrites] of Object.entries(writesBySheet)) {
    const rowInsertions = rowInsertionsBySheet[sheetName] ?? [];
    const templateBlockInsertions =
      templateBlockInsertionsBySheet[sheetName] ?? [];

    for (const write of sheetWrites) {
      const crossedKinds = new Set<StructuralA1WriteIssueKind>();

      for (const insertion of rowInsertions) {
        const anchorRow = insertion.insertAtRow + 1;
        if (write.startRow < anchorRow && write.endRow >= anchorRow) {
          crossedKinds.add("write_crosses_row_insertion_anchor");
          issues.push({
            sheetName,
            kind: "write_crosses_row_insertion_anchor",
            range: write.range,
            details: `El rango cruza la insercion de filas anclada en la fila ${anchorRow}.`,
          });
        }
      }

      for (const insertion of templateBlockInsertions) {
        const anchorRow = insertion.destinationStartRow;
        if (write.startRow < anchorRow && write.endRow >= anchorRow) {
          crossedKinds.add("write_crosses_template_insertion_anchor");
          issues.push({
            sheetName,
            kind: "write_crosses_template_insertion_anchor",
            range: write.range,
            details: `El rango cruza la insercion del bloque template anclada en la fila ${anchorRow}.`,
          });
        }
      }

      if (crossedKinds.size > 1) {
        issues.push({
          sheetName,
          kind: "write_crosses_multiple_structural_anchors",
          range: write.range,
          details:
            "El rango cruza multiples anchors estructurales y no se puede probar su estabilidad con una sola referencia A1.",
        });
      }
    }
  }

  return {
    safe: issues.length === 0,
    issues,
    writesBySheet,
    rowInsertionsBySheet,
    templateBlockInsertionsBySheet,
    summary,
  };
}

export function buildAutoResizeRowGroups(
  writes: CellWrite[],
  excludedRows: AutoResizeExcludedRows = {}
) {
  const rowsBySheet = new Map<string, Set<number>>();

  for (const write of writes) {
    const parsedRange = parseWriteRange(write.range);
    if (!parsedRange) {
      continue;
    }

    const excludedForSheet = new Set(excludedRows[parsedRange.sheetName] ?? []);
    const sheetRows = rowsBySheet.get(parsedRange.sheetName) ?? new Set<number>();

    for (let row = parsedRange.startRow; row <= parsedRange.endRow; row += 1) {
      if (!excludedForSheet.has(row)) {
        sheetRows.add(row);
      }
    }

    rowsBySheet.set(parsedRange.sheetName, sheetRows);
  }

  const groups: AutoResizeRowGroup[] = [];

  for (const [sheetName, rowSet] of rowsBySheet.entries()) {
    const sortedRows = Array.from(rowSet).sort((left, right) => left - right);
    if (sortedRows.length === 0) {
      continue;
    }

    let startRow = sortedRows[0];
    let previousRow = sortedRows[0];

    for (let index = 1; index < sortedRows.length; index += 1) {
      const currentRow = sortedRows[index];
      if (currentRow === previousRow + 1) {
        previousRow = currentRow;
        continue;
      }

      groups.push({ sheetName, startRow, endRow: previousRow });
      startRow = currentRow;
      previousRow = currentRow;
    }

    groups.push({ sheetName, startRow, endRow: previousRow });
  }

  return groups;
}

export async function autoResizeWrittenRows(
  spreadsheetId: string,
  writes: CellWrite[],
  excludedRows: AutoResizeExcludedRows = {}
) {
  const groups = buildAutoResizeRowGroups(writes, excludedRows);
  if (groups.length === 0) {
    return;
  }

  const sheetIds = await getSheetIds(
    spreadsheetId,
    groups.map((group) => group.sheetName)
  );
  const requests: sheets_v4.Schema$Request[] = groups.map((group) => ({
    autoResizeDimensions: {
      dimensions: {
        sheetId: sheetIds.get(group.sheetName)!,
        dimension: "ROWS",
        startIndex: group.startRow - 1,
        endIndex: group.endRow,
      },
    },
  }));

  const sheets = getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests,
    },
  });
}

export async function applyFormSheetMutation(
  spreadsheetId: string,
  {
    writes,
    templateBlockInsertions = [],
    rowInsertions = [],
    hiddenRows = [],
    checkboxValidations = [],
    footerActaRefs = [],
    autoResizeExcludedRows = {},
  }: FormSheetMutation,
  options: FormSheetMutationOptions = {}
) {
  const { onStep, ...overrides } = options;
  const deps: FormSheetMutationDeps = {
    insertTemplateBlockRows,
    insertRows,
    hideRows,
    resolveFooterActaWrites,
    inspectFooterActaWrites,
    writeFooterActaMarker,
    applyFormSheetStructureInsertions,
    applyFormSheetCellWrites,
    applyFooterActaTextFormat,
    batchWriteCells,
    setCheckboxValidation,
    autoResizeWrittenRows,
    ...overrides,
  };

  const footerWrites = await deps.resolveFooterActaWrites(
    spreadsheetId,
    footerActaRefs
  );
  await deps.writeFooterActaMarker(spreadsheetId, footerWrites);
  if (footerWrites.length > 0) {
    onStep?.("mutation.write_footer_marker");
  }

  await deps.applyFormSheetStructureInsertions(
    spreadsheetId,
    {
      templateBlockInsertions,
      rowInsertions,
      hiddenRows,
    },
    { onStep }
  );

  await deps.applyFormSheetCellWrites(
    spreadsheetId,
    {
      writes,
      footerActaRefs,
      checkboxValidations,
      autoResizeExcludedRows,
    },
    { onStep }
  );
}

export function buildSheetVisibilityPlan(
  sheets: SheetVisibilityState[],
  sheetNamesToKeep: string[]
): SheetVisibilityPlan {
  const keep = new Set(
    sheetNamesToKeep.map((sheetName) => sheetName.trim()).filter(Boolean)
  );

  if (keep.size === 0) {
    return {
      requests: [],
      keptSheetIds: new Map<string, number>(),
    };
  }

  const keptSheetIds = new Map<string, number>();
  for (const requestedSheetName of keep) {
    const resolvedTitle = resolveRequestedSheetTitle(
      requestedSheetName,
      sheets.map((sheet) => sheet.title)
    );
    if (!resolvedTitle) {
      continue;
    }

    const matchingSheet = sheets.find((sheet) => sheet.title === resolvedTitle);
    if (!matchingSheet) {
      continue;
    }

    keptSheetIds.set(matchingSheet.title, matchingSheet.sheetId);
  }

  if (keptSheetIds.size === 0) {
    throw new Error(
      `No existe ninguna hoja visible solicitada en el spreadsheet destino: ${Array.from(
        keep
      ).join(", ")}`
    );
  }

  const unhideRequests: sheets_v4.Schema$Request[] = [];
  const hideRequests: sheets_v4.Schema$Request[] = [];

  for (const sheet of sheets) {
    const shouldKeep = keptSheetIds.has(sheet.title);
    const isHidden = Boolean(sheet.hidden);

    if (shouldKeep && isHidden) {
      unhideRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheet.sheetId,
            hidden: false,
          },
          fields: "hidden",
        },
      });
      continue;
    }

    if (!shouldKeep && !isHidden) {
      hideRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheet.sheetId,
            hidden: true,
          },
          fields: "hidden",
        },
      });
    }
  }

  return {
    requests: [...unhideRequests, ...hideRequests],
    keptSheetIds,
  };
}

export async function keepOnlySheetsVisible(
  spreadsheetId: string,
  visibleSheetNames: string[],
  preloadedSheets?: SheetVisibilityState[]
) {
  const sheets = getSheetsClient();
  const allSheets =
    preloadedSheets ??
    ((await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    })).data.sheets ?? [])
      .map((sheet) => sheet.properties)
      .filter(
        (
          props
        ): props is SpreadsheetSheetProperties =>
          Boolean(props?.sheetId != null && props?.title)
      )
      .map((props) => ({
        sheetId: props.sheetId!,
        title: String(props.title ?? "").trim(),
        hidden: Boolean(props.hidden),
      }));

  const plan = buildSheetVisibilityPlan(allSheets, visibleSheetNames);
  if (plan.requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: plan.requests,
      },
    });
  }

  return plan.keptSheetIds;
}

export async function hideSheets(
  spreadsheetId: string,
  sheetNamesToKeep: string[]
) {
  return keepOnlySheetsVisible(spreadsheetId, sheetNamesToKeep);
}

export function buildSpreadsheetSheetLink(
  spreadsheetId: string,
  sheetId?: number | null
) {
  const baseUrl = getSpreadsheetUrl(spreadsheetId);
  if (sheetId == null) {
    return baseUrl;
  }

  return `${baseUrl}#gid=${sheetId}`;
}
