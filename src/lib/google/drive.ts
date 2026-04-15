import { getDriveClient } from "./auth";
import { Readable } from "stream";
import {
  escapeDriveQueryValue,
  requireDriveFileId,
  requireDriveWebViewLink,
} from "./driveQuery";

export const RAW_PAYLOADS_FOLDER_NAME = ".reca_payloads";

interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
}

type DriveFolderCandidate = {
  id?: string | null;
  name?: string | null;
  createdTime?: string | null;
};

function normalizeGeneratedAt(value: string | Date) {
  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}

function formatBogotaTimestampForFileName(value: string | Date) {
  const generatedAt = normalizeGeneratedAt(value);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(generatedAt);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return [
    `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    `${getPart("hour")}-${getPart("minute")}-${getPart("second")}`,
  ].join("_");
}

/**
 * Obtiene o crea una subcarpeta dentro de un folder de Drive.
 * Retorna el ID de la carpeta.
 */
export async function getOrCreateFolder(
  parentFolderId: string,
  folderName: string
): Promise<string> {
  const drive = getDriveClient();
  const safe = escapeDriveQueryValue(folderName);
  const listMatchingFolders = async () => {
    const response = await drive.files.list({
      q: `name = '${safe}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`,
      fields: "files(id,name,createdTime)",
      orderBy: "createdTime asc,name_natural asc",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    return ((response.data.files ?? []) as DriveFolderCandidate[]).sort((left, right) => {
      const leftTimestamp = Date.parse(left.createdTime ?? "");
      const rightTimestamp = Date.parse(right.createdTime ?? "");
      const normalizedLeft =
        Number.isFinite(leftTimestamp) ? leftTimestamp : Number.MAX_SAFE_INTEGER;
      const normalizedRight =
        Number.isFinite(rightTimestamp) ? rightTimestamp : Number.MAX_SAFE_INTEGER;

      if (normalizedLeft !== normalizedRight) {
        return normalizedLeft - normalizedRight;
      }

      return String(left.id ?? "").localeCompare(String(right.id ?? ""));
    });
  };

  const resolveCanonicalFolderId = (
    folders: DriveFolderCandidate[],
    context: string
  ) =>
    requireDriveFileId(
      folders[0]?.id,
      `${context} carpeta "${folderName}"`
    );

  const existingFolders = await listMatchingFolders();
  if (existingFolders.length > 0) {
    return resolveCanonicalFolderId(existingFolders, "buscar");
  }

  let createdFolderId: string;
  try {
    const created = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
      fields: "id,createdTime",
      supportsAllDrives: true,
    });

    createdFolderId = requireDriveFileId(
      created.data.id,
      `crear carpeta "${folderName}"`
    );
  } catch (error) {
    const foldersAfterFailedCreate = await listMatchingFolders();
    if (foldersAfterFailedCreate.length > 0) {
      return resolveCanonicalFolderId(foldersAfterFailedCreate, "resolver");
    }

    throw error;
  }

  const foldersAfterCreate = await listMatchingFolders();
  if (foldersAfterCreate.length > 0) {
    return resolveCanonicalFolderId(foldersAfterCreate, "resolver");
  }

  return createdFolderId;
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
): Promise<DriveUploadResult> {
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
    fileId: requireDriveFileId(uploaded.data.id, `subir PDF "${fileName}"`),
    webViewLink: requireDriveWebViewLink(
      uploaded.data.webViewLink,
      `subir PDF "${fileName}"`
    ),
  };
}

export function buildRawPayloadFileName(
  generatedAt: string | Date,
  formId: string,
  registroId: string
) {
  const timestamp = formatBogotaTimestampForFileName(generatedAt);
  const safeFormId = sanitizeFileName(formId).replace(/\s+/g, "_");
  return `${timestamp}_${safeFormId}_${registroId}.json`;
}

export async function uploadJsonArtifact(
  jsonValue: unknown,
  fileName: string,
  folderId: string
): Promise<DriveUploadResult> {
  const drive = getDriveClient();
  const jsonBuffer = Buffer.from(JSON.stringify(jsonValue, null, 2), "utf8");
  const stream = Readable.from(jsonBuffer);

  const uploaded = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/json",
      parents: [folderId],
    },
    media: {
      mimeType: "application/json",
      body: stream,
    },
    fields: "id,webViewLink",
    supportsAllDrives: true,
  });

  return {
    fileId: requireDriveFileId(
      uploaded.data.id,
      `subir JSON "${fileName}"`
    ),
    webViewLink: requireDriveWebViewLink(
      uploaded.data.webViewLink,
      `subir JSON "${fileName}"`
    ),
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
