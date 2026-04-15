import {
  normalizeCondicionesVacanteCatalogKey,
  type CondicionesVacanteCatalogs,
} from "@/lib/condicionesVacante";

export const CONDICIONES_VACANTE_DISABILITY_CATALOG_RANGE =
  "'Caracterización'!A52:B73";

function cleanCatalogText(value: unknown) {
  return String(value ?? "").trim();
}

export function buildCondicionesVacanteCatalogs(
  rows: readonly (readonly unknown[])[]
): CondicionesVacanteCatalogs {
  const disabilityDescriptions: Record<string, string> = {};
  const disabilityOptions: string[] = [];

  for (const row of rows) {
    const discapacidad = cleanCatalogText(row[0]);
    const descripcion = cleanCatalogText(row[1]);
    const normalizedKey = normalizeCondicionesVacanteCatalogKey(discapacidad);

    if (!normalizedKey || !descripcion) {
      continue;
    }

    disabilityDescriptions[normalizedKey] = descripcion;
    if (discapacidad && !disabilityOptions.includes(discapacidad)) {
      disabilityOptions.push(discapacidad);
    }
  }

  return { disabilityDescriptions, disabilityOptions };
}
