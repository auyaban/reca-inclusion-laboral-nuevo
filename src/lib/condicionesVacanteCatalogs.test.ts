import { describe, expect, it, vi } from "vitest";
import {
  buildCondicionesVacanteCatalogs,
  CONDICIONES_VACANTE_DISABILITY_CATALOG_RANGE,
  getCondicionesVacanteCatalogs,
} from "@/lib/condicionesVacanteCatalogs";

describe("condicionesVacanteCatalogs", () => {
  it("builds a normalized catalog without duplicating visible options", () => {
    const catalog = buildCondicionesVacanteCatalogs([
      [" DISCAPACIDAD AUDITIVA ", " Ajuste 1 "],
      ["Discapacidad auditiva", "Ajuste 2"],
      ["", "Sin clave"],
      ["Visual", ""],
    ]);

    expect(catalog).toEqual({
      disabilityDescriptions: {
        "discapacidad auditiva": "Ajuste 2",
      },
      disabilityOptions: ["DISCAPACIDAD AUDITIVA"],
    });
  });

  it("loads rows from Sheets and reuses the shared parser", async () => {
    const getMock = vi.fn().mockResolvedValue({
      data: {
        values: [["Visual", "Apoyo visual"]],
      },
    });

    const catalogs = await getCondicionesVacanteCatalogs({
      spreadsheetId: "sheet-1",
      sheets: {
        spreadsheets: {
          values: {
            get: getMock,
          },
        },
      } as never,
    });

    expect(getMock).toHaveBeenCalledWith({
      spreadsheetId: "sheet-1",
      range: CONDICIONES_VACANTE_DISABILITY_CATALOG_RANGE,
    });
    expect(catalogs).toEqual({
      disabilityDescriptions: {
        visual: "Apoyo visual",
      },
      disabilityOptions: ["Visual"],
    });
  });
});
