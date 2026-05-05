import { describe, it, expect } from "vitest";
import { extractPdfGeneralFields, extractPdfNits, extractPdfParticipants, extractPdfAsistentesCandidates } from "./generalPdfParser";

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

describe("extractPdfParticipants", () => {
  it("extracts oferentes from table-style selection PDF text", () => {
    const text = `2. DATOS DEL OFERENTE
NOMBRE OFERENTE CEDULA TIPO DE DISCAPACIDAD CARGO
Ana Gomez 100000001 Auditiva Auxiliar administrativo
Luis Martinez 100000002 Visual Analista
Marta Rios 100000003 Fisica Operaria
3. DESARROLLO DE LA ACTIVIDAD`;

    const participants = extractPdfParticipants(text);

    expect(participants).toHaveLength(3);
    expect(participants[0]).toMatchObject({
      nombre_usuario: "Ana Gomez",
      cedula_usuario: "100000001",
      discapacidad_usuario: "Auditiva",
    });
  });

  it("extracts vinculados from table-style hiring PDF text", () => {
    const text = `2. DATOS DEL VINCULADO
NOMBRE VINCULADO CEDULA TIPO DE DISCAPACIDAD CARGO
Carlos Perez 200000001 Auditiva Auxiliar logistico
Laura Diaz 200000002 Visual Cajera
Nora Ruiz 200000003 Cognitiva Asistente
3. DATOS ADICIONALES`;

    const participants = extractPdfParticipants(text);

    expect(participants.map((p) => p.cedula_usuario)).toEqual([
      "200000001",
      "200000002",
      "200000003",
    ]);
  });

  it("deduplicates table participants by cedula", () => {
    const text = `2. DATOS DEL OFERENTE
NOMBRE OFERENTE CEDULA TIPO DE DISCAPACIDAD CARGO
Ana Gomez 100000001 Auditiva Auxiliar administrativo
Ana Gomez 100000001 Auditiva Auxiliar administrativo
Luis Martinez 100000002 Visual Analista
3. DESARROLLO DE LA ACTIVIDAD`;

    const participants = extractPdfParticipants(text);

    expect(participants.map((p) => p.cedula_usuario)).toEqual([
      "100000001",
      "100000002",
    ]);
  });

  it("returns empty when no participants table is present", () => {
    const text = `1. DATOS DE LA EMPRESA
Nombre de la Empresa: TechCorp
3. DESARROLLO DE LA ACTIVIDAD`;

    expect(extractPdfParticipants(text)).toEqual([]);
  });
});
