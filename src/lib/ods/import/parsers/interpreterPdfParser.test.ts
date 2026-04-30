import { describe, it, expect } from "vitest";
import { parseInterpreterPdf } from "./interpreterPdfParser";

describe("parseInterpreterPdf", () => {
  it("parses interpreter PDF fields", () => {
    const firstPage = "Numero de nit: 123456789\nNombre de la empresa: TechCorp";
    const fullText = `1. datos de la empresa fecha: 15/03/2026
nombre de la empresa: TechCorp SAS
direccion: Calle 123
modalidad servicio: Virtual
nombre interprete: Ana Interpreter
2. datos de los oferentes/ vinculados
1 Juan Perez 12345678 Proceso de seleccion
SUMATORIA HORAS INTERPRETES: 2 horas`;

    const result = parseInterpreterPdf(firstPage, fullText, "/path/to/file.pdf");
    expect(result.fecha_servicio).toBe("2026-03-15");
    expect(result.modalidad_servicio).toBe("Virtual");
    expect(result.interpretes).toContain("Ana Interpreter");
    expect(result.file_path).toBe("/path/to/file.pdf");
  });

  it("detects fallido", () => {
    const fullText = "visita fallido del interprete";
    const result = parseInterpreterPdf("", fullText, "/path.pdf");
    expect(result.is_fallido).toBe(true);
  });

  it("generates warnings for missing fields", () => {
    const result = parseInterpreterPdf("", "", "/path.pdf");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
