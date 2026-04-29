import {
  EMPRESA_CAJA_OPTIONS,
  EMPRESA_ESTADO_OPTIONS,
  EMPRESA_GESTION_OPTIONS,
} from "@/lib/empresas/constants";

// cspell:ignore compenasr

type EmpresaEstado = (typeof EMPRESA_ESTADO_OPTIONS)[number];
type EmpresaCaja = (typeof EMPRESA_CAJA_OPTIONS)[number];
type EmpresaGestion = (typeof EMPRESA_GESTION_OPTIONS)[number];

const ZERO_WIDTH_CHARACTERS = /[\u200B-\u200D\uFEFF]/g;
const WHITESPACE_RUN = /[\s\u00A0]+/gu;
const WORD_PATTERN = /\p{L}[\p{L}\p{M}'’-]*/gu;

function isEmptyValue(value: unknown) {
  return value === "" || value === null || typeof value === "undefined";
}

export function normalizeEmpresaSpacing(value: string) {
  return value
    .replace(ZERO_WIDTH_CHARACTERS, "")
    .replace(WHITESPACE_RUN, " ")
    .trim();
}

function toCatalogKey(value: string) {
  return normalizeEmpresaSpacing(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[_.-]+/g, " ")
    .replace(WHITESPACE_RUN, " ")
    .trim()
    .toLocaleLowerCase("es-CO");
}

export function normalizeEmpresaNullableText(value: unknown) {
  if (isEmptyValue(value)) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = normalizeEmpresaSpacing(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeEmpresaTitleText(value: unknown) {
  const normalized = normalizeEmpresaNullableText(value);
  if (typeof normalized !== "string") {
    return normalized;
  }

  const lower = normalized.toLocaleLowerCase("es-CO");
  return lower.replace(WORD_PATTERN, (word) => {
    const [first = "", ...rest] = [...word];
    return `${first.toLocaleUpperCase("es-CO")}${rest.join("")}`;
  });
}

export function normalizeEmpresaNit(value: unknown) {
  if (isEmptyValue(value)) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = normalizeEmpresaSpacing(value).replace(/[.\s\u00A0]/gu, "");
  return normalized.length > 0 ? normalized : null;
}

export function normalizeEmpresaPhone(value: unknown) {
  if (isEmptyValue(value)) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = normalizeEmpresaSpacing(value).replace(/[\s\u00A0]/gu, "");
  return normalized.length > 0 ? normalized : null;
}

export function normalizeEmpresaPhoneList(value: unknown) {
  if (isEmptyValue(value)) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = value
    .split(";")
    .map((item) => normalizeEmpresaPhone(item) ?? "")
    .join(";");

  return normalized.replaceAll(";", "").length > 0 ? normalized : null;
}

const ESTADO_ALIASES: Record<string, EmpresaEstado> = {
  activa: "Activa",
  activo: "Activa",
  "en proceso": "En Proceso",
  proceso: "En Proceso",
  pausada: "Pausada",
  pausado: "Pausada",
  cerrada: "Cerrada",
  cerrado: "Cerrada",
  inactiva: "Inactiva",
  inactivo: "Inactiva",
};

const CAJA_ALIASES: Record<string, EmpresaCaja> = {
  compensar: "Compensar",
  compenasr: "Compensar",
  "no compensar": "No Compensar",
};

const GESTION_ALIASES: Record<string, EmpresaGestion> = {
  reca: "RECA",
  compensar: "COMPENSAR",
};

const CITY_ALIASES: Record<string, string> = {
  bojaca: "Bojacá",
  bogota: "Bogotá",
  cajica: "Cajicá",
  chia: "Chía",
  facatativa: "Facatativá",
  fontibon: "Fontibón",
  fusagasuga: "Fusagasugá",
  gachancipa: "Gachancipá",
  sesquile: "Sesquilé",
  sopo: "Sopó",
  tocancipa: "Tocancipá",
  zipaquira: "Zipaquirá",
};

function normalizeCatalogValue<T extends string>(
  value: unknown,
  aliases: Record<string, T>
) {
  if (isEmptyValue(value)) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  const key = toCatalogKey(value);
  return aliases[key] ?? normalizeEmpresaSpacing(value);
}

export function normalizeEmpresaEstado(value: unknown) {
  return normalizeCatalogValue(value, ESTADO_ALIASES);
}

export function normalizeEmpresaCaja(value: unknown) {
  if (isEmptyValue(value)) {
    return null;
  }

  return normalizeCatalogValue(value, CAJA_ALIASES);
}

export function normalizeEmpresaGestion(value: unknown) {
  return normalizeCatalogValue(value, GESTION_ALIASES);
}

export function normalizeEmpresaCity(value: unknown) {
  const normalized = normalizeEmpresaTitleText(value);
  if (typeof normalized !== "string") {
    return normalized;
  }

  return CITY_ALIASES[toCatalogKey(normalized)] ?? normalized;
}
