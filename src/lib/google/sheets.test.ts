import { beforeEach, describe, expect, it, vi } from "vitest";

const { batchUpdateMock, mockedSheetsClient, sheetsGetMock, valuesGetMock } = vi.hoisted(() => {
  const sheetsGetMock = vi.fn();
  const batchUpdateMock = vi.fn();
  const valuesGetMock = vi.fn();

  return {
    sheetsGetMock,
    batchUpdateMock,
    valuesGetMock,
    mockedSheetsClient: {
      spreadsheets: {
        get: sheetsGetMock,
        batchUpdate: batchUpdateMock,
        values: {
          get: valuesGetMock,
        },
      },
    },
  };
});

vi.mock("@/lib/google/auth", () => ({
  getDriveClient: vi.fn(),
  getSheetsClient: vi.fn(() => mockedSheetsClient),
}));

import {
  applyFormSheetMutation,
  buildAutoResizeRowGroups,
  buildSheetVisibilityPlan,
  clearProtectedRanges,
  collectProtectedRangeIds,
  resolveFooterActaWrites,
  type CellWrite,
  insertTemplateBlockRows,
} from "@/lib/google/sheets";

beforeEach(() => {
  sheetsGetMock.mockReset();
  batchUpdateMock.mockReset();
  valuesGetMock.mockReset();
});

describe("buildAutoResizeRowGroups", () => {
  it("agrupa filas contiguas por hoja", () => {
    const writes: CellWrite[] = [
      { range: "'Hoja 1'!B2", value: "uno" },
      { range: "'Hoja 1'!D3", value: "dos" },
      { range: "'Hoja 1'!E5", value: "tres" },
      { range: "'Hoja 2'!A4", value: "cuatro" },
    ];

    expect(buildAutoResizeRowGroups(writes)).toEqual([
      { sheetName: "Hoja 1", startRow: 2, endRow: 3 },
      { sheetName: "Hoja 1", startRow: 5, endRow: 5 },
      { sheetName: "Hoja 2", startRow: 4, endRow: 4 },
    ]);
  });

  it("excluye filas configuradas sin tocar las demás", () => {
    const writes: CellWrite[] = [
      { range: "'Hoja 1'!A10", value: "uno" },
      { range: "'Hoja 1'!A11", value: "dos" },
      { range: "'Hoja 1'!A12", value: "tres" },
    ];

    expect(
      buildAutoResizeRowGroups(writes, {
        "Hoja 1": [11],
      })
    ).toEqual([
      { sheetName: "Hoja 1", startRow: 10, endRow: 10 },
      { sheetName: "Hoja 1", startRow: 12, endRow: 12 },
    ]);
  });

  it("no genera requests si no hay filas escritas válidas", () => {
    expect(buildAutoResizeRowGroups([])).toEqual([]);
    expect(
      buildAutoResizeRowGroups([{ range: "'Hoja 1'!A", value: "sin fila" }])
    ).toEqual([]);
  });
});

describe("applyFormSheetMutation", () => {
  it("ejecuta bloques, inserciones, writes, checkboxes y autoajuste en orden", async () => {
    const calls: string[] = [];

    await applyFormSheetMutation(
      "spreadsheet-id",
      {
        writes: [{ range: "'Hoja 1'!A1", value: "hola" }],
        templateBlockInsertions: [
          {
            sheetName: "Hoja 1",
            insertAtRow: 30,
            templateStartRow: 10,
            templateEndRow: 12,
            repeatCount: 2,
          },
        ],
        rowInsertions: [
          {
            sheetName: "Hoja 1",
            insertAtRow: 9,
            count: 2,
          },
        ],
        checkboxValidations: [
          {
            sheetName: "Hoja 1",
            cells: ["U60"],
          },
        ],
      },
      {
        insertTemplateBlockRows: vi.fn(async () => {
          calls.push("block");
        }),
        insertRows: vi.fn(async () => {
          calls.push("insert");
        }),
        resolveFooterActaWrites: vi.fn(async () => {
          calls.push("footer");
          return [];
        }),
        batchWriteCells: vi.fn(async () => {
          calls.push("write");
        }),
        setCheckboxValidation: vi.fn(async () => {
          calls.push("checkbox");
        }),
        autoResizeWrittenRows: vi.fn(async () => {
          calls.push("resize");
        }),
      }
    );

    expect(calls).toEqual([
      "block",
      "insert",
      "footer",
      "write",
      "checkbox",
      "resize",
    ]);
  });
});

describe("resolveFooterActaWrites", () => {
  it("encuentra el footer y reemplaza todo el contenido de la celda", async () => {
    valuesGetMock.mockResolvedValue({
      data: {
        values: [
          ["Titulo"],
          ["www.recacolombia.org"],
        ],
      },
    });

    await expect(
      resolveFooterActaWrites("spreadsheet-id", [
        { sheetName: "Hoja 1", actaRef: "A7K29QF2" },
      ])
    ).resolves.toEqual([
      {
        range: "'Hoja 1'!A2",
        value: "www.recacolombia.org\nACTA ID: A7K29QF2",
      },
    ]);
  });

  it("sobrescribe footers que ya traen un ACTA ID previo", async () => {
    valuesGetMock.mockResolvedValue({
      data: {
        values: [
          ["Titulo"],
          ["www.recacolombia.org\nACTA ID: OLDREF12"],
        ],
      },
    });

    await expect(
      resolveFooterActaWrites("spreadsheet-id", [
        { sheetName: "Hoja 1", actaRef: "B8M43RT9" },
      ])
    ).resolves.toEqual([
      {
        range: "'Hoja 1'!A2",
        value: "www.recacolombia.org\nACTA ID: B8M43RT9",
      },
    ]);
  });

  it("falla si no encuentra el footer tecnico", async () => {
    valuesGetMock.mockResolvedValue({
      data: {
        values: [["Sin footer"]],
      },
    });

    await expect(
      resolveFooterActaWrites("spreadsheet-id", [
        { sheetName: "Hoja 1", actaRef: "A7K29QF2" },
      ])
    ).rejects.toThrow(
      'No se encontro el footer "www.recacolombia.org" en la pestaña "Hoja 1".'
    );
  });
});

describe("insertTemplateBlockRows", () => {
  it("no genera requests cuando repeatCount es menor o igual a cero", async () => {
    await insertTemplateBlockRows("spreadsheet-id", {
      sheetName: "Hoja 1",
      insertAtRow: 20,
      templateStartRow: 10,
      templateEndRow: 12,
      repeatCount: 0,
    });

    expect(sheetsGetMock).not.toHaveBeenCalled();
    expect(batchUpdateMock).not.toHaveBeenCalled();
  });

  it("falla con error claro para rangos fuente invalidos", async () => {
    await expect(
      insertTemplateBlockRows("spreadsheet-id", {
        sheetName: "Hoja 1",
        insertAtRow: 20,
        templateStartRow: 0,
        templateEndRow: 12,
        repeatCount: 1,
      })
    ).rejects.toThrow(
      "templateStartRow/templateEndRow invalidos para insertar bloques."
    );

    await expect(
      insertTemplateBlockRows("spreadsheet-id", {
        sheetName: "Hoja 1",
        insertAtRow: 11,
        templateStartRow: 10,
        templateEndRow: 12,
        repeatCount: 1,
      })
    ).rejects.toThrow(
      "insertAtRow=11 debe apuntar despues de templateEndRow=12 para duplicar bloques en la misma hoja."
    );
  });

  it("inserta filas, desmerge el destino y copia el bloque repetido", async () => {
    sheetsGetMock
      .mockResolvedValueOnce({
        data: {
          sheets: [
            {
              properties: {
                sheetId: 42,
                title: "Hoja 1",
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          sheets: [
            {
              properties: {
                sheetId: 42,
                title: "Hoja 1",
              },
              merges: [
                {
                  startRowIndex: 40,
                  endRowIndex: 41,
                  startColumnIndex: 0,
                  endColumnIndex: 4,
                },
                {
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 1,
                },
              ],
            },
          ],
        },
      });
    batchUpdateMock.mockResolvedValue({});

    await insertTemplateBlockRows("spreadsheet-id", {
      sheetName: "Hoja 1",
      insertAtRow: 35,
      templateStartRow: 10,
      templateEndRow: 12,
      repeatCount: 2,
    });

    expect(batchUpdateMock).toHaveBeenCalledTimes(3);
    expect(batchUpdateMock).toHaveBeenNthCalledWith(1, {
      spreadsheetId: "spreadsheet-id",
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: 42,
                dimension: "ROWS",
                startIndex: 35,
                endIndex: 41,
              },
              inheritFromBefore: true,
            },
          },
        ],
      },
    });
    expect(batchUpdateMock).toHaveBeenNthCalledWith(2, {
      spreadsheetId: "spreadsheet-id",
      requestBody: {
        requests: [
          {
            unmergeCells: {
              range: {
                sheetId: 42,
                startRowIndex: 40,
                endRowIndex: 41,
                startColumnIndex: 0,
                endColumnIndex: 4,
              },
            },
          },
        ],
      },
    });
    expect(batchUpdateMock).toHaveBeenNthCalledWith(3, {
      spreadsheetId: "spreadsheet-id",
      requestBody: {
        requests: [
          {
            copyPaste: {
              source: {
                sheetId: 42,
                startRowIndex: 9,
                endRowIndex: 12,
              },
              destination: {
                sheetId: 42,
                startRowIndex: 35,
                endRowIndex: 38,
              },
              pasteType: "PASTE_NORMAL",
              pasteOrientation: "NORMAL",
            },
          },
          {
            copyPaste: {
              source: {
                sheetId: 42,
                startRowIndex: 9,
                endRowIndex: 12,
              },
              destination: {
                sheetId: 42,
                startRowIndex: 38,
                endRowIndex: 41,
              },
              pasteType: "PASTE_NORMAL",
              pasteOrientation: "NORMAL",
            },
          },
        ],
      },
    });
  });

  it("copia alturas de fila solo cuando copyRowHeights es true", async () => {
    sheetsGetMock
      .mockResolvedValueOnce({
        data: {
          sheets: [
            {
              properties: {
                sheetId: 42,
                title: "Hoja 1",
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          sheets: [
            {
              properties: {
                sheetId: 42,
                title: "Hoja 1",
              },
              merges: [],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          sheets: [
            {
              data: [
                {
                  rowMetadata: [
                    { pixelSize: 20 },
                    { pixelSize: 20 },
                    { pixelSize: 35 },
                  ],
                },
              ],
            },
          ],
        },
      });
    batchUpdateMock.mockResolvedValue({});

    await insertTemplateBlockRows("spreadsheet-id", {
      sheetName: "Hoja 1",
      insertAtRow: 30,
      templateStartRow: 10,
      templateEndRow: 12,
      repeatCount: 2,
      copyRowHeights: true,
    });

    expect(batchUpdateMock).toHaveBeenCalledTimes(3);
    expect(batchUpdateMock).toHaveBeenNthCalledWith(3, {
      spreadsheetId: "spreadsheet-id",
      requestBody: {
        requests: [
          {
            updateDimensionProperties: {
              range: {
                sheetId: 42,
                dimension: "ROWS",
                startIndex: 30,
                endIndex: 32,
              },
              properties: {
                pixelSize: 20,
              },
              fields: "pixelSize",
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: 42,
                dimension: "ROWS",
                startIndex: 32,
                endIndex: 33,
              },
              properties: {
                pixelSize: 35,
              },
              fields: "pixelSize",
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: 42,
                dimension: "ROWS",
                startIndex: 33,
                endIndex: 35,
              },
              properties: {
                pixelSize: 20,
              },
              fields: "pixelSize",
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: 42,
                dimension: "ROWS",
                startIndex: 35,
                endIndex: 36,
              },
              properties: {
                pixelSize: 35,
              },
              fields: "pixelSize",
            },
          },
        ],
      },
    });
  });
});

describe("collectProtectedRangeIds", () => {
  it("extrae y deduplica los protectedRangeId presentes", () => {
    expect(
      collectProtectedRangeIds([
        {
          protectedRanges: [
            { protectedRangeId: 101 },
            { protectedRangeId: 101 },
            { protectedRangeId: 202 },
          ],
        },
        {
          protectedRanges: [
            { protectedRangeId: 303 },
            {},
          ],
        },
      ])
    ).toEqual([101, 202, 303]);
  });
});

describe("clearProtectedRanges", () => {
  it("borra todas las protecciones heredadas del spreadsheet", async () => {
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [
          {
            protectedRanges: [
              { protectedRangeId: 101 },
              { protectedRangeId: 101 },
            ],
          },
          {
            protectedRanges: [
              { protectedRangeId: 202 },
              { protectedRangeId: 303 },
            ],
          },
        ],
      },
    });
    batchUpdateMock.mockResolvedValue({});

    await expect(clearProtectedRanges("spreadsheet-demo")).resolves.toEqual({
      deletedProtectedRangeIds: [101, 202, 303],
      deletedProtectedRangeCount: 3,
    });

    expect(sheetsGetMock).toHaveBeenCalledWith({
      spreadsheetId: "spreadsheet-demo",
      fields: "sheets(protectedRanges(protectedRangeId))",
    });
    expect(batchUpdateMock).toHaveBeenCalledWith({
      spreadsheetId: "spreadsheet-demo",
      requestBody: {
        requests: [
          { deleteProtectedRange: { protectedRangeId: 101 } },
          { deleteProtectedRange: { protectedRangeId: 202 } },
          { deleteProtectedRange: { protectedRangeId: 303 } },
        ],
      },
    });
  });

  it("no intenta borrar nada si el spreadsheet ya viene sin protecciones", async () => {
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [{ protectedRanges: [] }],
      },
    });

    await expect(clearProtectedRanges("spreadsheet-demo")).resolves.toEqual({
      deletedProtectedRangeIds: [],
      deletedProtectedRangeCount: 0,
    });

    expect(batchUpdateMock).not.toHaveBeenCalled();
  });
});

describe("buildSheetVisibilityPlan", () => {
  it("oculta hojas no usadas y conserva el id de la hoja visible", () => {
    const plan = buildSheetVisibilityPlan(
      [
        { sheetId: 1, title: "Presentacion", hidden: false },
        { sheetId: 2, title: "Sensibilizacion", hidden: false },
        { sheetId: 3, title: "Evaluacion", hidden: true },
      ],
      ["Presentacion"]
    );

    expect(plan.keptSheetIds.get("Presentacion")).toBe(1);
    expect(plan.requests).toEqual([
      {
        updateSheetProperties: {
          properties: { sheetId: 2, hidden: true },
          fields: "hidden",
        },
      },
    ]);
  });

  it("desoculta la hoja objetivo si venía oculta", () => {
    const plan = buildSheetVisibilityPlan(
      [
        { sheetId: 1, title: "Presentacion", hidden: true },
        { sheetId: 2, title: "Sensibilizacion", hidden: false },
      ],
      ["Presentacion"]
    );

    expect(plan.requests).toEqual([
      {
        updateSheetProperties: {
          properties: { sheetId: 1, hidden: false },
          fields: "hidden",
        },
      },
      {
        updateSheetProperties: {
          properties: { sheetId: 2, hidden: true },
          fields: "hidden",
        },
      },
    ]);
  });

  it("falla si la hoja objetivo no existe", () => {
    expect(() =>
      buildSheetVisibilityPlan(
        [{ sheetId: 1, title: "Presentacion", hidden: false }],
        ["No Existe"]
      )
    ).toThrow("No existe ninguna hoja visible solicitada");
  });
});
