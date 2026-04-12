import { describe, expect, it } from "vitest";
import {
  buildDatedSheetTitle,
  buildInternalTemplateSheetTitle,
  rangeHasValues,
  rewriteFormSheetMutation,
} from "@/lib/google/companySpreadsheet";

describe("buildDatedSheetTitle", () => {
  it("agrega fecha y deduplica con contador cuando ya existe", () => {
    const currentDate = new Date("2026-04-11T15:00:00.000Z");

    expect(
      buildDatedSheetTitle(
        "1. PRESENTACION DEL PROGRAMA IL",
        ["1. PRESENTACION DEL PROGRAMA IL - 2026-04-11"],
        currentDate
      )
    ).toBe("1. PRESENTACION DEL PROGRAMA IL - 2026-04-11 (2)");
  });

  it("lanza un error claro cuando agota el limite de colisiones", () => {
    const currentDate = new Date("2026-04-11T15:00:00.000Z");
    const existingTitles = Array.from({ length: 10_000 }, (_, index) =>
      index === 0
        ? "1. PRESENTACION DEL PROGRAMA IL - 2026-04-11"
        : `1. PRESENTACION DEL PROGRAMA IL - 2026-04-11 (${index + 1})`
    );

    expect(() =>
      buildDatedSheetTitle(
        "1. PRESENTACION DEL PROGRAMA IL",
        existingTitles,
        currentDate
      )
    ).toThrow(
      'No se pudo generar un nombre unico para la hoja "1. PRESENTACION DEL PROGRAMA IL" tras 10000 intentos.'
    );
  });
});

describe("buildInternalTemplateSheetTitle", () => {
  it("crea un titulo interno estable para la plantilla oculta", () => {
    expect(
      buildInternalTemplateSheetTitle("1. PRESENTACION DEL PROGRAMA IL")
    ).toBe("__RECA_TEMPLATE__ 1. PRESENTACION DEL PROGRAMA IL");
  });

  it("recorta el titulo para respetar el limite de Google Sheets", () => {
    const longTitle = "A".repeat(200);
    expect(buildInternalTemplateSheetTitle(longTitle)).toHaveLength(100);
  });
});

describe("rewriteFormSheetMutation", () => {
  it("reescribe writes, rowInsertions, checkboxes y exclusiones", () => {
    const rewritten = rewriteFormSheetMutation(
      {
        writes: [
          {
            range: "'8. SENSIBILIZACION'!A26",
            value: "Observacion",
          },
        ],
        rowInsertions: [
          {
            sheetName: "8. SENSIBILIZACION",
            insertAtRow: 35,
            count: 2,
          },
        ],
        checkboxValidations: [
          {
            sheetName: "8. SENSIBILIZACION",
            cells: ["U60"],
          },
        ],
        autoResizeExcludedRows: {
          "8. SENSIBILIZACION": [40],
        },
      },
      {
        "8. SENSIBILIZACION": "8. SENSIBILIZACION - 2026-04-11",
      }
    );

    expect(rewritten).toEqual({
      writes: [
        {
          range: "'8. SENSIBILIZACION - 2026-04-11'!A26",
          value: "Observacion",
        },
      ],
      rowInsertions: [
        {
          sheetName: "8. SENSIBILIZACION - 2026-04-11",
          insertAtRow: 35,
          count: 2,
        },
      ],
      checkboxValidations: [
        {
          sheetName: "8. SENSIBILIZACION - 2026-04-11",
          cells: ["U60"],
        },
      ],
      autoResizeExcludedRows: {
        "8. SENSIBILIZACION - 2026-04-11": [40],
      },
    });
  });
});

describe("rangeHasValues", () => {
  it("ignora celdas vacias y checkboxes sin marcar del template", () => {
    expect(rangeHasValues(undefined)).toBe(false);
    expect(rangeHasValues([[""], ["FALSE"], [false]])).toBe(false);
  });

  it("detecta contenido real escrito por el programa", () => {
    expect(rangeHasValues([["Empresa demo"]])).toBe(true);
    expect(rangeHasValues([[true]])).toBe(true);
    expect(rangeHasValues([[0]])).toBe(true);
  });
});
