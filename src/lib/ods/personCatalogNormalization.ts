import { DISCAPACIDADES, GENEROS } from "@/lib/ods/catalogs";

function normalizeCatalogKey(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .trim()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLocaleLowerCase("es-CO")
    .trim();
}

function findCatalogValue<T extends readonly string[]>(
  catalog: T,
  value: unknown
): T[number] | "" {
  const key = normalizeCatalogKey(value);
  if (!key) {
    return "";
  }

  return catalog.find((option) => normalizeCatalogKey(option) === key) ?? "";
}

export function normalizeOdsDiscapacidadUsuario(value: unknown) {
  const key = normalizeCatalogKey(value);
  if (!key) {
    return "";
  }

  const direct = findCatalogValue(DISCAPACIDADES, value);
  if (direct) {
    return direct;
  }

  if (key.includes("no aplica")) {
    return "N/A";
  }

  if (key.includes("multiple")) {
    return "Múltiple";
  }

  if (key.includes("visual")) {
    return "Visual";
  }

  if (key.includes("auditiva") || key.includes("hipoacusia")) {
    return "Auditiva";
  }

  if (key.includes("fisica")) {
    return "Física";
  }

  if (key.includes("psicosocial")) {
    return "Psicosocial";
  }

  if (
    key.includes("intelectual") ||
    key.includes("autismo") ||
    key.includes("autista")
  ) {
    return "Intelectual";
  }

  return "";
}

export function normalizeOdsGeneroUsuario(value: unknown) {
  const key = normalizeCatalogKey(value);
  if (!key) {
    return "";
  }

  const direct = findCatalogValue(GENEROS, value);
  if (direct) {
    return direct;
  }

  if (key === "masculino") {
    return "Hombre";
  }

  if (key === "femenino") {
    return "Mujer";
  }

  if (key === "no binario" || key === "no binaria") {
    return "Otro";
  }

  return "";
}
