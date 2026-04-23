import { describe, expect, it } from "vitest";

import {
  calculateInterpreteLscSumatoria,
  calculateInterpreteLscTotalTiempo,
  formatInterpreteLscSabanaValue,
  getDefaultInterpreteLscValues,
  normalizeInterpreteLscTime,
  normalizeInterpreteLscValues,
} from "@/lib/interpreteLsc";
import {
  INTERPRETE_LSC_MAX_ASISTENTES,
  INTERPRETE_LSC_MAX_INTERPRETES,
  INTERPRETE_LSC_MAX_OFERENTES,
  interpreteLscSchema,
} from "@/lib/validations/interpreteLsc";

function createEmpresa() {
  return {
    id: "empresa-1",
    nombre_empresa: "Empresa Uno",
    nit_empresa: "9001",
    direccion_empresa: null,
    ciudad_empresa: null,
    sede_empresa: null,
    zona_empresa: null,
    correo_1: null,
    contacto_empresa: null,
    telefono_empresa: null,
    cargo: null,
    profesional_asignado: "Profesional RECA",
    correo_profesional: null,
    asesor: null,
    correo_asesor: null,
    caja_compensacion: null,
  };
}

function createValidValues() {
  return normalizeInterpreteLscValues(
    {
      fecha_visita: "2026-04-22",
      modalidad_interprete: "Presencial",
      modalidad_profesional_reca: "Virtual",
      nit_empresa: "9001",
      oferentes: [
        {
          nombre_oferente: "Ana Perez",
          cedula: "123",
          proceso: "Vinculacion",
        },
      ],
      interpretes: [
        {
          nombre: "Luis Mora",
          hora_inicial: "9",
          hora_final: "10:30",
        },
      ],
      asistentes: [
        { nombre: "Profesional RECA", cargo: "Profesional RECA" },
        { nombre: "Invitado", cargo: "Talento humano" },
      ],
    },
    createEmpresa()
  );
}

describe("interpreteLsc helpers", () => {
  it("builds defaults with empresa metadata baked in", () => {
    const values = getDefaultInterpreteLscValues(createEmpresa());

    expect(values.nit_empresa).toBe("9001");
    expect(values.modalidad_interprete).toBe("Presencial");
    expect(values.asistentes).toEqual([
      { nombre: "Profesional RECA", cargo: "" },
      { nombre: "", cargo: "" },
    ]);
  });

  it("merges restored values over stable defaults and recalculates totals", () => {
    const values = normalizeInterpreteLscValues(
      {
        modalidad_interprete: "Mixto",
        modalidad_profesional_reca: "No aplica",
        interpretes: [
          {
            nombre: "Luis Mora",
            hora_inicial: "930",
            hora_final: "11 15",
            total_tiempo: "99:99",
          },
        ],
        sabana: {
          activo: true,
          horas: 1.5,
        },
        asistentes: [{ nombre: "Invitado", cargo: "Talento humano" }],
      },
      createEmpresa()
    );

    expect(values.fecha_visita).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(values.modalidad_interprete).toBe("Mixta");
    expect(values.modalidad_profesional_reca).toBe("No aplica");
    expect(values.interpretes[0]).toEqual({
      nombre: "Luis Mora",
      hora_inicial: "09:30",
      hora_final: "11:15",
      total_tiempo: "1:45",
    });
    expect(values.sumatoria_horas).toBe("3:15");
    expect(values.asistentes).toEqual([
      { nombre: "Invitado", cargo: "Talento humano" },
      { nombre: "", cargo: "" },
    ]);
  });

  it("normalizes supported legacy time formats", () => {
    expect(normalizeInterpreteLscTime("9")).toBe("09:00");
    expect(normalizeInterpreteLscTime("930")).toBe("09:30");
    expect(normalizeInterpreteLscTime("9:30")).toBe("09:30");
    expect(normalizeInterpreteLscTime("9 30")).toBe("09:30");
    expect(normalizeInterpreteLscTime("9 30 am")).toBe("09:30");
    expect(normalizeInterpreteLscTime("930 pm")).toBe("21:30");
    expect(normalizeInterpreteLscTime("21:30")).toBe("21:30");
    expect(normalizeInterpreteLscTime("bad")).toBe("");
  });

  it("supports overnight interpreter durations", () => {
    expect(calculateInterpreteLscTotalTiempo("11:30 pm", "1:15 am")).toBe(
      "1:45"
    );
  });

  it("calculates sumatoria with and without sabana", () => {
    const interpretes = [
      {
        nombre: "Luis Mora",
        hora_inicial: "09:00",
        hora_final: "10:30",
        total_tiempo: "1:30",
      },
      {
        nombre: "Sara Diaz",
        hora_inicial: "11:00",
        hora_final: "12:15",
        total_tiempo: "1:15",
      },
    ];

    expect(
      calculateInterpreteLscSumatoria(interpretes, { activo: false, horas: 1 })
    ).toBe("2:45");
    expect(
      calculateInterpreteLscSumatoria(interpretes, { activo: true, horas: 1.5 })
    ).toBe("4:15");
  });

  it("formats sabana for business payloads", () => {
    expect(formatInterpreteLscSabanaValue({ activo: false, horas: 1 })).toBe(
      "No aplica"
    );
    expect(formatInterpreteLscSabanaValue({ activo: true, horas: 1.5 })).toBe(
      "1:30 Hora"
    );
  });
});

describe("interpreteLscSchema", () => {
  it("requires fecha, modalidades and nit empresa", () => {
    const result = interpreteLscSchema.safeParse({
      ...createValidValues(),
      fecha_visita: "",
      modalidad_interprete: undefined,
      modalidad_profesional_reca: undefined,
      nit_empresa: "",
    });

    expect(result.success).toBe(false);

    const issues = result.success ? [] : result.error.issues;
    expect(issues.some((issue) => issue.path.join(".") === "fecha_visita")).toBe(
      true
    );
    expect(
      issues.some((issue) => issue.path.join(".") === "modalidad_interprete")
    ).toBe(true);
    expect(
      issues.some(
        (issue) => issue.path.join(".") === "modalidad_profesional_reca"
      )
    ).toBe(true);
    expect(issues.some((issue) => issue.path.join(".") === "nit_empresa")).toBe(
      true
    );
  });

  it("requires at least one meaningful oferente and interprete", () => {
    const result = interpreteLscSchema.safeParse({
      ...createValidValues(),
      oferentes: [{ nombre_oferente: "", cedula: "", proceso: "" }],
      interpretes: [
        { nombre: "", hora_inicial: "", hora_final: "", total_tiempo: "" },
      ],
    });

    expect(result.success).toBe(false);

    const issues = result.success ? [] : result.error.issues;
    expect(issues.some((issue) => issue.path.join(".") === "oferentes")).toBe(
      true
    );
    expect(issues.some((issue) => issue.path.join(".") === "interpretes")).toBe(
      true
    );
  });

  it("flags partial rows field by field", () => {
    const result = interpreteLscSchema.safeParse({
      ...createValidValues(),
      oferentes: [{ nombre_oferente: "Ana Perez", cedula: "", proceso: "" }],
      interpretes: [
        {
          nombre: "Luis Mora",
          hora_inicial: "09:00",
          hora_final: "",
          total_tiempo: "",
        },
      ],
      asistentes: [
        { nombre: "Profesional RECA", cargo: "Profesional RECA" },
        { nombre: "Invitado", cargo: "" },
      ],
    });

    expect(result.success).toBe(false);

    const issues = result.success ? [] : result.error.issues;
    expect(issues.some((issue) => issue.path.join(".") === "oferentes.0.cedula")).toBe(
      true
    );
    expect(issues.some((issue) => issue.path.join(".") === "oferentes.0.proceso")).toBe(
      true
    );
    expect(
      issues.some((issue) => issue.path.join(".") === "interpretes.0.hora_final")
    ).toBe(true);
    expect(
      issues.some((issue) => issue.path.join(".") === "asistentes.1.cargo")
    ).toBe(true);
  });

  it("enforces maximum repeated rows", () => {
    const result = interpreteLscSchema.safeParse({
      ...createValidValues(),
      oferentes: Array.from({ length: INTERPRETE_LSC_MAX_OFERENTES + 1 }, (_, index) => ({
        nombre_oferente: `Oferente ${index + 1}`,
        cedula: `${index + 1}`,
        proceso: "Vinculacion",
      })),
      interpretes: Array.from(
        { length: INTERPRETE_LSC_MAX_INTERPRETES + 1 },
        (_, index) => ({
          nombre: `Interprete ${index + 1}`,
          hora_inicial: "09:00",
          hora_final: "10:00",
          total_tiempo: "1:00",
        })
      ),
      asistentes: Array.from(
        { length: INTERPRETE_LSC_MAX_ASISTENTES + 1 },
        (_, index) => ({
          nombre: `Asistente ${index + 1}`,
          cargo: "Cargo",
        })
      ),
    });

    expect(result.success).toBe(false);

    const fieldErrors = result.success ? {} : result.error.flatten().fieldErrors;
    expect(fieldErrors.oferentes?.[0]).toContain(
      `${INTERPRETE_LSC_MAX_OFERENTES}`
    );
    expect(fieldErrors.interpretes?.[0]).toContain(
      `${INTERPRETE_LSC_MAX_INTERPRETES}`
    );
    expect(fieldErrors.asistentes?.[0]).toContain(
      `${INTERPRETE_LSC_MAX_ASISTENTES}`
    );
  });
});
