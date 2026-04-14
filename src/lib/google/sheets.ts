import type { sheets_v4 } from "googleapis";
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

export interface CheckboxValidationConfig {
  sheetName: string;
  cells: string[];
}

export type AutoResizeExcludedRows = Record<string, number[]>;

export interface FormSheetMutation {
  writes: CellWrite[];
  rowInsertions?: RowInsertion[];
  checkboxValidations?: CheckboxValidationConfig[];
  autoResizeExcludedRows?: AutoResizeExcludedRows;
}

export interface SheetVisibilityState {
  sheetId: number;
  title: string;
  hidden?: boolean;
}

interface AutoResizeRowGroup {
  sheetName: string;
  startRow: number; // 1-based
  endRow: number; // 1-based inclusive
}

interface FormSheetMutationDeps {
  insertRows: typeof insertRows;
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
        range: write.range,
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

async function getSheetIds(spreadsheetId: string, sheetNames: string[]) {
  const uniqueNames = Array.from(new Set(sheetNames.filter(Boolean)));
  const sheetIds = new Map<string, number>();

  if (uniqueNames.length === 0) {
    return sheetIds;
  }

  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });

  for (const name of uniqueNames) {
    const tab = meta.data.sheets?.find((sheet) => sheet.properties?.title === name);
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
    rowInsertions = [],
    checkboxValidations = [],
    autoResizeExcludedRows = {},
  }: FormSheetMutation,
  options: FormSheetMutationOptions = {}
) {
  const { onStep, ...overrides } = options;
  const deps: FormSheetMutationDeps = {
    insertRows,
    batchWriteCells,
    setCheckboxValidation,
    autoResizeWrittenRows,
    ...overrides,
  };

  for (const insertion of rowInsertions) {
    await deps.insertRows(
      spreadsheetId,
      insertion.sheetName,
      insertion.insertAtRow,
      insertion.count,
      insertion.templateRow
    );
  }
  if (rowInsertions.length > 0) {
    onStep?.("mutation.insert_rows");
  }

  await deps.batchWriteCells(spreadsheetId, writes);
  onStep?.("mutation.write_cells");

  for (const validation of checkboxValidations) {
    await deps.setCheckboxValidation(
      spreadsheetId,
      validation.sheetName,
      validation.cells
    );
  }
  if (checkboxValidations.length > 0) {
    onStep?.("mutation.checkbox_validation");
  }

  await deps.autoResizeWrittenRows(spreadsheetId, writes, autoResizeExcludedRows);
  onStep?.("mutation.auto_resize");
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
  for (const sheet of sheets) {
    if (keep.has(sheet.title)) {
      keptSheetIds.set(sheet.title, sheet.sheetId);
    }
  }

  if (keptSheetIds.size === 0) {
    throw new Error(
      `No existe ninguna hoja visible solicitada en el spreadsheet destino: ${Array.from(
        keep
      ).join(", ")}`
    );
  }

  const requests: sheets_v4.Schema$Request[] = [];

  for (const sheet of sheets) {
    const shouldKeep = keptSheetIds.has(sheet.title);
    const isHidden = Boolean(sheet.hidden);

    if (shouldKeep && isHidden) {
      requests.push({
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
      requests.push({
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
    requests,
    keptSheetIds,
  };
}

export async function hideSheets(
  spreadsheetId: string,
  sheetNamesToKeep: string[]
) {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  const hasSheetVisibilityProperties = (
    props: sheets_v4.Schema$Sheet["properties"] | null | undefined
  ): props is SpreadsheetSheetProperties =>
    Boolean(props?.sheetId != null && props?.title);
  const allSheets: SheetVisibilityState[] = (meta.data.sheets ?? [])
    .map((sheet) => sheet.properties)
    .filter(hasSheetVisibilityProperties)
    .map((props) => ({
      sheetId: props.sheetId!,
      title: String(props.title ?? "").trim(),
      hidden: Boolean(props.hidden),
    }));

  const plan = buildSheetVisibilityPlan(allSheets, sheetNamesToKeep);
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
