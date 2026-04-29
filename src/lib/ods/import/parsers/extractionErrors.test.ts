import { describe, it, expect } from "vitest";
import { createExtractionErrors, hasErrors, errorSummary } from "./extractionErrors";

describe("ExtractionErrors", () => {
  it("creates empty errors", () => {
    const errors = createExtractionErrors();
    expect(errors).toEqual({});
  });

  it("hasErrors returns false for empty", () => {
    expect(hasErrors(createExtractionErrors())).toBe(false);
  });

  it("hasErrors returns true when errors exist", () => {
    const errors = createExtractionErrors();
    errors.nit_empresa = { reason: "Not found", attempted_patterns: ["nit regex"] };
    expect(hasErrors(errors)).toBe(true);
  });

  it("errorSummary returns message for single error", () => {
    const errors = createExtractionErrors();
    errors.nombre_empresa = { reason: "Not found" };
    expect(errorSummary(errors)).toContain("nombre_empresa");
  });

  it("errorSummary returns count for multiple errors", () => {
    const errors = createExtractionErrors();
    errors.nit_empresa = { reason: "Not found", attempted_patterns: [] };
    errors.fecha_servicio = { reason: "Invalid format" };
    expect(errorSummary(errors)).toContain("2 campo(s)");
  });
});
