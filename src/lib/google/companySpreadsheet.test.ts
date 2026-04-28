import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  batchGetMock,
  batchUpdateMock,
  clearProtectedRangesMock,
  copyToMock,
  driveFilesListMock,
  hideSheetsMock,
  sheetsGetMock,
} = vi.hoisted(() => ({
  driveFilesListMock: vi.fn(),
  sheetsGetMock: vi.fn(),
  copyToMock: vi.fn(),
  batchGetMock: vi.fn(),
  batchUpdateMock: vi.fn(),
  clearProtectedRangesMock: vi.fn(),
  hideSheetsMock: vi.fn(),
}));

vi.mock("@/lib/google/auth", () => ({
  getDriveClient: vi.fn(() => ({
    files: {
      list: driveFilesListMock,
    },
  })),
  getSheetsClient: vi.fn(() => ({
    spreadsheets: {
      get: sheetsGetMock,
      batchUpdate: batchUpdateMock,
      sheets: {
        copyTo: copyToMock,
      },
      values: {
        batchGet: batchGetMock,
      },
    },
  })),
}));

vi.mock("@/lib/google/driveQuery", () => ({
  escapeDriveQueryValue: vi.fn((value: string) => value),
  requireDriveFileId: vi.fn((value: string) => value),
}));

vi.mock("@/lib/google/sheets", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google/sheets")>(
    "@/lib/google/sheets"
  );

  return {
    ...actual,
    clearProtectedRanges: clearProtectedRangesMock,
    hideSheets: hideSheetsMock,
  };
});

import {
  buildDatedSheetTitle,
  buildInternalTemplateSheetTitle,
  copySheetsToSpreadsheet,
  prepareCompanySpreadsheet,
  rangeHasValues,
  rewriteFormSheetMutation,
} from "@/lib/google/companySpreadsheet";

beforeEach(() => {
  driveFilesListMock.mockReset();
  sheetsGetMock.mockReset();
  copyToMock.mockReset();
  batchGetMock.mockReset();
  batchUpdateMock.mockReset();
  clearProtectedRangesMock.mockReset();
  hideSheetsMock.mockReset();
});

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

describe("copySheetsToSpreadsheet", () => {
  it("reads source metadata once and copies requested sheets in order", async () => {
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [
          { properties: { sheetId: 77, title: "Caracterizaci\u00f3n" } },
          { properties: { sheetId: 42, title: "2. EVALUACION" } },
        ],
      },
    });
    copyToMock
      .mockResolvedValueOnce({
        data: { sheetId: 177, title: "Caracterizaci\u00f3n" },
      })
      .mockResolvedValueOnce({
        data: { sheetId: 142, title: "2. EVALUACION" },
      });

    const onStep = vi.fn();
    const copied = await copySheetsToSpreadsheet({
      sourceSpreadsheetId: "master-1",
      destinationSpreadsheetId: "sheet-1",
      sheetNames: ["Caracterizaci\u00f3n", "2. EVALUACION"],
      onStep,
    });

    expect(sheetsGetMock).toHaveBeenCalledTimes(1);
    expect(copyToMock).toHaveBeenNthCalledWith(1, {
      spreadsheetId: "master-1",
      sheetId: 77,
      requestBody: {
        destinationSpreadsheetId: "sheet-1",
      },
    });
    expect(copyToMock).toHaveBeenNthCalledWith(2, {
      spreadsheetId: "master-1",
      sheetId: 42,
      requestBody: {
        destinationSpreadsheetId: "sheet-1",
      },
    });
    expect(batchUpdateMock).not.toHaveBeenCalled();
    expect(onStep).toHaveBeenNthCalledWith(1, "copy_bundle.source_metadata");
    expect(onStep).toHaveBeenNthCalledWith(2, "copy_bundle.copy_to");
    expect(copied).toEqual([
      { sheetId: 177, title: "Caracterizaci\u00f3n", hidden: false },
      { sheetId: 142, title: "2. EVALUACION", hidden: false },
    ]);
  });

  it("renames a copied sheet immediately when Google returns a duplicate title", async () => {
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [{ properties: { sheetId: 42, title: "2. EVALUACION" } }],
      },
    });
    copyToMock.mockResolvedValueOnce({
      data: { sheetId: 142, title: "Copia de 2. EVALUACION" },
    });
    batchUpdateMock.mockResolvedValue({});

    await copySheetsToSpreadsheet({
      sourceSpreadsheetId: "master-1",
      destinationSpreadsheetId: "sheet-1",
      sheetNames: ["2. EVALUACION"],
    });

    expect(batchUpdateMock).toHaveBeenCalledWith({
      spreadsheetId: "sheet-1",
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: 142,
                title: "2. EVALUACION",
              },
              fields: "title",
            },
          },
        ],
      },
    });
  });
});

describe("rewriteFormSheetMutation", () => {
  it("reescribe writes, bloques, rowInsertions, checkboxes y exclusiones", () => {
    const rewritten = rewriteFormSheetMutation(
      {
        writes: [
          {
            range: "'8. SENSIBILIZACION'!A26",
            value: "Observacion",
          },
        ],
        templateBlockInsertions: [
          {
            sheetName: "8. SENSIBILIZACION",
            insertAtRow: 35,
            templateStartRow: 40,
            templateEndRow: 45,
            repeatCount: 2,
          },
        ],
        rowInsertions: [
          {
            sheetName: "8. SENSIBILIZACION",
            insertAtRow: 35,
            count: 2,
          },
        ],
        hiddenRows: [
          {
            sheetName: "8. SENSIBILIZACION",
            startRow: 34,
            count: 2,
          },
        ],
        checkboxValidations: [
          {
            sheetName: "8. SENSIBILIZACION",
            cells: ["U60"],
          },
        ],
        footerActaRefs: [
          {
            sheetName: "8. SENSIBILIZACION",
            actaRef: "A7K29QF2",
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
      templateBlockInsertions: [
        {
          sheetName: "8. SENSIBILIZACION - 2026-04-11",
          insertAtRow: 35,
          templateStartRow: 40,
          templateEndRow: 45,
          repeatCount: 2,
        },
      ],
      rowInsertions: [
        {
          sheetName: "8. SENSIBILIZACION - 2026-04-11",
          insertAtRow: 35,
          count: 2,
        },
      ],
      hiddenRows: [
        {
          sheetName: "8. SENSIBILIZACION - 2026-04-11",
          startRow: 34,
          count: 2,
        },
      ],
      checkboxValidations: [
        {
          sheetName: "8. SENSIBILIZACION - 2026-04-11",
          cells: ["U60"],
        },
      ],
      footerActaRefs: [
        {
          sheetName: "8. SENSIBILIZACION - 2026-04-11",
          actaRef: "A7K29QF2",
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

describe("prepareCompanySpreadsheet", () => {
  it("limpia protecciones heredadas antes de ocultar hojas y devolver el link activo", async () => {
    driveFilesListMock.mockResolvedValue({
      data: {
        files: [
          {
            id: "spreadsheet-demo",
            name: "Empresa Demo",
            webViewLink: "https://docs.google.com/spreadsheets/d/spreadsheet-demo/edit",
          },
        ],
      },
    });
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              sheetId: 42,
              title: "8. SENSIBILIZACION",
              hidden: false,
            },
          },
        ],
      },
    });
    batchGetMock.mockResolvedValue({
      data: {
        valueRanges: [
          {
            range: "'8. SENSIBILIZACION'!A26",
            values: [],
          },
        ],
      },
    });
    batchUpdateMock.mockResolvedValue({
      data: {
        replies: [
          {
            duplicateSheet: {
              properties: {
                sheetId: 77,
                title: "__RECA_TEMPLATE__ 8. SENSIBILIZACION",
              },
            },
          },
        ],
      },
    });
    clearProtectedRangesMock.mockResolvedValue({
      deletedProtectedRangeIds: [101, 202],
      deletedProtectedRangeCount: 2,
    });
    hideSheetsMock.mockResolvedValue(new Map([["8. SENSIBILIZACION", 42]]));

    const result = await prepareCompanySpreadsheet({
      masterTemplateId: "master-demo",
      companyFolderId: "folder-demo",
      spreadsheetName: "Empresa Demo",
      activeSheetName: "8. SENSIBILIZACION",
      mutation: {
        writes: [
          {
            range: "'8. SENSIBILIZACION'!A26",
            value: "Observacion demo",
          },
        ],
      },
    });

    expect(clearProtectedRangesMock).toHaveBeenCalledWith("spreadsheet-demo");
    expect(hideSheetsMock).toHaveBeenCalledWith("spreadsheet-demo", [
      "8. SENSIBILIZACION",
    ]);
    expect(result).toMatchObject({
      spreadsheetId: "spreadsheet-demo",
      activeSheetName: "8. SENSIBILIZACION",
      reusedSpreadsheet: true,
      sheetLink:
        "https://docs.google.com/spreadsheets/d/spreadsheet-demo/edit#gid=42",
    });
  });

  it("incluye hojas usadas solo por templateBlockInsertions dentro de effectiveSheetNames", async () => {
    driveFilesListMock.mockResolvedValue({
      data: {
        files: [
          {
            id: "spreadsheet-demo",
            name: "Empresa Demo",
            webViewLink: "https://docs.google.com/spreadsheets/d/spreadsheet-demo/edit",
          },
        ],
      },
    });
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              sheetId: 42,
              title: "9. CONTRATACION",
              hidden: false,
            },
          },
        ],
      },
    });
    batchUpdateMock.mockResolvedValue({
      data: {
        replies: [
          {
            duplicateSheet: {
              properties: {
                sheetId: 77,
                title: "__RECA_TEMPLATE__ 9. CONTRATACION",
              },
            },
          },
        ],
      },
    });
    clearProtectedRangesMock.mockResolvedValue({
      deletedProtectedRangeIds: [],
      deletedProtectedRangeCount: 0,
    });
    hideSheetsMock.mockResolvedValue(new Map([["9. CONTRATACION", 42]]));

    const result = await prepareCompanySpreadsheet({
      masterTemplateId: "master-demo",
      companyFolderId: "folder-demo",
      spreadsheetName: "Empresa Demo",
      activeSheetName: "9. CONTRATACION",
      mutation: {
        writes: [],
        templateBlockInsertions: [
          {
            sheetName: "9. CONTRATACION",
            insertAtRow: 40,
            templateStartRow: 20,
            templateEndRow: 25,
            repeatCount: 1,
          },
        ],
      },
    });

    expect(hideSheetsMock).toHaveBeenCalledWith("spreadsheet-demo", [
      "9. CONTRATACION",
    ]);
    expect(result.effectiveSheetNames).toEqual(["9. CONTRATACION"]);
  });

  it("mantiene visibles hojas extra sin writes directos", async () => {
    driveFilesListMock.mockResolvedValue({
      data: {
        files: [
          {
            id: "spreadsheet-demo",
            name: "Empresa Demo",
            webViewLink: "https://docs.google.com/spreadsheets/d/spreadsheet-demo/edit",
          },
        ],
      },
    });
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              sheetId: 42,
              title: "2. EVALUACION DE ACCESIBILIDAD",
              hidden: false,
            },
          },
          {
            properties: {
              sheetId: 55,
              title: "2.1 EVALUACION FOTOS",
              hidden: false,
            },
          },
        ],
      },
    });
    batchGetMock.mockResolvedValue({
      data: {
        valueRanges: [
          {
            range: "'2. EVALUACION DE ACCESIBILIDAD'!A1",
            values: [],
          },
        ],
      },
    });
    batchUpdateMock.mockResolvedValue({
      data: {
        replies: [
          {
            duplicateSheet: {
              properties: {
                sheetId: 88,
                title: "2.1 EVALUACION FOTOS",
              },
            },
          },
        ],
      },
    });
    clearProtectedRangesMock.mockResolvedValue({
      deletedProtectedRangeIds: [],
      deletedProtectedRangeCount: 0,
    });
    hideSheetsMock.mockResolvedValue(
      new Map([
        ["2. EVALUACION DE ACCESIBILIDAD", 42],
        ["2.1 EVALUACION FOTOS", 88],
      ])
    );

    const result = await prepareCompanySpreadsheet({
      masterTemplateId: "master-demo",
      companyFolderId: "folder-demo",
      spreadsheetName: "Empresa Demo",
      activeSheetName: "2. EVALUACION DE ACCESIBILIDAD",
      extraVisibleSheetNames: ["2.1 EVALUACION FOTOS"],
      mutation: {
        writes: [
          {
            range: "'2. EVALUACION DE ACCESIBILIDAD'!A1",
            value: "demo",
          },
        ],
      },
    });

    expect(result.effectiveSheetNames).toEqual([
      "2. EVALUACION DE ACCESIBILIDAD",
      "2.1 EVALUACION FOTOS",
    ]);
    expect(hideSheetsMock).toHaveBeenCalledWith("spreadsheet-demo", [
      "2. EVALUACION DE ACCESIBILIDAD",
      "2.1 EVALUACION FOTOS",
    ]);
  });

  it("resuelve la hoja auxiliar de evaluación fotos cuando el maestro usa título con tilde", async () => {
    driveFilesListMock.mockResolvedValue({
      data: {
        files: [
          {
            id: "spreadsheet-demo",
            name: "Empresa Demo",
            webViewLink: "https://docs.google.com/spreadsheets/d/spreadsheet-demo/edit",
          },
        ],
      },
    });
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              sheetId: 42,
              title: "2. EVALUACIÓN DE ACCESIBILIDAD",
              hidden: false,
            },
          },
          {
            properties: {
              sheetId: 55,
              title: "2.1 EVALUACIÓN FOTOS",
              hidden: false,
            },
          },
        ],
      },
    });
    batchGetMock.mockResolvedValue({
      data: {
        valueRanges: [
          {
            range: "'2. EVALUACIÓN DE ACCESIBILIDAD'!A1",
            values: [],
          },
        ],
      },
    });
    batchUpdateMock.mockResolvedValue({
      data: {
        replies: [
          {
            duplicateSheet: {
              properties: {
                sheetId: 88,
                title: "2.1 EVALUACIÓN FOTOS",
              },
            },
          },
        ],
      },
    });
    clearProtectedRangesMock.mockResolvedValue({
      deletedProtectedRangeIds: [],
      deletedProtectedRangeCount: 0,
    });
    hideSheetsMock.mockResolvedValue(
      new Map([
        ["2. EVALUACIÓN DE ACCESIBILIDAD", 42],
        ["2.1 EVALUACIÓN FOTOS", 88],
      ])
    );

    const result = await prepareCompanySpreadsheet({
      masterTemplateId: "master-demo",
      companyFolderId: "folder-demo",
      spreadsheetName: "Empresa Demo",
      activeSheetName: "2. EVALUACION DE ACCESIBILIDAD",
      extraVisibleSheetNames: ["2.1 EVALUACION FOTOS"],
      mutation: {
        writes: [
          {
            range: "'2. EVALUACION DE ACCESIBILIDAD'!A1",
            value: "demo",
          },
        ],
      },
    });

    expect(result.effectiveSheetNames).toEqual([
      "2. EVALUACIÓN DE ACCESIBILIDAD",
      "2.1 EVALUACIÓN FOTOS",
    ]);
    expect(hideSheetsMock).toHaveBeenCalledWith("spreadsheet-demo", [
      "2. EVALUACIÓN DE ACCESIBILIDAD",
      "2.1 EVALUACIÓN FOTOS",
    ]);
  });

  it("reuses the Selección alias tab and rewrites the mutation to the effective sheet title", async () => {
    driveFilesListMock.mockResolvedValue({
      data: {
        files: [
          {
            id: "spreadsheet-demo",
            name: "Empresa Demo",
            webViewLink: "https://docs.google.com/spreadsheets/d/spreadsheet-demo/edit",
          },
        ],
      },
    });
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              sheetId: 42,
              title: "4. SELECCION INCLUYENTE",
              hidden: false,
            },
          },
          {
            properties: {
              sheetId: 77,
              title: "__RECA_TEMPLATE__ 4. SELECCION INCLUYENTE",
              hidden: true,
            },
          },
        ],
      },
    });
    batchGetMock.mockResolvedValue({
      data: {
        valueRanges: [
          {
            range: "'4. SELECCION INCLUYENTE'!A14",
            values: [],
          },
        ],
      },
    });
    clearProtectedRangesMock.mockResolvedValue({
      deletedProtectedRangeIds: [],
      deletedProtectedRangeCount: 0,
    });
    hideSheetsMock.mockResolvedValue(
      new Map([["4. SELECCION INCLUYENTE", 42]])
    );

    const result = await prepareCompanySpreadsheet({
      masterTemplateId: "master-demo",
      companyFolderId: "folder-demo",
      spreadsheetName: "Empresa Demo",
      activeSheetName: "4. SELECCIÓN INCLUYENTE",
      mutation: {
        writes: [
          {
            range: "'4. SELECCIÓN INCLUYENTE'!A14",
            value: "Actividad demo",
          },
        ],
        footerActaRefs: [
          {
            sheetName: "4. SELECCIÓN INCLUYENTE",
            actaRef: "ACTA-123",
          },
        ],
      },
    });

    expect(hideSheetsMock).toHaveBeenCalledWith("spreadsheet-demo", [
      "4. SELECCION INCLUYENTE",
    ]);
    expect(result.activeSheetName).toBe("4. SELECCION INCLUYENTE");
    expect(result.effectiveMutation).toEqual({
      writes: [
        {
          range: "'4. SELECCION INCLUYENTE'!A14",
          value: "Actividad demo",
        },
      ],
      footerActaRefs: [
        {
          sheetName: "4. SELECCION INCLUYENTE",
          actaRef: "ACTA-123",
        },
      ],
      rowInsertions: [],
      templateBlockInsertions: [],
      checkboxValidations: [],
      autoResizeExcludedRows: {},
    });
  });

  it("reescribe templateBlockInsertions y resuelve la hoja activa cuando se duplica con fecha", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T15:00:00.000Z"));

    try {
      driveFilesListMock.mockResolvedValue({
        data: {
          files: [
            {
              id: "spreadsheet-demo",
              name: "Empresa Demo",
              webViewLink:
                "https://docs.google.com/spreadsheets/d/spreadsheet-demo/edit",
            },
          ],
        },
      });
      sheetsGetMock.mockResolvedValue({
        data: {
          sheets: [
            {
              properties: {
                sheetId: 42,
                title: "8. SENSIBILIZACION",
                hidden: false,
              },
            },
            {
              properties: {
                sheetId: 77,
                title: "__RECA_TEMPLATE__ 8. SENSIBILIZACION",
                hidden: true,
              },
            },
          ],
        },
      });
      batchGetMock.mockResolvedValue({
        data: {
          valueRanges: [
            {
              range: "'8. SENSIBILIZACION'!A26",
              values: [["ya usado"]],
            },
          ],
        },
      });
      batchUpdateMock.mockResolvedValue({
        data: {
          replies: [
            {
              duplicateSheet: {
                properties: {
                  sheetId: 88,
                  title: "8. SENSIBILIZACION - 2026-04-15",
                },
              },
            },
          ],
        },
      });
      clearProtectedRangesMock.mockResolvedValue({
        deletedProtectedRangeIds: [],
        deletedProtectedRangeCount: 0,
      });
      hideSheetsMock.mockResolvedValue(
        new Map([["8. SENSIBILIZACION - 2026-04-15", 88]])
      );

      const result = await prepareCompanySpreadsheet({
        masterTemplateId: "master-demo",
        companyFolderId: "folder-demo",
        spreadsheetName: "Empresa Demo",
        activeSheetName: "8. SENSIBILIZACION",
        mutation: {
          writes: [
            {
              range: "'8. SENSIBILIZACION'!A26",
              value: "Observacion demo",
            },
          ],
          templateBlockInsertions: [
            {
              sheetName: "8. SENSIBILIZACION",
              insertAtRow: 35,
              templateStartRow: 40,
              templateEndRow: 45,
              repeatCount: 2,
            },
          ],
        },
      });

      expect(result.activeSheetName).toBe("8. SENSIBILIZACION - 2026-04-15");
      expect(result.activeSheetId).toBe(88);
      expect(result.effectiveSheetNames).toEqual([
        "8. SENSIBILIZACION - 2026-04-15",
      ]);
      expect(result.effectiveMutation.templateBlockInsertions).toEqual([
        {
          sheetName: "8. SENSIBILIZACION - 2026-04-15",
          insertAtRow: 35,
          templateStartRow: 40,
          templateEndRow: 45,
          repeatCount: 2,
        },
      ]);
      expect(hideSheetsMock).toHaveBeenCalledWith("spreadsheet-demo", [
        "8. SENSIBILIZACION - 2026-04-15",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fragmenta lecturas grandes de uso de hoja para evitar batchGet con query excesiva", async () => {
    driveFilesListMock.mockResolvedValue({
      data: {
        files: [
          {
            id: "spreadsheet-demo",
            name: "Empresa Demo",
            webViewLink: "https://docs.google.com/spreadsheets/d/spreadsheet-demo/edit",
          },
        ],
      },
    });
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              sheetId: 42,
              title: "2. EVALUACION DE ACCESIBILIDAD",
              hidden: false,
            },
          },
          {
            properties: {
              sheetId: 77,
              title: "__RECA_TEMPLATE__ 2. EVALUACION DE ACCESIBILIDAD",
              hidden: true,
            },
          },
        ],
      },
    });
    batchGetMock.mockImplementation(async ({ ranges }) => ({
      data: {
        valueRanges: (ranges as string[]).map((range) => ({
          range,
          values: [],
        })),
      },
    }));
    clearProtectedRangesMock.mockResolvedValue({
      deletedProtectedRangeIds: [],
      deletedProtectedRangeCount: 0,
    });
    hideSheetsMock.mockResolvedValue(
      new Map([["2. EVALUACION DE ACCESIBILIDAD", 42]])
    );

    const writes = Array.from({ length: 120 }, (_, index) => ({
      range: `'2. EVALUACION DE ACCESIBILIDAD'!P${index + 1}`,
      value: `Valor ${index + 1}`,
    }));

    const result = await prepareCompanySpreadsheet({
      masterTemplateId: "master-demo",
      companyFolderId: "folder-demo",
      spreadsheetName: "Empresa Demo",
      activeSheetName: "2. EVALUACION DE ACCESIBILIDAD",
      mutation: { writes },
    });

    const requestedRangeCounts = batchGetMock.mock.calls.map(
      ([request]) => (request.ranges as string[]).length
    );

    expect(batchGetMock).toHaveBeenCalledTimes(3);
    expect(Math.max(...requestedRangeCounts)).toBeLessThanOrEqual(50);
    expect(requestedRangeCounts.reduce((total, count) => total + count, 0)).toBe(
      writes.length
    );
    expect(result.effectiveSheetNames).toEqual(["2. EVALUACION DE ACCESIBILIDAD"]);
  });
});

describe("prepareCompanySpreadsheet organizational alias reuse", () => {
  it("reuses the Inducción Organizacional alias tab and rewrites the mutation to the effective sheet title", async () => {
    driveFilesListMock.mockResolvedValue({
      data: {
        files: [
          {
            id: "spreadsheet-demo",
            name: "Empresa Demo",
            webViewLink: "https://docs.google.com/spreadsheets/d/spreadsheet-demo/edit",
          },
        ],
      },
    });
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              sheetId: 42,
              title: "6. INDUCCION ORGANIZACIONAL",
              hidden: false,
            },
          },
          {
            properties: {
              sheetId: 77,
              title: "__RECA_TEMPLATE__ 6. INDUCCION ORGANIZACIONAL",
              hidden: true,
            },
          },
        ],
      },
    });
    batchGetMock.mockResolvedValue({
      data: {
        valueRanges: [
          {
            range: "'6. INDUCCION ORGANIZACIONAL'!A14",
            values: [],
          },
        ],
      },
    });
    clearProtectedRangesMock.mockResolvedValue({
      deletedProtectedRangeIds: [],
      deletedProtectedRangeCount: 0,
    });
    hideSheetsMock.mockResolvedValue(
      new Map([["6. INDUCCION ORGANIZACIONAL", 42]])
    );

    const result = await prepareCompanySpreadsheet({
      masterTemplateId: "master-demo",
      companyFolderId: "folder-demo",
      spreadsheetName: "Empresa Demo",
      activeSheetName: "6. INDUCCIÓN ORGANIZACIONAL",
      mutation: {
        writes: [
          {
            range: "'6. INDUCCIÓN ORGANIZACIONAL'!A14",
            value: "Actividad demo",
          },
        ],
        footerActaRefs: [
          {
            sheetName: "6. INDUCCIÓN ORGANIZACIONAL",
            actaRef: "ACTA-123",
          },
        ],
      },
    });

    expect(hideSheetsMock).toHaveBeenCalledWith("spreadsheet-demo", [
      "6. INDUCCION ORGANIZACIONAL",
    ]);
    expect(result.activeSheetName).toBe("6. INDUCCION ORGANIZACIONAL");
    expect(result.effectiveMutation).toEqual({
      writes: [
        {
          range: "'6. INDUCCION ORGANIZACIONAL'!A14",
          value: "Actividad demo",
        },
      ],
      footerActaRefs: [
        {
          sheetName: "6. INDUCCION ORGANIZACIONAL",
          actaRef: "ACTA-123",
        },
      ],
      rowInsertions: [],
      templateBlockInsertions: [],
      checkboxValidations: [],
      autoResizeExcludedRows: {},
    });
  });

  it("normalizes malformed organizational A1 writes before probing sheet usage", async () => {
    driveFilesListMock.mockResolvedValue({
      data: {
        files: [
          {
            id: "spreadsheet-demo",
            name: "Empresa Demo",
            webViewLink: "https://docs.google.com/spreadsheets/d/spreadsheet-demo/edit",
          },
        ],
      },
    });
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              sheetId: 42,
              title: "6. INDUCCIÓN ORGANIZACIONAL",
              hidden: false,
            },
          },
        ],
      },
    });
    batchGetMock.mockResolvedValue({
      data: {
        valueRanges: [
          {
            range: "'6. INDUCCIÓN ORGANIZACIONAL'!D7",
            values: [],
          },
        ],
      },
    });
    clearProtectedRangesMock.mockResolvedValue({
      deletedProtectedRangeIds: [],
      deletedProtectedRangeCount: 0,
    });
    batchUpdateMock.mockResolvedValue({
      data: {
        replies: [
          {
            duplicateSheet: {
              properties: {
                sheetId: 77,
                title: "__RECA_TEMPLATE__ 6. INDUCCIÓN ORGANIZACIONAL",
              },
            },
          },
        ],
      },
    });
    hideSheetsMock.mockResolvedValue(
      new Map([["6. INDUCCIÓN ORGANIZACIONAL", 42]])
    );

    const result = await prepareCompanySpreadsheet({
      masterTemplateId: "master-demo",
      companyFolderId: "folder-demo",
      spreadsheetName: "Empresa Demo",
      activeSheetName: "6. INDUCCIÓN ORGANIZACIONAL",
      mutation: {
        writes: [
          {
            range: "'6. INDUCCIÓN ORGANIZACIONAL!D7",
            value: "2026-04-17",
          },
        ],
      },
    });

    expect(batchGetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ranges: ["'6. INDUCCIÓN ORGANIZACIONAL'!D7"],
      })
    );
    expect(hideSheetsMock).toHaveBeenCalledWith("spreadsheet-demo", [
      "6. INDUCCIÓN ORGANIZACIONAL",
    ]);
    expect(result.effectiveSheetNames).toEqual(["6. INDUCCIÓN ORGANIZACIONAL"]);
  });
});
