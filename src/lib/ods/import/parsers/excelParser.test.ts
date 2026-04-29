import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSheetToJson = vi.fn();
const mockRead = vi.fn();

vi.mock("xlsx", () => ({
  read: (...args: unknown[]) => mockRead(...args),
  utils: { sheet_to_json: (...args: unknown[]) => mockSheetToJson(...args) },
}));

import { parseActaExcel } from "@/lib/ods/import/parsers/excelParser";

function makeWorkbook(sheets: Record<string, unknown[][]>) {
  const workbook = {
    SheetNames: Object.keys(sheets),
    Sheets: {} as Record<string, unknown>,
  };
  for (const [name, rows] of Object.entries(sheets)) {
    workbook.Sheets[name] = rows;
  }
  return workbook;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseActaExcel", () => {
  it("happy path: extrae NIT + nombre + fecha + 1 participante", async () => {
    const workbook = makeWorkbook({
      Acta: [
        ["Numero de NIT:", "900123456"],
        ["Nombre de la empresa:", "TechCorp SAS"],
        ["Fecha de la visita:", "15/03/2026"],
        ["Modalidad:", "Virtual"],
        ["Nombre vinculado", "Cedula", "Discapacidad", "Genero"],
        ["Juan Perez", "12345678", "Visual", "Masculino"],
        ["Maria Lopez", "87654321", "Auditiva", "Femenino"],
      ],
    });

    mockRead.mockReturnValue(workbook);
    mockSheetToJson.mockImplementation((sheet) => sheet);

    const result = await parseActaExcel(new ArrayBuffer(0), "test.xlsx");

    expect(result.nit_empresa).toBe("900123456");
    expect(result.nombre_empresa).toBe("TechCorp SAS");
    expect(result.fecha_servicio).toBe("2026-03-15");
    expect(result.modalidad_servicio).toBe("Virtual");
    expect(result.participantes.length).toBe(2);
    expect(result.participantes[0].cedula_usuario).toBe("12345678");
    expect(result.participantes[0].nombre_usuario).toBe("Juan Perez");
    expect(result.participantes[1].cedula_usuario).toBe("87654321");
    expect(result.participantes[1].nombre_usuario).toBe("Maria Lopez");
    expect(result.warnings).toEqual([]);
  });

  it("edge case: cedula con porcentaje (cedula+%)", async () => {
    const workbook = makeWorkbook({
      Acta: [
        ["Numero de NIT:", "800987654"],
        ["Nombre de la empresa:", "Empresa Prueba"],
        ["Fecha de la visita:", "01/06/2026"],
        ["Nombre vinculado", "Cedula", "Discapacidad", "Genero"],
        ["Carlos Ruiz", "11111111%", "Fisica", "Masculino"],
      ],
    });

    mockRead.mockReturnValue(workbook);
    mockSheetToJson.mockImplementation((sheet) => sheet);

    const result = await parseActaExcel(new ArrayBuffer(0), "cedula_pct.xlsx");

    expect(result.participantes.length).toBe(1);
    expect(result.participantes[0].cedula_usuario).toBe("11111111");
  });

  it("edge case: falta modalidad genera warning", async () => {
    const workbook = makeWorkbook({
      Acta: [
        ["Numero de NIT:", "700111222"],
        ["Nombre de la empresa:", "Sin Modalidad"],
        ["Fecha de la visita:", "10/01/2026"],
        ["Nombre vinculado", "Cedula"],
        ["Ana Gomez", "22222222"],
      ],
    });

    mockRead.mockReturnValue(workbook);
    mockSheetToJson.mockImplementation((sheet) => sheet);

    const result = await parseActaExcel(new ArrayBuffer(0), "no_modalidad.xlsx");

    expect(result.modalidad_servicio).toBe("");
    expect(result.warnings).toEqual([]);
  });

  it("edge case: sin NIT genera warning", async () => {
    const workbook = makeWorkbook({
      Acta: [
        ["Nombre de la empresa:", "Sin NIT"],
        ["Fecha de la visita:", "20/02/2026"],
      ],
    });

    mockRead.mockReturnValue(workbook);
    mockSheetToJson.mockImplementation((sheet) => sheet);

    const result = await parseActaExcel(new ArrayBuffer(0), "no_nit.xlsx");

    expect(result.nit_empresa).toBe("");
    expect(result.warnings).toContain("No se detecto NIT en el archivo.");
  });

  it("deduplicates participants by cedula", async () => {
    const workbook = makeWorkbook({
      Acta: [
        ["Numero de NIT:", "900123456"],
        ["Fecha de la visita:", "01/01/2026"],
        ["Nombre vinculado", "Cedula"],
        ["Juan Perez", "12345678"],
        ["Juan Perez Dup", "12345678"],
        ["Maria Lopez", "87654321"],
      ],
    });

    mockRead.mockReturnValue(workbook);
    mockSheetToJson.mockImplementation((sheet) => sheet);

    const result = await parseActaExcel(new ArrayBuffer(0), "dedup.xlsx");

    expect(result.participantes.length).toBe(2);
    const cedulas = result.participantes.map((p) => p.cedula_usuario);
    expect(cedulas).toContain("12345678");
    expect(cedulas).toContain("87654321");
  });

  it("handles multiple sheets", async () => {
    const workbook = makeWorkbook({
      Sheet1: [
        ["Numero de NIT:", "900123456"],
        ["Nombre de la empresa:", "MultiSheet Corp"],
        ["Fecha de la visita:", "05/05/2026"],
      ],
      Sheet2: [
        ["Nombre vinculado", "Cedula"],
        ["Pedro Diaz", "33333333"],
      ],
    });

    mockRead.mockReturnValue(workbook);
    mockSheetToJson.mockImplementation((sheet) => sheet);

    const result = await parseActaExcel(new ArrayBuffer(0), "multi.xlsx");

    expect(result.nit_empresa).toBe("900123456");
    expect(result.nombre_empresa).toBe("MultiSheet Corp");
    expect(result.participantes.length).toBe(1);
    expect(result.participantes[0].cedula_usuario).toBe("33333333");
  });
});
