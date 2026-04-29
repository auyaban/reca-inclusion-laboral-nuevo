export type Asistente = {
  nombre: string;
  cargo: string;
};

export type AsistentesMode =
  | "reca_plus_agency_advisor"
  | "reca_plus_generic_attendees";

export type AsistenteLike = {
  nombre?: unknown;
  cargo?: unknown;
};

export const ASESOR_AGENCIA_CARGO = "Asesor Agencia";

function coerceAsistente(asistente: unknown): Asistente {
  if (!asistente || typeof asistente !== "object") {
    return { nombre: "", cargo: "" };
  }

  const candidate = asistente as Record<string, unknown>;

  return {
    nombre: typeof candidate.nombre === "string" ? candidate.nombre : "",
    cargo: typeof candidate.cargo === "string" ? candidate.cargo : "",
  };
}

function getTrailingAsistenteForMode(mode: AsistentesMode): Asistente {
  return mode === "reca_plus_agency_advisor"
    ? { nombre: "", cargo: ASESOR_AGENCIA_CARGO }
    : { nombre: "", cargo: "" };
}

export function getDefaultAsistentesForMode({
  mode,
  profesionalAsignado,
}: {
  mode: AsistentesMode;
  profesionalAsignado?: string | null;
}) {
  return [
    { nombre: profesionalAsignado ?? "", cargo: "" },
    getTrailingAsistenteForMode(mode),
  ];
}

export function normalizeRestoredAsistentesForMode(
  asistentes: unknown,
  options: {
    mode: AsistentesMode;
    profesionalAsignado?: string | null;
  }
) {
  const defaults = getDefaultAsistentesForMode(options);

  if (!Array.isArray(asistentes)) {
    return defaults;
  }

  const normalized = asistentes
    .filter((asistente) => Boolean(asistente) && typeof asistente === "object")
    .map((asistente) => coerceAsistente(asistente));

  if (normalized.length === 0) {
    return defaults;
  }

  if (normalized.length === 1) {
    return [normalized[0], getTrailingAsistenteForMode(options.mode)];
  }

  return normalized;
}

export function expandAsistentesForExpectedCount(
  asistentes: unknown,
  options: {
    mode: AsistentesMode;
    profesionalAsignado?: string | null;
    expectedCount?: number | null;
  }
) {
  const normalized = normalizeRestoredAsistentesForMode(asistentes, options);
  const expectedCount =
    typeof options.expectedCount === "number" &&
    Number.isFinite(options.expectedCount)
      ? Math.max(0, Math.floor(options.expectedCount))
      : 0;
  const targetCount = Math.max(normalized.length, expectedCount);

  if (targetCount <= normalized.length) {
    return normalized;
  }

  const blankRows = Array.from(
    { length: targetCount - normalized.length },
    () => ({ nombre: "", cargo: "" })
  );

  if (options.mode !== "reca_plus_agency_advisor" || normalized.length === 0) {
    return [...normalized, ...blankRows];
  }

  const advisorRow = normalized[normalized.length - 1] ?? {
    nombre: "",
    cargo: ASESOR_AGENCIA_CARGO,
  };

  return [...normalized.slice(0, -1), ...blankRows, advisorRow];
}

export function normalizeAsistenteLike(asistente: AsistenteLike): Asistente {
  return {
    nombre: typeof asistente.nombre === "string" ? asistente.nombre.trim() : "",
    cargo: typeof asistente.cargo === "string" ? asistente.cargo.trim() : "",
  };
}

export function isMeaningfulAsistente(asistente: AsistenteLike) {
  const normalized = normalizeAsistenteLike(asistente);
  return Boolean(normalized.nombre || normalized.cargo);
}

export function isCompleteAsistente(asistente: AsistenteLike) {
  const normalized = normalizeAsistenteLike(asistente);
  return Boolean(normalized.nombre && normalized.cargo);
}

export function getMeaningfulAsistentes<T extends AsistenteLike>(
  asistentes: readonly T[]
) {
  return asistentes
    .map((asistente) => normalizeAsistenteLike(asistente))
    .filter((asistente) => isMeaningfulAsistente(asistente));
}

export function normalizePersonName(value: string) {
  return value
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      const [first = "", ...rest] = part;
      return `${first.toLocaleUpperCase("es-CO")}${rest.join("").toLocaleLowerCase("es-CO")}`;
    })
    .join(" ");
}

// Lowercases, strips diacritics and collapses whitespace so name comparisons
// match across formatting variants (e.g. "Cristián Ruge" vs "CRISTIAN RUGE").
export function normalizePersonNameForLookup(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("es-CO");
}

export function normalizeAsesorAgenciaAsistentes<T extends Asistente>(asistentes: T[]) {
  return asistentes.map((asistente, index) => {
    const isAsesorAgencia =
      index === asistentes.length - 1 ||
      asistente.cargo.trim().toLocaleLowerCase("es-CO") ===
        ASESOR_AGENCIA_CARGO.toLocaleLowerCase("es-CO");

    if (!isAsesorAgencia) {
      return asistente;
    }

    return {
      ...asistente,
      nombre: normalizePersonName(asistente.nombre),
      cargo: asistente.cargo.trim() || ASESOR_AGENCIA_CARGO,
    };
  });
}

export function normalizePersistedAsistentesForMode(
  asistentes: unknown,
  options: {
    mode: AsistentesMode;
    profesionalAsignado?: string | null;
  }
) {
  const normalized = normalizeRestoredAsistentesForMode(asistentes, options);

  if (options.mode === "reca_plus_agency_advisor") {
    return normalizeAsesorAgenciaAsistentes(normalized);
  }

  return normalized;
}
