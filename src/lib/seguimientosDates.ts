const CANONICAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function isValidDateParts(year: number, month: number, day: number) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function formatCanonicalDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatLocalDate(year: number, month: number, day: number) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).padStart(4, "0")}`;
}

function extractNormalizedDateParts(value: string) {
  const normalized = normalizeSeguimientosDateInput(value);
  if (!normalized) {
    return null;
  }

  const canonicalMatch = normalized.match(CANONICAL_DATE_PATTERN);
  if (!canonicalMatch) {
    return null;
  }

  const year = Number.parseInt(canonicalMatch[1] ?? "", 10);
  const month = Number.parseInt(canonicalMatch[2] ?? "", 10);
  const day = Number.parseInt(canonicalMatch[3] ?? "", 10);

  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return { year, month, day };
}

export function normalizeSeguimientosDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const canonicalMatch = trimmed.match(CANONICAL_DATE_PATTERN);
  if (canonicalMatch) {
    const year = Number.parseInt(canonicalMatch[1] ?? "", 10);
    const month = Number.parseInt(canonicalMatch[2] ?? "", 10);
    const day = Number.parseInt(canonicalMatch[3] ?? "", 10);

    return isValidDateParts(year, month, day)
      ? formatCanonicalDate(year, month, day)
      : null;
  }

  const localMatch = trimmed.match(LOCAL_DATE_PATTERN);
  if (localMatch) {
    const day = Number.parseInt(localMatch[1] ?? "", 10);
    const month = Number.parseInt(localMatch[2] ?? "", 10);
    const year = Number.parseInt(localMatch[3] ?? "", 10);

    return isValidDateParts(year, month, day)
      ? formatCanonicalDate(year, month, day)
      : null;
  }

  return null;
}

export function coerceSeguimientosDateForValidation(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return normalizeSeguimientosDateInput(trimmed) ?? trimmed;
}

export function normalizeSeguimientosDateTextValue(
  value: unknown,
  fallback = ""
) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return normalizeSeguimientosDateInput(trimmed) ?? fallback;
}

export function formatSeguimientosDateForDisplay(
  value: string | null | undefined,
  fallback = ""
) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }

  const parts = extractNormalizedDateParts(trimmed);
  if (!parts) {
    return trimmed;
  }

  return formatLocalDate(parts.year, parts.month, parts.day);
}

export function formatSeguimientosDateForOutput(
  value: string | null | undefined,
  fallback = ""
) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }

  const parts = extractNormalizedDateParts(trimmed);
  if (!parts) {
    return fallback || trimmed;
  }

  return formatLocalDate(parts.year, parts.month, parts.day);
}
