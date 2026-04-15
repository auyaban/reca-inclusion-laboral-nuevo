import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  batchGetMock,
  batchUpdateMock,
  clearProtectedRangesMock,
  driveFilesListMock,
  hideSheetsMock,
  sheetsGetMock,
} = vi.hoisted(() => ({
  driveFilesListMock: vi.fn(),
  sheetsGetMock: vi.fn(),
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
  prepareCompanySpreadsheet,
  rangeHasValues,
  rewriteFormSheetMutation,
} from "@/lib/google/companySpreadsheet";

beforeEach(() => {
  driveFilesListMock.mockReset();
  sheetsGetMock.mockReset();
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
});
