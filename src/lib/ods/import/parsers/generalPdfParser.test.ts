import { describe, it, expect } from "vitest";
import { extractPdfGeneralFields, extractPdfNits, extractPdfAsistentesCandidates } from "./generalPdfParser";

describe("extractPdfGeneralFields", () => {
  it("extracts empresa, fecha, modalidad from header", () => {
    const text = `Fecha de la Visita: 15/03/2026
Modalidad: Virtual
Nombre de la Empresa: TechCorp SAS
Ciudad/Municipio: Bogota`;
    const result = extractPdfGeneralFields(text);
    expect(result.empresa).toBe("TechCorp SAS");
    expect(result.fecha_servicio).toBe("2026-03-15");
    expect(result.modalidad).toBe("Virtual");
  });

  it("extracts modalidad from inline format", () => {
    const text = `15/03/2026 Modalidad: Presencial`;
    const result = extractPdfGeneralFields(text);
    expect(result.modalidad).toBe("Presencial");
  });
});

describe("extractPdfNits", () => {
  it("extracts labeled NIT", () => {
    const text = "Numero de NIT: 123456789-1";
    expect(extractPdfNits(text)).toEqual(["123456789-1"]);
  });

  it("extracts bare NIT (not phone number)", () => {
    const text = "Empresa con NIT 987654321";
    expect(extractPdfNits(text)).toEqual(["987654321"]);
  });

  it("skips phone numbers starting with 3", () => {
    const text = "Contacto: 3101234567";
    expect(extractPdfNits(text)).toEqual([]);
  });
});

describe("extractPdfAsistentesCandidates", () => {
  it("extracts names from asistentes section", () => {
    const text = `5. ASISTENTES
Nombre completo: Juan Perez Cargo: Psicologo
Nombre completo: Maria Garcia Cargo: Coordinador`;
    const candidates = extractPdfAsistentesCandidates(text);
    expect(candidates).toContain("Juan Perez");
    expect(candidates).toContain("Maria Garcia");
  });

  it("returns empty when no asistentes section", () => {
    const text = "Some random content without asistentes";
    expect(extractPdfAsistentesCandidates(text)).toEqual([]);
  });
});
