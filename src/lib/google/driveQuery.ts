export function escapeDriveQueryValue(value: string) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

function requireDriveField(
  value: string | null | undefined,
  fieldName: string,
  context: string
) {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) {
    throw new Error(`Google Drive no devolvió "${fieldName}" al ${context}.`);
  }

  return normalizedValue;
}

export function requireDriveFileId(
  value: string | null | undefined,
  context: string
) {
  return requireDriveField(value, "id", context);
}

export function requireDriveWebViewLink(
  value: string | null | undefined,
  context: string
) {
  return requireDriveField(value, "webViewLink", context);
}
