import {
  normalizeCondicionesVacanteCatalogKey,
  type CondicionesVacanteCatalogs,
} from "@/lib/condicionesVacante";
import { getSheetsClient } from "@/lib/google/auth";

export const CONDICIONES_VACANTE_DISABILITY_CATALOG_RANGE =
  "'Caracterización'!A52:B73";

type CondicionesVacanteCatalogSheetsClient = ReturnType<typeof getSheetsClient>;

function cleanCatalogText(value: unknown) {
  return String(value ?? "").trim();
}

export function buildCondicionesVacanteCatalogs(
  rows: readonly (readonly unknown[])[]
): CondicionesVacanteCatalogs {
  const disabilityDescriptions: Record<string, string> = {};
  const disabilityOptions: string[] = [];
  const visibleOptionKeys = new Set<string>();

  for (const row of rows) {
    const discapacidad = cleanCatalogText(row[0]);
    const descripcion = cleanCatalogText(row[1]);
    const normalizedKey = normalizeCondicionesVacanteCatalogKey(discapacidad);

    if (!normalizedKey || !descripcion) {
      continue;
    }

    disabilityDescriptions[normalizedKey] = descripcion;
    if (discapacidad && !visibleOptionKeys.has(normalizedKey)) {
      visibleOptionKeys.add(normalizedKey);
      disabilityOptions.push(discapacidad);
    }
  }

  return { disabilityDescriptions, disabilityOptions };
}

export async function getCondicionesVacanteCatalogs(options: {
  spreadsheetId: string;
  sheets?: CondicionesVacanteCatalogSheetsClient;
}) {
  const sheets = options.sheets ?? getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: options.spreadsheetId,
    range: CONDICIONES_VACANTE_DISABILITY_CATALOG_RANGE,
  });

  return buildCondicionesVacanteCatalogs(response.data.values ?? []);
}
