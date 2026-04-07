import { getDriveClient } from "./auth";
import { Readable } from "stream";

/**
 * Obtiene o crea una subcarpeta dentro de un folder de Drive.
 * Retorna el ID de la carpeta.
 */
export async function getOrCreateFolder(
  parentFolderId: string,
  folderName: string
): Promise<string> {
  const drive = getDriveClient();

  // Buscar si ya existe
  const safe = folderName.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `name = '${safe}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`,
    fields: "files(id,name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Crear si no existe
  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  return created.data.id!;
}

/**
 * Exporta un Google Spreadsheet a PDF y retorna los bytes.
 */
export async function exportSheetToPdf(
  spreadsheetFileId: string
): Promise<Buffer> {
  const drive = getDriveClient();

  const response = await drive.files.export(
    {
      fileId: spreadsheetFileId,
      mimeType: "application/pdf",
    },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Sube un PDF a una carpeta de Drive.
 * Retorna el file_id y webViewLink del PDF subido.
 */
export async function uploadPdf(
  pdfBuffer: Buffer,
  fileName: string,
  folderId: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient();

  const stream = Readable.from(pdfBuffer);

  const uploaded = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/pdf",
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: stream,
    },
    fields: "id,webViewLink",
    supportsAllDrives: true,
  });

  return {
    fileId: uploaded.data.id!,
    webViewLink: uploaded.data.webViewLink!,
  };
}

/**
 * Sanitiza un nombre para usar como nombre de archivo/carpeta en Drive.
 */
export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar tildes
    .replace(/[^a-zA-Z0-9\s\-_.()]/g, "") // Solo chars seguros
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
