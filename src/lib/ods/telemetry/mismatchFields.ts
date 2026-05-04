import type { OdsTelemetryJsonObject, OdsTelemetryJsonValue } from "./types";

export const ODS_TELEMETRY_IGNORED_MISMATCH_FIELDS = [
  "confidence",
  "rationale",
  "rank",
  "score",
] as const;

const IGNORED_FIELDS = new Set<string>(ODS_TELEMETRY_IGNORED_MISMATCH_FIELDS);
const DECIMAL_EPSILON = 0.01;

function isJsonObject(value: unknown): value is OdsTelemetryJsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringifyScalar(value: OdsTelemetryJsonValue | undefined): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value).replace(/,/g, ", ").replace(/:/g, ": ");
}

function canonicalText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizedText(value: OdsTelemetryJsonValue | undefined): string {
  const raw = stringifyScalar(value);
  if (raw.includes(";")) {
    return raw
      .split(";")
      .map(canonicalText)
      .filter(Boolean)
      .sort()
      .join(";");
  }

  return canonicalText(raw);
}

function numericValue(value: OdsTelemetryJsonValue | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(",", ".");
  if (!/^-?[0-9]+(?:\.[0-9]+)?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function areTelemetryValuesEqual(
  motorValue: OdsTelemetryJsonValue | undefined,
  finalValue: OdsTelemetryJsonValue | undefined
) {
  const motorNumeric = numericValue(motorValue);
  const finalNumeric = numericValue(finalValue);

  if (motorNumeric != null && finalNumeric != null) {
    return Math.abs(motorNumeric - finalNumeric) <= DECIMAL_EPSILON;
  }

  return normalizedText(motorValue) === normalizedText(finalValue);
}

/**
 * Preview/local validator for ODS telemetry mismatches.
 *
 * SQL is the persistence source of truth: `ods_motor_telemetria_finalize`
 * calculates and stores `mismatch_fields` in the database. Keep this TS mirror
 * in parity with the SQL helper and use the integration parity fixtures to
 * catch drift.
 */
export function calculateTelemetryMismatchFields(
  motorSuggestion: OdsTelemetryJsonObject,
  finalValue: OdsTelemetryJsonObject
) {
  if (!isJsonObject(motorSuggestion)) {
    return [];
  }

  return Object.keys(motorSuggestion)
    .filter((key) => !IGNORED_FIELDS.has(key))
    .sort()
    .filter((key) => !areTelemetryValuesEqual(motorSuggestion[key], finalValue[key]));
}
