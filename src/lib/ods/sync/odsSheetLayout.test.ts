import { describe, it, expect } from "vitest";
import {
  ODS_INPUT_HEADERS,
  boolToSiNo,
  columnLetter,
  odsInputRowFromRecord,
  resolveMonthlySpreadsheetName,
  toSheetNumberOrBlank,
  toSheetText,
} from "./odsSheetLayout";

describe("odsSheetLayout", () => {
  it("ODS_INPUT_HEADERS preserva orden y cantidad legacy (25 columnas)", () => {
    expect(ODS_INPUT_HEADERS.length).toBe(25);
    expect(ODS_INPUT_HEADERS[0]).toBe("ID");
    expect(ODS_INPUT_HEADERS[24]).toBe("AÑO");
  });

  it("resolveMonthlySpreadsheetName produce el formato legacy", () => {
    expect(resolveMonthlySpreadsheetName(2, 2026)).toBe("ODS_FEB_2026");
    expect(resolveMonthlySpreadsheetName(4, 2026)).toBe("ODS_APR_2026");
    expect(resolveMonthlySpreadsheetName(12, 2027)).toBe("ODS_DEC_2027");
  });

  it("resolveMonthlySpreadsheetName lanza con mes/año inválido", () => {
    expect(() => resolveMonthlySpreadsheetName(13, 2026)).toThrow(/Mes invalido/);
    expect(() => resolveMonthlySpreadsheetName(0, 2026)).toThrow(/Mes invalido/);
    expect(() => resolveMonthlySpreadsheetName(4, 1999)).toThrow(/Ano invalido/);
  });

  it("boolToSiNo cubre booleanos y strings comunes", () => {
    expect(boolToSiNo(true)).toBe("SI");
    expect(boolToSiNo(false)).toBe("NO");
    expect(boolToSiNo("si")).toBe("SI");
    expect(boolToSiNo("Sí")).toBe("SI");
    expect(boolToSiNo("true")).toBe("SI");
    expect(boolToSiNo("1")).toBe("SI");
    expect(boolToSiNo("no")).toBe("NO");
    expect(boolToSiNo("")).toBe("NO");
    expect(boolToSiNo(null)).toBe("NO");
  });

  it("toSheetText nullea blanks y stringifica", () => {
    expect(toSheetText(null)).toBe("");
    expect(toSheetText(undefined)).toBe("");
    expect(toSheetText("")).toBe("");
    expect(toSheetText("hola")).toBe("hola");
    expect(toSheetText(42)).toBe("42");
  });

  it("toSheetNumberOrBlank devuelve numero o blank", () => {
    expect(toSheetNumberOrBlank(null)).toBe("");
    expect(toSheetNumberOrBlank("")).toBe("");
    expect(toSheetNumberOrBlank("abc")).toBe("");
    expect(toSheetNumberOrBlank(2.5)).toBe(2.5);
    expect(toSheetNumberOrBlank("1.5")).toBe(1.5);
  });

  it("columnLetter mapea 1-based a A1 notation", () => {
    expect(columnLetter(1)).toBe("A");
    expect(columnLetter(25)).toBe("Y");
    expect(columnLetter(26)).toBe("Z");
    expect(columnLetter(27)).toBe("AA");
  });

  it("odsInputRowFromRecord respeta orden y coercion exactos del legacy", () => {
    const row = {
      id: "uuid-1",
      nombre_profesional: "Andres Eduardo",
      codigo_servicio: "86",
      nombre_empresa: "CORONA INDUSTRIAL SAS",
      nit_empresa: "900696296-4",
      caja_compensacion: "No Compensar",
      fecha_servicio: "2026-04-22",
      nombre_usuario: "Aaron Uyaban;Sara Zambrano",
      cedula_usuario: "1032481117;1018478208",
      discapacidad_usuario: "Intelectual;Visual",
      fecha_ingreso: "",
      observaciones: "Interprete 1 X 1 h",
      modalidad_servicio: "Todas las modalidades",
      orden_clausulada: false,
      genero_usuario: "Hombre;Mujer",
      tipo_contrato: "",
      asesor_empresa: "Deimi Yisela Torres Reyes",
      sede_empresa: "Principal",
      observacion_agencia: "",
      seguimiento_servicio: "",
      cargo_servicio: "Auxiliar",
      total_personas: 2,
      horas_interprete: 2.5,
      mes_servicio: 4,
      ano_servicio: 2026,
    };
    const out = odsInputRowFromRecord(row);
    expect(out).toHaveLength(25);
    expect(out[0]).toBe("uuid-1");
    expect(out[1]).toBe("Andres Eduardo");
    expect(out[4]).toBe("900696296-4"); // NIT con guion
    expect(out[12]).toBe("Todas las modalidades");
    expect(out[13]).toBe("NO"); // orden_clausulada false → NO
    expect(out[21]).toBe(2); // total_personas como int
    expect(out[22]).toBe(2.5); // horas_interprete numerico
    expect(out[23]).toBe(4); // mes
    expect(out[24]).toBe(2026); // año
  });

  it("odsInputRowFromRecord soporta alias 'año_servicio' (con tilde)", () => {
    const row = {
      id: "uuid-2",
      mes_servicio: 12,
      año_servicio: 2025, // alias con tilde
      total_personas: 0,
      orden_clausulada: true,
    };
    const out = odsInputRowFromRecord(row);
    expect(out[24]).toBe(2025);
    expect(out[23]).toBe(12);
    expect(out[13]).toBe("SI");
  });

  it("odsInputRowFromRecord trata horas_interprete null como blank, no 0", () => {
    const row = { id: "x", total_personas: 0, mes_servicio: 4, ano_servicio: 2026, horas_interprete: null };
    const out = odsInputRowFromRecord(row);
    expect(out[22]).toBe(""); // blank, no 0 (preserva diferencia entre "no aplica" y "0 horas")
  });
});
