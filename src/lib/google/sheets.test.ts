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
  applyFooterActaTextFormat,
  applyFormSheetMutation,
  applyFormSheetStructureInsertions,
  applyPrewarmStructuralBatch,
  auditStructuralA1Writes,
  buildFooterMutationMarkers,
  buildAutoResizeRowGroups,
  buildSheetVisibilityPlan,
  clearProtectedRanges,
  collectProtectedRangeIds,
  getRequestedSheetTitleCandidates,
  inspectFooterActaWrites,
  normalizeA1Range,
  resolveRequestedSheetTitle,
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

describe("sheet title resolution", () => {
  it("resolves Evaluación fotos aliases through the canonical title set", () => {
    expect(getRequestedSheetTitleCandidates("2.1 EVALUACIÓN FOTOS")).toEqual([
      "2.1 EVALUACIÓN FOTOS",
      "2.1 EVALUACION FOTOS",
    ]);
    expect(
      resolveRequestedSheetTitle("2.1 EVALUACION FOTOS", [
        "2.1 EVALUACIÓN FOTOS",
      ])
    ).toBe("2.1 EVALUACIÓN FOTOS");
  });

  it("resolves Selección aliases through the canonical title set", () => {
    expect(getRequestedSheetTitleCandidates("4. SELECCIÓN INCLUYENTE")).toEqual([
      "4. SELECCIÓN INCLUYENTE",
      "4. SELECCION INCLUYENTE",
    ]);
    expect(
      resolveRequestedSheetTitle("4. SELECCIÓN INCLUYENTE", [
        "4. SELECCION INCLUYENTE",
      ])
    ).toBe("4. SELECCION INCLUYENTE");
  });

  it("keeps the matching title exact when the canonical tab exists", () => {
    expect(
      resolveRequestedSheetTitle("4. SELECCIÓN INCLUYENTE", [
        "4. SELECCIÓN INCLUYENTE",
        "Hoja auxiliar",
      ])
    ).toBe("4. SELECCIÓN INCLUYENTE");
  });
});

describe("applyFormSheetMutation", () => {
  it("ejecuta marker, estructura y writes finales en orden", async () => {
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
        resolveFooterActaWrites: vi.fn(async () => {
          calls.push("footer");
          return [
            {
              sheetName: "Hoja 1",
              rowIndex: 40,
              columnIndex: 0,
              range: "'Hoja 1'!A41",
              value: "www.recacolombia.org\nACTA ID: ACTA1234",
            },
          ];
        }),
        writeFooterActaMarker: vi.fn(async () => {
          calls.push("marker");
        }),
        applyFormSheetStructureInsertions: vi.fn(async () => {
          calls.push("structure");
        }),
        applyFormSheetCellWrites: vi.fn(async () => {
          calls.push("writes");
        }),
      }
    );

    expect(calls).toEqual(["footer", "marker", "structure", "writes"]);
  });
});

describe("applyFormSheetStructureInsertions", () => {
  it("hides requested row ranges after structural insertions", async () => {
    sheetsGetMock.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              sheetId: 123,
              title: "Hoja 1",
            },
          },
        ],
      },
    });
    batchUpdateMock.mockResolvedValue({});

    await applyFormSheetStructureInsertions("spreadsheet-id", {
      hiddenRows: [{ sheetName: "Hoja 1", startRow: 72, count: 2 }],
    });

    expect(batchUpdateMock).toHaveBeenCalledWith({
      spreadsheetId: "spreadsheet-id",
      requestBody: {
        requests: [
          {
            updateDimensionProperties: {
              range: {
                sheetId: 123,
                dimension: "ROWS",
                startIndex: 71,
                endIndex: 73,
              },
              properties: {
                hiddenByUser: true,
              },
              fields: "hiddenByUser",
            },
          },
        ],
      },
    });
  });
});

describe("applyPrewarmStructuralBatch", () => {
  it("combines protected range cleanup, row inserts, hides, checkbox validations and sheet visibility", async () => {
    batchUpdateMock.mockResolvedValue({});

    const kept = await applyPrewarmStructuralBatch({
      spreadsheetId: "spreadsheet-id",
      metadata: {
        protectedRangeIds: [101],
        sheets: [
          { sheetId: 10, title: "Acta", hidden: false },
          { sheetId: 20, title: "Soporte", hidden: false },
          { sheetId: 30, title: "Hoja 1", hidden: false },
        ],
      },
      mutation: {
        writes: [],
        rowInsertions: [
          { sheetName: "Acta", insertAtRow: 5, count: 2, templateRow: 5 },
        ],
        hiddenRows: [{ sheetName: "Acta", startRow: 12, count: 3 }],
        checkboxValidations: [{ sheetName: "Acta", cells: ["C7"] }],
      },
      visibleSheetNames: ["Acta"],
    });

    expect(kept.get("Acta")).toBe(10);
    expect(batchUpdateMock).toHaveBeenCalledTimes(1);
    expect(batchUpdateMock).toHaveBeenCalledWith({
      spreadsheetId: "spreadsheet-id",
      requestBody: {
        requests: [
          { deleteProtectedRange: { protectedRangeId: 101 } },
          {
            insertDimension: {
              range: {
                sheetId: 10,
                dimension: "ROWS",
                startIndex: 5,
                endIndex: 7,
              },
              inheritFromBefore: true,
            },
          },
          {
            copyPaste: {
              source: {
                sheetId: 10,
                startRowIndex: 4,
                endRowIndex: 5,
              },
              destination: {
                sheetId: 10,
                startRowIndex: 5,
                endRowIndex: 7,
              },
              pasteType: "PASTE_NORMAL",
              pasteOrientation: "NORMAL",
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: 10,
                dimension: "ROWS",
                startIndex: 11,
                endIndex: 14,
              },
              properties: {
                hiddenByUser: true,
              },
              fields: "hiddenByUser",
            },
          },
          {
            setDataValidation: {
              range: {
                sheetId: 10,
                startRowIndex: 6,
                endRowIndex: 7,
                startColumnIndex: 2,
                endColumnIndex: 3,
              },
              rule: {
                condition: { type: "BOOLEAN" },
                strict: true,
                showCustomUi: true,
              },
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId: 20, hidden: true },
              fields: "hidden",
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId: 30, hidden: true },
              fields: "hidden",
            },
          },
        ],
      },
    });
  });

  it("does not send an empty structural batch", async () => {
    const kept = await applyPrewarmStructuralBatch({
      spreadsheetId: "spreadsheet-id",
      metadata: {
        protectedRangeIds: [],
        sheets: [{ sheetId: 10, title: "Acta", hidden: false }],
      },
      mutation: { writes: [] },
      visibleSheetNames: ["Acta"],
    });

    expect(kept.get("Acta")).toBe(10);
    expect(batchUpdateMock).not.toHaveBeenCalled();
  });
});

describe("buildSheetVisibilityPlan", () => {
  it("keeps the resolved Selección alias visible when requested by canonical title", () => {
    const plan = buildSheetVisibilityPlan(
      [
        {
          sheetId: 42,
          title: "4. SELECCION INCLUYENTE",
          hidden: false,
        },
        {
          sheetId: 77,
          title: "Hoja auxiliar",
          hidden: false,
        },
      ],
      ["4. SELECCIÓN INCLUYENTE"]
    );

    expect(plan.requests).toEqual([
      {
        updateSheetProperties: {
          properties: {
            sheetId: 77,
            hidden: true,
          },
          fields: "hidden",
        },
      },
    ]);
    expect(plan.keptSheetIds).toEqual(
      new Map([["4. SELECCION INCLUYENTE", 42]])
    );
  });
});

describe("organizational sheet aliases", () => {
  it("resolves Inducción Organizacional aliases through the canonical title set", () => {
    expect(getRequestedSheetTitleCandidates("6. INDUCCIÓN ORGANIZACIONAL")).toEqual([
      "6. INDUCCIÓN ORGANIZACIONAL",
      "6. INDUCCION ORGANIZACIONAL",
    ]);
    expect(
      resolveRequestedSheetTitle("6. INDUCCIÓN ORGANIZACIONAL", [
        "6. INDUCCION ORGANIZACIONAL",
      ])
    ).toBe("6. INDUCCION ORGANIZACIONAL");
  });

  it("keeps the matching Inducción Organizacional title exact when the canonical tab exists", () => {
    expect(
      resolveRequestedSheetTitle("6. INDUCCIÓN ORGANIZACIONAL", [
        "6. INDUCCIÓN ORGANIZACIONAL",
        "Hoja auxiliar",
      ])
    ).toBe("6. INDUCCIÓN ORGANIZACIONAL");
  });

  it("keeps the resolved Inducción Organizacional alias visible when requested by canonical title", () => {
    const plan = buildSheetVisibilityPlan(
      [
        {
          sheetId: 42,
          title: "6. INDUCCION ORGANIZACIONAL",
          hidden: false,
        },
        {
          sheetId: 77,
          title: "Hoja auxiliar",
          hidden: false,
        },
      ],
      ["6. INDUCCIÓN ORGANIZACIONAL"]
    );

    expect(plan.requests).toEqual([
      {
        updateSheetProperties: {
          properties: {
            sheetId: 77,
            hidden: true,
          },
          fields: "hidden",
        },
      },
    ]);
    expect(plan.keptSheetIds).toEqual(
      new Map([["6. INDUCCION ORGANIZACIONAL", 42]])
    );
  });
});

describe("normalizeA1Range", () => {
  it("keeps a well-formed quoted organizational range unchanged", () => {
    expect(normalizeA1Range("'6. INDUCCIÓN ORGANIZACIONAL'!D7")).toBe(
      "'6. INDUCCIÓN ORGANIZACIONAL'!D7"
    );
  });

  it("repairs a missing closing quote before the A1 separator", () => {
    expect(normalizeA1Range("'6. INDUCCIÓN ORGANIZACIONAL!D7")).toBe(
      "'6. INDUCCIÓN ORGANIZACIONAL'!D7"
    );
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
        sheetName: "Hoja 1",
        rowIndex: 1,
        columnIndex: 0,
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
        sheetName: "Hoja 1",
        rowIndex: 1,
        columnIndex: 0,
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

describe("inspectFooterActaWrites", () => {
  it("reports whether the final footer marker is already applied", async () => {
    valuesGetMock
      .mockResolvedValueOnce({
        data: {
          values: [["www.recacolombia.org\nACTA ID: ABCD1234"]],
        },
      })
      .mockResolvedValueOnce({
        data: {
          values: [["www.recacolombia.org\nACTA ID: ABCD1234"]],
        },
      });

    await expect(
      inspectFooterActaWrites("spreadsheet-id", [
        { sheetName: "Hoja 1", actaRef: "ABCD1234" },
      ])
    ).resolves.toEqual([
      {
        sheetName: "Hoja 1",
        rowIndex: 0,
        columnIndex: 0,
        range: "'Hoja 1'!A1",
        value: "www.recacolombia.org\nACTA ID: ABCD1234",
        currentValue: "www.recacolombia.org\nACTA ID: ABCD1234",
        applied: true,
      },
    ]);
  });

  it("prefers the last footer match when stale anchors exist above the real footer", async () => {
    valuesGetMock.mockResolvedValue({
      data: {
        values: [
          ["Titulo"],
          ["www.recacolombia.org\nACTA ID: STALE123"],
          ["Contenido"],
          ["www.recacolombia.org"],
        ],
      },
    });

    await expect(
      resolveFooterActaWrites("spreadsheet-id", [
        { sheetName: "Hoja 1", actaRef: "REAL9999" },
      ])
    ).resolves.toEqual([
      {
        sheetName: "Hoja 1",
        rowIndex: 3,
        columnIndex: 0,
        range: "'Hoja 1'!A4",
        value: "www.recacolombia.org\nACTA ID: REAL9999",
      },
    ]);
  });
});

describe("buildFooterMutationMarkers", () => {
  it("calculates the expected footer row with row insertions above the footer", () => {
    expect(
      buildFooterMutationMarkers({
        footerWrites: [
          {
            sheetName: "Hoja 1",
            rowIndex: 20,
            columnIndex: 0,
            range: "'Hoja 1'!A21",
            value: "www.recacolombia.org\nACTA ID: ACTA1234",
          },
        ],
        footerActaRefs: [{ sheetName: "Hoja 1", actaRef: "ACTA1234" }],
        mutation: {
          rowInsertions: [
            {
              sheetName: "Hoja 1",
              insertAtRow: 10,
              count: 3,
              templateRow: 10,
            },
          ],
          templateBlockInsertions: [],
        },
      })
    ).toEqual([
      {
        sheetName: "Hoja 1",
        actaRef: "ACTA1234",
        initialRowIndex: 20,
        expectedFinalRowIndex: 23,
      },
    ]);
  });

  it("allows row insertions anchored immediately before the footer", () => {
    expect(
      buildFooterMutationMarkers({
        footerWrites: [
          {
            sheetName: "Hoja 1",
            rowIndex: 77,
            columnIndex: 0,
            range: "'Hoja 1'!A78",
            value: "www.recacolombia.org\nACTA ID: ACTA1234",
          },
        ],
        footerActaRefs: [{ sheetName: "Hoja 1", actaRef: "ACTA1234" }],
        mutation: {
          rowInsertions: [
            {
              sheetName: "Hoja 1",
              insertAtRow: 77,
              count: 1,
              templateRow: 77,
            },
          ],
          templateBlockInsertions: [],
        },
      })
    ).toEqual([
      {
        sheetName: "Hoja 1",
        actaRef: "ACTA1234",
        initialRowIndex: 77,
        expectedFinalRowIndex: 78,
      },
    ]);
  });

  it("calculates the expected footer row with template block insertions above the footer", () => {
    expect(
      buildFooterMutationMarkers({
        footerWrites: [
          {
            sheetName: "Hoja 1",
            rowIndex: 30,
            columnIndex: 0,
            range: "'Hoja 1'!A31",
            value: "www.recacolombia.org\nACTA ID: ACTA1234",
          },
        ],
        footerActaRefs: [{ sheetName: "Hoja 1", actaRef: "ACTA1234" }],
        mutation: {
          rowInsertions: [],
          templateBlockInsertions: [
            {
              sheetName: "Hoja 1",
              insertAtRow: 15,
              templateStartRow: 10,
              templateEndRow: 12,
              repeatCount: 2,
            },
          ],
        },
      })
    ).toEqual([
      {
        sheetName: "Hoja 1",
        actaRef: "ACTA1234",
        initialRowIndex: 30,
        expectedFinalRowIndex: 36,
      },
    ]);
  });

  it("allows template block insertions anchored immediately before the footer", () => {
    expect(
      buildFooterMutationMarkers({
        footerWrites: [
          {
            sheetName: "Hoja 1",
            rowIndex: 30,
            columnIndex: 0,
            range: "'Hoja 1'!A31",
            value: "www.recacolombia.org\nACTA ID: ACTA1234",
          },
        ],
        footerActaRefs: [{ sheetName: "Hoja 1", actaRef: "ACTA1234" }],
        mutation: {
          rowInsertions: [],
          templateBlockInsertions: [
            {
              sheetName: "Hoja 1",
              insertAtRow: 30,
              templateStartRow: 10,
              templateEndRow: 12,
              repeatCount: 1,
            },
          ],
        },
      })
    ).toEqual([
      {
        sheetName: "Hoja 1",
        actaRef: "ACTA1234",
        initialRowIndex: 30,
        expectedFinalRowIndex: 33,
      },
    ]);
  });

  it("allows row insertions when template block insertions already shifted the footer", () => {
    expect(
      buildFooterMutationMarkers({
        footerWrites: [
          {
            sheetName: "Hoja 1",
            rowIndex: 78,
            columnIndex: 0,
            range: "'Hoja 1'!A79",
            value: "www.recacolombia.org\nACTA ID: ACTA1234",
          },
        ],
        footerActaRefs: [{ sheetName: "Hoja 1", actaRef: "ACTA1234" }],
        mutation: {
          rowInsertions: [
            {
              sheetName: "Hoja 1",
              insertAtRow: 286,
              count: 1,
              templateRow: 283,
            },
          ],
          templateBlockInsertions: [
            {
              sheetName: "Hoja 1",
              insertAtRow: 75,
              templateStartRow: 23,
              templateEndRow: 74,
              repeatCount: 4,
            },
          ],
        },
      })
    ).toEqual([
      {
        sheetName: "Hoja 1",
        actaRef: "ACTA1234",
        initialRowIndex: 78,
        expectedFinalRowIndex: 287,
      },
    ]);
  });

  it("allows sequential row insertions when earlier row insertions already shifted the footer", () => {
    expect(
      buildFooterMutationMarkers({
        footerWrites: [
          {
            sheetName: "Maestro",
            rowIndex: 26,
            columnIndex: 0,
            range: "'Maestro'!A27",
            value: "www.recacolombia.org\nACTA ID: ACTA1234",
          },
        ],
        footerActaRefs: [{ sheetName: "Maestro", actaRef: "ACTA1234" }],
        mutation: {
          rowInsertions: [
            {
              sheetName: "Maestro",
              insertAtRow: 18,
              count: 3,
              templateRow: 18,
            },
            {
              sheetName: "Maestro",
              insertAtRow: 22,
              count: 3,
              templateRow: 22,
            },
            {
              sheetName: "Maestro",
              insertAtRow: 32,
              count: 2,
              templateRow: 31,
            },
          ],
          templateBlockInsertions: [],
        },
      })
    ).toEqual([
      {
        sheetName: "Maestro",
        actaRef: "ACTA1234",
        initialRowIndex: 26,
        expectedFinalRowIndex: 34,
      },
    ]);
  });

  it("fails when a later row insertion lands after the footer shifted by previous row insertions", () => {
    expect(() =>
      buildFooterMutationMarkers({
        footerWrites: [
          {
            sheetName: "Maestro",
            rowIndex: 26,
            columnIndex: 0,
            range: "'Maestro'!A27",
            value: "www.recacolombia.org\nACTA ID: ACTA1234",
          },
        ],
        footerActaRefs: [{ sheetName: "Maestro", actaRef: "ACTA1234" }],
        mutation: {
          rowInsertions: [
            {
              sheetName: "Maestro",
              insertAtRow: 18,
              count: 3,
              templateRow: 18,
            },
            {
              sheetName: "Maestro",
              insertAtRow: 22,
              count: 3,
              templateRow: 22,
            },
            {
              sheetName: "Maestro",
              insertAtRow: 33,
              count: 1,
              templateRow: 31,
            },
          ],
          templateBlockInsertions: [],
        },
      })
    ).toThrow(
      'La insercion estructural de "Maestro" ocurre despues del footer ACTA ID y no se puede reanudar de forma segura.'
    );
  });

  it("fails when a row insertion template still lands on or after the footer after block shifts", () => {
    expect(() =>
      buildFooterMutationMarkers({
        footerWrites: [
          {
            sheetName: "Hoja 1",
            rowIndex: 78,
            columnIndex: 0,
            range: "'Hoja 1'!A79",
            value: "www.recacolombia.org\nACTA ID: ACTA1234",
          },
        ],
        footerActaRefs: [{ sheetName: "Hoja 1", actaRef: "ACTA1234" }],
        mutation: {
          rowInsertions: [
            {
              sheetName: "Hoja 1",
              insertAtRow: 286,
              count: 1,
              templateRow: 287,
            },
          ],
          templateBlockInsertions: [
            {
              sheetName: "Hoja 1",
              insertAtRow: 75,
              templateStartRow: 23,
              templateEndRow: 74,
              repeatCount: 4,
            },
          ],
        },
      })
    ).toThrow(
      'La insercion estructural de "Hoja 1" reutiliza templateRow=287 con insertAtRow=286 sobre o despues del footer ACTA ID (footerRowIndex=286) y no se puede reanudar de forma segura.'
    );
  });

  it("fails when a structural insertion lands after the footer", () => {
    expect(() =>
      buildFooterMutationMarkers({
        footerWrites: [
          {
            sheetName: "Hoja 1",
            rowIndex: 20,
            columnIndex: 0,
            range: "'Hoja 1'!A21",
            value: "www.recacolombia.org\nACTA ID: ACTA1234",
          },
        ],
        footerActaRefs: [{ sheetName: "Hoja 1", actaRef: "ACTA1234" }],
        mutation: {
          rowInsertions: [
            {
              sheetName: "Hoja 1",
              insertAtRow: 21,
              count: 1,
            },
          ],
          templateBlockInsertions: [],
        },
      })
    ).toThrow(
      'La insercion estructural de "Hoja 1" ocurre despues del footer ACTA ID y no se puede reanudar de forma segura.'
    );
  });

  it("fails with structural context when templateRow lands on or after the footer", () => {
    expect(() =>
      buildFooterMutationMarkers({
        footerWrites: [
          {
            sheetName: "Hoja 1",
            rowIndex: 20,
            columnIndex: 0,
            range: "'Hoja 1'!A21",
            value: "www.recacolombia.org\nACTA ID: ACTA1234",
          },
        ],
        footerActaRefs: [{ sheetName: "Hoja 1", actaRef: "ACTA1234" }],
        mutation: {
          rowInsertions: [
            {
              sheetName: "Hoja 1",
              insertAtRow: 10,
              count: 1,
              templateRow: 21,
            },
          ],
          templateBlockInsertions: [],
        },
      })
    ).toThrow(
      'La insercion estructural de "Hoja 1" reutiliza templateRow=21 con insertAtRow=10 sobre o despues del footer ACTA ID (footerRowIndex=20) y no se puede reanudar de forma segura.'
    );
  });

  it("fails when a template block insertion lands after the footer", () => {
    expect(() =>
      buildFooterMutationMarkers({
        footerWrites: [
          {
            sheetName: "Hoja 1",
            rowIndex: 20,
            columnIndex: 0,
            range: "'Hoja 1'!A21",
            value: "www.recacolombia.org\nACTA ID: ACTA1234",
          },
        ],
        footerActaRefs: [{ sheetName: "Hoja 1", actaRef: "ACTA1234" }],
        mutation: {
          rowInsertions: [],
          templateBlockInsertions: [
            {
              sheetName: "Hoja 1",
              insertAtRow: 21,
              templateStartRow: 10,
              templateEndRow: 12,
              repeatCount: 1,
            },
          ],
        },
      })
    ).toThrow(
      'La insercion de bloques de "Hoja 1" ocurre despues del footer ACTA ID y no se puede reanudar de forma segura.'
    );
  });
});

describe("auditStructuralA1Writes", () => {
  it("reports a safe mutation when every write stays on one side of each structural anchor", () => {
    const report = auditStructuralA1Writes({
      writes: [
        { range: "'Hoja 1'!A10", value: "arriba" },
        { range: "'Hoja 1'!A12", value: "insertada" },
      ],
      rowInsertions: [
        {
          sheetName: "Hoja 1",
          insertAtRow: 10,
          count: 2,
          templateRow: 10,
        },
      ],
      templateBlockInsertions: [],
    });

    expect(report.safe).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.summary).toEqual([
      {
        sheetName: "Hoja 1",
        writeCount: 2,
        rowInsertionCount: 1,
        templateBlockInsertionCount: 0,
        structuralAnchorRows: [11],
      },
    ]);
  });

  it("flags writes that cross a row insertion anchor", () => {
    const report = auditStructuralA1Writes({
      writes: [{ range: "'Hoja 1'!A10:A11", value: "bloque" }],
      rowInsertions: [
        {
          sheetName: "Hoja 1",
          insertAtRow: 10,
          count: 1,
        },
      ],
      templateBlockInsertions: [],
    });

    expect(report.safe).toBe(false);
    expect(report.issues).toEqual([
      {
        sheetName: "Hoja 1",
        kind: "write_crosses_row_insertion_anchor",
        range: "'Hoja 1'!A10:A11",
        details: "El rango cruza la insercion de filas anclada en la fila 11.",
      },
    ]);
  });

  it("flags writes that cross a template block insertion anchor", () => {
    const report = auditStructuralA1Writes({
      writes: [{ range: "'Hoja 1'!A76:A77", value: "bloque" }],
      rowInsertions: [],
      templateBlockInsertions: [
        {
          sheetName: "Hoja 1",
          insertAtRow: 76,
          templateStartRow: 16,
          templateEndRow: 76,
          repeatCount: 1,
        },
      ],
    });

    expect(report.safe).toBe(false);
    expect(report.issues).toEqual([
      {
        sheetName: "Hoja 1",
        kind: "write_crosses_template_insertion_anchor",
        range: "'Hoja 1'!A76:A77",
        details:
          "El rango cruza la insercion del bloque template anclada en la fila 77.",
      },
    ]);
  });
});

describe("applyFooterActaTextFormat", () => {
  it("forces Arial 6 on the resolved footer cell", async () => {
    sheetsGetMock.mockResolvedValue({
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
    });

    await applyFooterActaTextFormat("spreadsheet-id", [
      {
        sheetName: "Hoja 1",
        rowIndex: 1,
        columnIndex: 0,
        range: "'Hoja 1'!A2",
        value: "www.recacolombia.org\nACTA ID: A7K29QF2",
      },
    ]);

    expect(batchUpdateMock).toHaveBeenCalledWith({
      spreadsheetId: "spreadsheet-id",
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 42,
                startRowIndex: 1,
                endRowIndex: 2,
                startColumnIndex: 0,
                endColumnIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    fontFamily: "Arial",
                    fontSize: 6,
                  },
                },
              },
              fields:
                "userEnteredFormat.textFormat.fontFamily,userEnteredFormat.textFormat.fontSize",
            },
          },
        ],
      },
    });
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

  it("desoculta primero la hoja objetivo aunque aparezca después en la metadata", () => {
    const plan = buildSheetVisibilityPlan(
      [
        { sheetId: 2, title: "Sensibilizacion", hidden: false },
        { sheetId: 1, title: "Presentacion", hidden: true },
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
