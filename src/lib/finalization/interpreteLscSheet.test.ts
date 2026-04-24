import { describe, expect, it } from "vitest";
import {
  INTERPRETE_LSC_SHEET_NAME,
  buildInterpreteLscSheetMutation,
  buildInterpreteLscStructuralMutation,
  deriveInterpreteLscStructure,
} from "@/lib/finalization/interpreteLscSheet";
import { normalizeInterpreteLscValues } from "@/lib/interpreteLsc";

function buildSection1Data() {
  return {
    fecha_visita: "2026-04-21",
    modalidad_interprete: "Presencial",
    modalidad_profesional_reca: "Virtual",
    nombre_empresa: "ACME SAS",
    ciudad_empresa: "Bogota",
    direccion_empresa: "Calle 1 # 2-3",
    nit_empresa: "900123456",
    contacto_empresa: "Laura Gomez",
    cargo: "Gerente",
    asesor: "Carlos Ruiz",
    sede_empresa: "Principal",
    profesional_asignado: "Marta Ruiz",
    correo_profesional: "marta@reca.com",
    correo_asesor: "carlos@reca.com",
    caja_compensacion: "Compensar",
  } as const;
}

function buildFormData(options?: {
  oferentes?: number;
  interpretes?: number;
  asistentes?: number;
}) {
  const oferentesCount = options?.oferentes ?? 1;
  const interpretesCount = options?.interpretes ?? 1;
  const asistentesCount = options?.asistentes ?? 2;

  return normalizeInterpreteLscValues({
    fecha_visita: "2026-04-21",
    modalidad_interprete: "Presencial",
    modalidad_profesional_reca: "Virtual",
    nit_empresa: "900123456",
    oferentes: Array.from({ length: oferentesCount }, (_, index) => ({
      nombre_oferente: `Oferente ${index + 1}`,
      cedula: `${1010 + index}`,
      proceso: `Proceso ${index + 1}`,
    })),
    interpretes: Array.from({ length: interpretesCount }, (_, index) => ({
      nombre: `Interprete ${index + 1}`,
      hora_inicial: "08:00",
      hora_final: `${String(10 + index).padStart(2, "0")}:00`,
    })),
    sabana: { activo: true, horas: 2 },
    asistentes: Array.from({ length: asistentesCount }, (_, index) => ({
      nombre: `Asistente ${index + 1}`,
      cargo: index === 0 ? "Profesional RECA" : `Cargo ${index + 1}`,
    })),
  });
}

function getWriteValue(
  writes: Array<{ range: string; value: string | number | boolean }>,
  cell: string
) {
  return writes.find((write) => write.range === `'${INTERPRETE_LSC_SHEET_NAME}'!${cell}`)
    ?.value;
}

describe("buildInterpreteLscSheetMutation", () => {
  it("writes the base 1 / 1 / 2 layout without structural insertions", () => {
    const formData = buildFormData();

    const mutation = buildInterpreteLscSheetMutation({
      section1Data: buildSection1Data(),
      formData,
    });

    expect(mutation.rowInsertions).toEqual([]);
    expect(getWriteValue(mutation.writes, "D6")).toBe("2026-04-21");
    expect(getWriteValue(mutation.writes, "B12")).toBe("Oferente 1");
    expect(getWriteValue(mutation.writes, "D19")).toBe("Interprete 1");
    expect(getWriteValue(mutation.writes, "Q20")).toBe("2:00 Hora");
    expect(getWriteValue(mutation.writes, "Q21")).toBe("4:00");
    expect(getWriteValue(mutation.writes, "C25")).toBe("Asistente 1");
    expect(getWriteValue(mutation.writes, "K26")).toBe("Cargo 2");
  });

  it("inserts extra oferentes before the interpreter block", () => {
    const mutation = buildInterpreteLscStructuralMutation({
      oferentesCount: 8,
      interpretesCount: 1,
      asistentesCount: 2,
    });

    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: INTERPRETE_LSC_SHEET_NAME,
        insertAtRow: 18,
        count: 1,
        templateRow: 18,
      },
    ]);

    const formData = buildFormData({ oferentes: 8 });
    const writes = buildInterpreteLscSheetMutation({
      section1Data: buildSection1Data(),
      formData,
    }).writes;

    expect(getWriteValue(writes, "D20")).toBe("Interprete 1");
    expect(getWriteValue(writes, "Q21")).toBe("2:00 Hora");
    expect(getWriteValue(writes, "Q22")).toBe("4:00");
  });

  it("moves Sabana, Sumatoria and asistentes when interpretes exceed the base slot", () => {
    const mutation = buildInterpreteLscStructuralMutation({
      oferentesCount: 1,
      interpretesCount: 2,
      asistentesCount: 2,
    });

    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: INTERPRETE_LSC_SHEET_NAME,
        insertAtRow: 19,
        count: 1,
        templateRow: 19,
      },
    ]);

    const formData = buildFormData({ interpretes: 2 });
    const writes = buildInterpreteLscSheetMutation({
      section1Data: buildSection1Data(),
      formData,
    }).writes;

    expect(getWriteValue(writes, "D20")).toBe("Interprete 2");
    expect(getWriteValue(writes, "Q21")).toBe("2:00 Hora");
    expect(getWriteValue(writes, "Q22")).toBe("7:00");
    expect(getWriteValue(writes, "C26")).toBe("Asistente 1");
  });

  it("inserts extra asistentes before the footer block", () => {
    const mutation = buildInterpreteLscStructuralMutation({
      oferentesCount: 1,
      interpretesCount: 1,
      asistentesCount: 3,
    });

    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: INTERPRETE_LSC_SHEET_NAME,
        insertAtRow: 26,
        count: 1,
        templateRow: 25,
      },
    ]);
  });

  it("keeps the row insertion order fixed for the combined 10 / 5 / 10 case", () => {
    const mutation = buildInterpreteLscStructuralMutation({
      oferentesCount: 10,
      interpretesCount: 5,
      asistentesCount: 10,
    });

    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: INTERPRETE_LSC_SHEET_NAME,
        insertAtRow: 18,
        count: 3,
        templateRow: 18,
      },
      {
        sheetName: INTERPRETE_LSC_SHEET_NAME,
        insertAtRow: 22,
        count: 4,
        templateRow: 22,
      },
      {
        sheetName: INTERPRETE_LSC_SHEET_NAME,
        insertAtRow: 33,
        count: 8,
        templateRow: 32,
      },
    ]);
  });

  it("reanchors aggressive asistentes overflow to the first reusable attendee row", () => {
    const mutation = buildInterpreteLscStructuralMutation({
      oferentesCount: 10,
      interpretesCount: 5,
      asistentesCount: 4,
    });

    expect(mutation.rowInsertions).toEqual([
      {
        sheetName: INTERPRETE_LSC_SHEET_NAME,
        insertAtRow: 18,
        count: 3,
        templateRow: 18,
      },
      {
        sheetName: INTERPRETE_LSC_SHEET_NAME,
        insertAtRow: 22,
        count: 4,
        templateRow: 22,
      },
      {
        sheetName: INTERPRETE_LSC_SHEET_NAME,
        insertAtRow: 33,
        count: 2,
        templateRow: 32,
      },
    ]);
  });

  it("recomputes total_tiempo and sumatoria_horas instead of trusting tampered payload values", () => {
    const formData = buildFormData();
    formData.interpretes[0] = {
      ...formData.interpretes[0],
      total_tiempo: "99:99",
    };
    formData.sumatoria_horas = "88:88";

    const mutation = buildInterpreteLscSheetMutation({
      section1Data: buildSection1Data(),
      formData,
    });

    expect(getWriteValue(mutation.writes, "Q19")).toBe("2:00");
    expect(getWriteValue(mutation.writes, "Q21")).toBe("4:00");
  });

  it("derives prewarm signature and structural mutation from the same LSC structure source", () => {
    const structure = deriveInterpreteLscStructure({
      oferentesCount: 8,
      interpretesCount: 2,
      asistentesCount: 3,
    });

    expect(structure.repeatedCounts).toEqual({
      oferentes: 8,
      interpretes: 2,
      asistentes: 3,
    });
    expect(structure.signatureEntries).toEqual([
      ["oferentesOverflow", 1],
      ["interpretesOverflow", 1],
      ["asistentesOverflow", 1],
    ]);
    expect(
      buildInterpreteLscStructuralMutation(structure.structuralMutationInput).rowInsertions
    ).toEqual([
      {
        sheetName: INTERPRETE_LSC_SHEET_NAME,
        insertAtRow: 18,
        count: 1,
        templateRow: 18,
      },
      {
        sheetName: INTERPRETE_LSC_SHEET_NAME,
        insertAtRow: 20,
        count: 1,
        templateRow: 20,
      },
      {
        sheetName: INTERPRETE_LSC_SHEET_NAME,
        insertAtRow: 28,
        count: 1,
        templateRow: 27,
      },
    ]);
  });
});
