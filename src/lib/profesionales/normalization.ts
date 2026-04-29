export const RECA_EMAIL_DOMAIN = "recacolombia.org";
export const PROFESIONAL_PROGRAM_OPTIONS = ["Inclusión Laboral"] as const;

const ZERO_WIDTH_CHARACTERS = /[\u200B-\u200D\uFEFF]/g;
const WHITESPACE_RUN = /[\s\u00A0]+/gu;
const CONNECTORS = new Set(["de", "del", "la", "las", "los", "y"]);

function normalizeSpacing(value: string) {
  return value
    .replace(ZERO_WIDTH_CHARACTERS, "")
    .replace(WHITESPACE_RUN, " ")
    .trim();
}

function titleWord(word: string, index: number) {
  const lower = word.toLocaleLowerCase("es-CO");
  if (index > 0 && CONNECTORS.has(lower)) {
    return lower;
  }

  const [first = "", ...rest] = [...lower];
  return `${first.toLocaleUpperCase("es-CO")}${rest.join("")}`;
}

export function normalizeProfesionalName(value: unknown) {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const normalized = normalizeSpacing(value);
  if (!normalized) {
    return null;
  }

  return normalized.split(" ").map(titleWord).join(" ");
}

export function countProfesionalNameWords(value: string | null | undefined) {
  return value ? value.split(" ").filter(Boolean).length : 0;
}

function stripLoginCharacters(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[ñÑ]/g, "n")
    .toLocaleLowerCase("es-CO")
    .replace(/[^a-z0-9]/g, "");
}

export function buildUsuarioLoginBase(nombreProfesional: string) {
  const words = nombreProfesional.split(" ").filter(Boolean);
  const first = stripLoginCharacters(words[0] ?? "").slice(0, 3);
  const last = stripLoginCharacters(words[words.length - 1] ?? "").slice(0, 3);
  return `${first}${last}`;
}

export function dedupeUsuarioLogin(base: string, existingValues: string[]) {
  const used = new Set(existingValues.map((value) => value.toLocaleLowerCase("es-CO")));
  if (!used.has(base)) {
    return base;
  }

  let suffix = 2;
  while (used.has(`${base}${suffix}`)) {
    suffix += 1;
  }
  return `${base}${suffix}`;
}

export function normalizeProfesionalEmail(value: unknown) {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = normalizeSpacing(value).toLocaleLowerCase("es-CO");
  if (!normalized) {
    return null;
  }

  if (normalized.includes("@")) {
    return normalized;
  }

  return `${normalized}@${RECA_EMAIL_DOMAIN}`;
}

export function getRecaEmailLocalPart(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const normalized = value.toLocaleLowerCase("es-CO");
  const suffix = `@${RECA_EMAIL_DOMAIN}`;
  return normalized.endsWith(suffix) ? normalized.slice(0, -suffix.length) : value;
}

export function isRecaEmail(value: string | null | undefined) {
  return Boolean(value?.toLocaleLowerCase("es-CO").endsWith(`@${RECA_EMAIL_DOMAIN}`));
}

export function normalizeProfesionalProgram(value: unknown) {
  if (value === "" || value === null || typeof value === "undefined") {
    return "Inclusión Laboral";
  }

  if (typeof value !== "string") {
    return value;
  }

  const key = normalizeSpacing(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO");
  return key === "inclusion laboral" ? "Inclusión Laboral" : normalizeSpacing(value);
}
