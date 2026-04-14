import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

function parseGoogleServiceAccount(raw: string) {
  try {
    const credentials = JSON.parse(raw);

    if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) {
      throw new Error("El valor no describe un objeto JSON.");
    }

    return credentials;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `La credencial de Google no contiene un JSON valido. Verifica que el service account este completo y en una sola linea. Detalle: ${detail}`
    );
  }
}

function readGoogleServiceAccountFromFile(filePath: string) {
  const resolvedPath = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    filePath
  );

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_FILE apunta a un archivo inexistente: ${resolvedPath}`
    );
  }

  try {
    return fs.readFileSync(resolvedPath, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `No se pudo leer GOOGLE_SERVICE_ACCOUNT_FILE en ${resolvedPath}. Detalle: ${detail}`
    );
  }
}

/**
 * Retorna un cliente autenticado con la service account.
 * Soporta tanto GOOGLE_SERVICE_ACCOUNT_JSON (JSON stringificado)
 * como GOOGLE_SERVICE_ACCOUNT_FILE apuntando a un JSON local.
 */
export function getGoogleAuth() {
  const raw =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ||
    (process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim()
      ? readGoogleServiceAccountFromFile(process.env.GOOGLE_SERVICE_ACCOUNT_FILE)
      : null);

  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_SERVICE_ACCOUNT_FILE no esta configurado"
    );
  }

  const credentials = parseGoogleServiceAccount(raw);
  return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
}

export function getDriveClient() {
  const auth = getGoogleAuth();
  return google.drive({ version: "v3", auth });
}

export function getSheetsClient() {
  const auth = getGoogleAuth();
  return google.sheets({ version: "v4", auth });
}
