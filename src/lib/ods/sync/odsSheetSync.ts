// Port directo de `app/google_drive_sync.py::_sync_new_ods_record_once`
// del legacy RECA_ODS. Después de un INSERT exitoso en `ods` (Supabase),
// hace append de la fila en la pestaña ODS_INPUT del spreadsheet mensual
// del Shared Drive.
//
// Ajustes vs legacy:
//   - Sin queue persistente (Vercel serverless no tiene disco). Si falla
//     con error retryable, devolvemos sync_status="warning" y el operador
//     puede re-disparar manualmente desde una UI futura. La ODS queda
//     guardada en Supabase igual.
//   - Skip silencioso (sync_status="disabled") si las env vars no están
//     configuradas, en lugar de error fatal. Permite usar el módulo sin
//     Sheets en preview/dev.

import { getSheetsClient } from "@/lib/google/auth";
import { copyDriveFile, findDriveFileByName } from "@/lib/google/drive";
import {
  ODS_INPUT_HEADERS,
  INPUT_SHEET_ALIASES,
  NORMALIZED_INPUT_HEADERS,
  columnLetter,
  getYearValue,
  normalizeHeader,
  odsInputRowFromRecord,
  resolveMonthlySpreadsheetName,
} from "@/lib/ods/sync/odsSheetLayout";

const SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet";

export type SyncStatus = "ok" | "warning" | "disabled";

export type SyncResult = {
  sync_status: SyncStatus;
  sync_target: string | null;
  spreadsheet_id: string | null;
  sync_error?: string;
};

type Settings = {
  folderId: string;
  templateName: string;
};

function readSettings(): Settings | null {
  const folderId = (process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID || "").trim();
  const templateName = (process.env.GOOGLE_DRIVE_TEMPLATE_SPREADSHEET_NAME || "").trim();
  if (!folderId || !templateName) return null;
  return { folderId, templateName };
}

/**
 * Encuentra la pestaña "input" / "ODS_INPUT" del spreadsheet y valida
 * que sus headers coincidan con ODS_INPUT_HEADERS. Retorna title + ancho.
 */
async function findInputSheet(spreadsheetId: string): Promise<{
  title: string;
  width: number;
}> {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false,
  });
  let inputTitle: string | null = null;
  for (const sheet of meta.data.sheets ?? []) {
    const title = String(sheet.properties?.title ?? "");
    if (INPUT_SHEET_ALIASES.has(normalizeHeader(title))) {
      inputTitle = title;
      break;
    }
  }
  if (!inputTitle) {
    throw new Error(
      `El spreadsheet ${spreadsheetId} no contiene una pestaña 'input' u 'ODS_INPUT'.`
    );
  }
  const headerRows = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${inputTitle}'!1:1`,
  });
  const headers = headerRows.data.values?.[0] ?? [];
  if (headers.length === 0) {
    throw new Error(`La pestaña '${inputTitle}' no tiene encabezados en la fila 1.`);
  }
  const normalized = headers.map((h) => normalizeHeader(h));
  const expected = NORMALIZED_INPUT_HEADERS;
  if (normalized.length !== expected.length || normalized.some((h, i) => h !== expected[i])) {
    throw new Error(`Encabezados inesperados en la pestaña '${inputTitle}'.`);
  }
  return { title: inputTitle, width: headers.length };
}

/**
 * Limpia las filas de datos (deja solo la fila 1 con headers). Usado tras
 * crear un spreadsheet nuevo a partir de la plantilla, para no heredar
 * registros del mes anterior.
 */
async function clearInputData(
  spreadsheetId: string,
  sheetTitle: string,
  width: number
): Promise<void> {
  const sheets = getSheetsClient();
  const endCol = columnLetter(width);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetTitle}'!A2:${endCol}`,
  });
}

/**
 * Asegura que exista el spreadsheet mensual: si no existe, lo crea
 * copiando la plantilla y limpiando su data. Retorna el spreadsheetId
 * y la metadata de la pestaña input.
 */
async function ensureMonthlySpreadsheet(
  settings: Settings,
  targetName: string
): Promise<{ spreadsheetId: string; sheetTitle: string; width: number }> {
  const monthly = await findDriveFileByName({
    folderId: settings.folderId,
    name: targetName,
    mimeType: SPREADSHEET_MIME,
  });
  let spreadsheetId: string;
  let created = false;
  if (monthly) {
    spreadsheetId = monthly.id;
  } else {
    const template = await findDriveFileByName({
      folderId: settings.folderId,
      name: settings.templateName,
      mimeType: SPREADSHEET_MIME,
    });
    if (!template) {
      throw new Error(
        `No existe la plantilla '${settings.templateName}' en el folder ${settings.folderId}.`
      );
    }
    const copied = await copyDriveFile({
      sourceFileId: template.id,
      newName: targetName,
      parentFolderId: settings.folderId,
    });
    spreadsheetId = copied.id;
    created = true;
  }
  const sheet = await findInputSheet(spreadsheetId);
  if (created) {
    await clearInputData(spreadsheetId, sheet.title, sheet.width);
  }
  return { spreadsheetId, sheetTitle: sheet.title, width: sheet.width };
}

/**
 * Calcula la siguiente fila vacía después de la última con datos.
 * Lee la columna A para detectar IDs ya escritos (idempotencia).
 */
async function nextAvailableRow(
  spreadsheetId: string,
  sheetTitle: string,
  width: number
): Promise<{ targetRow: number; existingIds: Set<string> }> {
  const sheets = getSheetsClient();
  const endCol = columnLetter(width);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!A2:${endCol}`,
  });
  const rows = res.data.values ?? [];
  const existingIds = new Set<string>();
  let lastNonEmptyIndex = -1;
  rows.forEach((row, idx) => {
    const normalized = (row ?? []).map((v) => String(v ?? "").trim());
    if (normalized.every((v) => !v)) return;
    lastNonEmptyIndex = idx;
    const id = normalized[0];
    if (id) existingIds.add(id);
  });
  const targetRow = 2 + lastNonEmptyIndex + 1;
  return { targetRow, existingIds };
}

/**
 * Clasifica errores de la API de Google. Algunos son retryables (429, 5xx,
 * timeouts) — el legacy los encola para retry posterior. En serverless no
 * tenemos cola persistente, pero distinguimos para devolver el mensaje
 * apropiado al cliente.
 */
function classifyError(error: unknown): { retryable: boolean; message: string } {
  if (!error) return { retryable: false, message: "Error desconocido" };
  const err = error as { code?: number; status?: number; message?: string };
  const status = Number(err.code ?? err.status ?? 0);
  const retryable = status === 0 || status === 408 || status === 429 || status >= 500;
  const message =
    typeof err.message === "string" ? err.message : String(error);
  return { retryable, message };
}

/**
 * Entry point: sincroniza una fila de `ods` (recién insertada en Supabase)
 * a la pestaña ODS_INPUT del spreadsheet mensual correspondiente.
 *
 * No lanza: siempre devuelve un SyncResult. Si la sync falla, el caller
 * puede mostrar el warning al operador sin bloquear el guardado de la ODS.
 */
export async function syncNewOdsRecord(
  odsRow: Record<string, unknown>
): Promise<SyncResult> {
  const settings = readSettings();
  if (!settings) {
    return {
      sync_status: "disabled",
      sync_target: null,
      spreadsheet_id: null,
      sync_error:
        "GOOGLE_DRIVE_SHARED_FOLDER_ID o GOOGLE_DRIVE_TEMPLATE_SPREADSHEET_NAME no estan configurados.",
    };
  }

  const month = Math.trunc(Number(odsRow.mes_servicio) || 0);
  const year = Math.trunc(Number(getYearValue(odsRow)) || 0);
  let targetName: string;
  try {
    targetName = resolveMonthlySpreadsheetName(month, year);
  } catch (error) {
    return {
      sync_status: "warning",
      sync_target: null,
      spreadsheet_id: null,
      sync_error: error instanceof Error ? error.message : String(error),
    };
  }

  const rowId = String(odsRow.id ?? "").trim();
  if (!rowId) {
    return {
      sync_status: "warning",
      sync_target: targetName,
      spreadsheet_id: null,
      sync_error: "La ODS no tiene id para sincronizar con Google Sheets.",
    };
  }

  try {
    const { spreadsheetId, sheetTitle, width } = await ensureMonthlySpreadsheet(
      settings,
      targetName
    );
    const { targetRow, existingIds } = await nextAvailableRow(
      spreadsheetId,
      sheetTitle,
      width
    );
    if (existingIds.has(rowId)) {
      // Idempotente: el id ya está en la hoja, no escribimos.
      return {
        sync_status: "ok",
        sync_target: targetName,
        spreadsheet_id: spreadsheetId,
      };
    }
    const sheets = getSheetsClient();
    const rowValues = odsInputRowFromRecord(odsRow);
    const endCol = columnLetter(ODS_INPUT_HEADERS.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetTitle}'!A${targetRow}:${endCol}${targetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowValues] },
    });
    return {
      sync_status: "ok",
      sync_target: targetName,
      spreadsheet_id: spreadsheetId,
    };
  } catch (error) {
    const { retryable, message } = classifyError(error);
    console.error("[odsSheetSync] sync failed", {
      retryable,
      message,
      targetName,
      rowId,
    });
    return {
      sync_status: "warning",
      sync_target: targetName,
      spreadsheet_id: null,
      sync_error: retryable
        ? `Google API temporalmente no disponible: ${message}`
        : message,
    };
  }
}
