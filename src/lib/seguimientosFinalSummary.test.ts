import { describe, expect, it } from "vitest";
import {
  buildSeguimientosFinalFields,
  buildSeguimientosFinalFormulaSpec,
  evaluateSeguimientosFinalFormulas,
} from "@/lib/seguimientosFinalSummary";

describe("seguimientosFinalSummary", () => {
  it("keeps only the visible field spec for ponderado direct-write cells", () => {
    const spec = buildSeguimientosFinalFormulaSpec();

    expect(spec.formulaCells).toEqual([]);
    expect(spec.validationMode).toBe("direct_write_only");
    expect(spec.readFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cell: "D7",
          fieldKey: "nombre_empresa",
        }),
        expect.objectContaining({
          cell: "L20",
          fieldKey: "funcion_1",
        }),
        expect.objectContaining({
          cell: "R24",
          fieldKey: "funcion_10",
        }),
      ])
    );
  });

  it("treats the final summary as healthy when no canonical formulas remain", () => {
    const spec = buildSeguimientosFinalFormulaSpec();

    expect(evaluateSeguimientosFinalFormulas(spec, {})).toMatchObject({
      integrity: "healthy",
      mismatchedCells: [],
    });
  });

  it("builds the visible field map in a stable order", () => {
    const spec = buildSeguimientosFinalFormulaSpec();
    const fields = buildSeguimientosFinalFields(spec, {
      D6: "2026-04-21",
      Q6: "Presencial",
      L20: "Atender llamadas",
      R20: "Archivar soportes",
    });

    expect(Object.entries(fields).slice(0, 2)).toEqual([
      ["fecha_visita", "2026-04-21"],
      ["modalidad", "Presencial"],
    ]);
    expect(fields.funcion_1).toBe("Atender llamadas");
    expect(fields.funcion_6).toBe("Archivar soportes");
  });

  it("sanitizes direct-write error values coming from legacy formulas", () => {
    const spec = buildSeguimientosFinalFormulaSpec();
    const fields = buildSeguimientosFinalFields(spec, {
      K15: "#REF!",
      U18: "#VALUE!",
      L20: "#N/A",
    });

    expect(fields.nombre_vinculado).toBe("");
    expect(fields.discapacidad).toBe("");
    expect(fields.funcion_1).toBe("");
  });
});
