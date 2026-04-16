export function toDecimalSheetValue(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  const normalized = raw.replace(",", ".").replace(/[^\d.]/g, "");
  if (!normalized) {
    return raw;
  }

  const [integerPart, ...decimalParts] = normalized.split(".");
  const compact =
    decimalParts.length > 0 ? `${integerPart}.${decimalParts.join("")}` : integerPart;
  const numericValue = Number(compact);

  return Number.isFinite(numericValue) ? numericValue : raw;
}
