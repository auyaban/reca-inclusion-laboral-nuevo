// Local compatibility layer for catalog text drift coming from the declarative source.
// This keeps the web contract readable without pretending the upstream catalog is fixed.
export const EVALUACION_MOJIBAKE_REPLACEMENTS: ReadonlyArray<
  readonly [string, string]
> = [
  ["Â¿", "¿"],
  ["Ã¡", "á"],
  ["Ã©", "é"],
  ["Ã­", "í"],
  ["Ã³", "ó"],
  ["Ãº", "ú"],
  ["Ã", "Á"],
  ["Ã‰", "É"],
  ["Ã", "Í"],
  ["Ã“", "Ó"],
  ["Ãš", "Ú"],
  ["Ã±", "ñ"],
  ["Ã‘", "Ñ"],
  ["Ã¼", "ü"],
  ["Ãœ", "Ü"],
  ["Selecci?n", "Selección"],
  ["Descripci?n", "Descripción"],
  ["CÃ³digos", "Códigos"],
  ["FÃ­sica", "Física"],
  ["arquitectÃ³nicas", "arquitectónicas"],
  ["movilizaciÃ³n", "movilización"],
  ["condiciÃ³n", "condición"],
  ["EVALUACI?N", "EVALUACIÓN"],
  ["pestana", "pestaña"],
] as const;

export function normalizeEvaluacionCatalogText<T>(value: T): T {
  if (typeof value === "string") {
    let normalized = value as string;

    EVALUACION_MOJIBAKE_REPLACEMENTS.forEach(([source, target]) => {
      normalized = normalized.split(source).join(target);
    });

    return normalized as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeEvaluacionCatalogText(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        normalizeEvaluacionCatalogText(nestedValue),
      ])
    ) as T;
  }

  return value;
}
