import { describe, expect, it, vi } from "vitest";
import {
  applyFormSheetMutation,
  buildAutoResizeRowGroups,
  buildSheetVisibilityPlan,
  type CellWrite,
} from "@/lib/google/sheets";

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
  it("ejecuta inserciones, writes, checkboxes y autoajuste en orden", async () => {
    const calls: string[] = [];

    await applyFormSheetMutation(
      "spreadsheet-id",
      {
        writes: [{ range: "'Hoja 1'!A1", value: "hola" }],
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
        insertRows: vi.fn(async () => {
          calls.push("insert");
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

    expect(calls).toEqual(["insert", "write", "checkbox", "resize"]);
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
