export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function coerceTrimmedText(value: unknown) {
  return String(value ?? "").trim();
}

export function stringTrimmedText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
