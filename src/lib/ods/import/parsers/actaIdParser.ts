// ACTA IDs generados por el footer web actual tienen 8 caracteres alfanumericos.
const ACTA_ID_LENGTH = 8;
const ACTA_ID_REGEX = new RegExp(`ACTA\\s*ID\\s*:?\\s*([A-Z0-9]{${ACTA_ID_LENGTH}})`, "i");
const RAW_ACTA_ID_REGEX = new RegExp(`^[A-Z0-9]{${ACTA_ID_LENGTH}}$`, "i");
const GOOGLE_ID_REGEX = /^[A-Za-z0-9_-]{8,}$/;

export type GoogleArtifactReference = {
  kind: "google_drive_file" | "google_sheet";
  artifactId: string;
  originalUrl: string;
};

function normalizeActaId(value: string | null | undefined) {
  const trimmed = (value || "").trim();
  return RAW_ACTA_ID_REGEX.test(trimmed) ? trimmed.toUpperCase() : "";
}

export function extractActaIdFromText(text: string): string {
  const match = (text || "").match(ACTA_ID_REGEX);
  return normalizeActaId(match?.[1]);
}

export function extractActaIdFromInput(input: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";

  const raw = normalizeActaId(trimmed);
  if (raw) return raw;

  const labeled = extractActaIdFromText(trimmed);
  if (labeled) return labeled;

  try {
    const url = new URL(trimmed);
    for (const key of ["acta_ref", "actaRef", "actaId"]) {
      const actaId = normalizeActaId(url.searchParams.get(key));
      if (actaId) return actaId;
    }
  } catch {
    return "";
  }

  return "";
}

function cleanGoogleId(value: string | undefined) {
  const trimmed = (value || "").trim();
  return GOOGLE_ID_REGEX.test(trimmed) ? trimmed : "";
}

export function extractGoogleArtifactReference(input: string): GoogleArtifactReference | null {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (host === "drive.google.com" || host.endsWith(".drive.google.com")) {
    const fileIndex = pathParts.findIndex((part) => part === "d");
    const fileId =
      fileIndex >= 0
        ? cleanGoogleId(pathParts[fileIndex + 1])
        : cleanGoogleId(url.searchParams.get("id") || undefined);
    return fileId ? { kind: "google_drive_file", artifactId: fileId, originalUrl: trimmed } : null;
  }

  if (host === "docs.google.com" || host.endsWith(".docs.google.com")) {
    const spreadsheetIndex = pathParts.findIndex((part) => part === "d");
    const spreadsheetId = cleanGoogleId(pathParts[spreadsheetIndex + 1]);
    if (pathParts[0] === "spreadsheets" && spreadsheetId) {
      return { kind: "google_sheet", artifactId: spreadsheetId, originalUrl: trimmed };
    }
  }

  return null;
}
