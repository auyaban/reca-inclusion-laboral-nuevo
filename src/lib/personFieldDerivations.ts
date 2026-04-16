function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDateOnlyParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return { year, month, day };
}

export function deriveAgeFromBirthDate(
  birthDate: string,
  referenceDate = new Date()
) {
  const normalizedBirthDate = normalizeText(birthDate);
  const birth = parseDateOnlyParts(normalizedBirthDate);
  if (!birth) {
    return "";
  }

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;
  const day = referenceDate.getDate();

  let age = year - birth.year;
  if (month < birth.month || (month === birth.month && day < birth.day)) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "";
}

export function normalizeContractDateText(value: unknown) {
  return normalizeText(value);
}

export function normalizeNullableContractDateText(value: unknown) {
  const normalized = normalizeContractDateText(value);
  return normalized || null;
}

export function normalizeSeleccionTipoPension(
  cuentaPension: string,
  tipoPension: string
) {
  return cuentaPension.trim().toLowerCase() === "no" ? "No aplica" : tipoPension;
}
