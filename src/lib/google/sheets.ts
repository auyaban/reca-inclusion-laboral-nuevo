import { getDriveClient, getSheetsClient } from "./auth";

export interface CellWrite {
  range: string; // e.g. "'1. PRESENTACIÓN DEL PROGRAMA IL'!D7"
  value: string | number | boolean;
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
    fileId: copied.data.id!,
    webViewLink: copied.data.webViewLink!,
  };
}

/**
 * Escribe múltiples celdas en un spreadsheet (batch update).
 */
export async function batchWriteCells(
  spreadsheetId: string,
  writes: CellWrite[]
): Promise<void> {
  if (writes.length === 0) return;
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: writes.map((w) => ({
        range: w.range,
        values: [[w.value]],
      })),
    },
  });
}

/**
 * Obtiene el sheetId numérico de una pestaña por su nombre.
 */
async function getSheetId(
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tab = meta.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  if (!tab || tab.properties?.sheetId == null) {
    throw new Error(`Pestaña "${sheetName}" no encontrada en el spreadsheet`);
  }
  return tab.properties.sheetId;
}

/**
 * Inserta filas vacías en una pestaña a partir de `startRow` (0-based).
 * Se usa cuando hay más asistentes que los pre-existentes en la plantilla.
 */
export async function insertRows(
  spreadsheetId: string,
  sheetName: string,
  startRow: number, // 0-based index
  count: number
): Promise<void> {
  if (count <= 0) return;
  const sheets = getSheetsClient();
  const sheetId = await getSheetId(spreadsheetId, sheetName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
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
  a1Notations: string[] // e.g. ["U60", "U61", ...]
): Promise<void> {
  if (a1Notations.length === 0) return;
  const sheets = getSheetsClient();
  const sheetId = await getSheetId(spreadsheetId, sheetName);

  function a1ToGridRange(a1: string) {
    const col = a1.replace(/[0-9]/g, "");
    const row = parseInt(a1.replace(/[^0-9]/g, ""), 10) - 1;
    const colIndex = col
      .toUpperCase()
      .split("")
      .reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 64, 0) - 1;
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
