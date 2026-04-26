import { describe, expect, it } from "vitest";
import { createEmptyEvaluacionValues, deriveEvaluacionSection4Description } from "@/lib/evaluacion";
import {
  EVALUACION_QUESTION_DESCRIPTORS,
  EVALUACION_SECTION_5_ITEMS,
} from "@/lib/evaluacionSections";
import {
  evaluacionRuntimeSchema,
  evaluacionSchema,
} from "@/lib/validations/evaluacion";

function createEmpresa() {
  return {
    id: "empresa-1",
    nombre_empresa: "Empresa Uno",
    nit_empresa: "9001",
    direccion_empresa: "Calle 1",
    ciudad_empresa: "Bogota",
    sede_empresa: "Sede Norte",
    zona_empresa: "Zona Centro",
    correo_1: "empresa@example.com",
    contacto_empresa: "Ana Contacto",
    telefono_empresa: "3000000",
    cargo: "Lider SST",
    profesional_asignado: "Laura Profesional",
    correo_profesional: null,
    asesor: "Pedro Asesor",
    correo_asesor: null,
    caja_compensacion: "Compensar",
  };
}

function createValidEvaluacionValues() {
  const values = createEmptyEvaluacionValues(createEmpresa());

  EVALUACION_QUESTION_DESCRIPTORS.forEach((question) => {
    const answer = values[question.sectionId][question.id];

    question.fields.forEach((field) => {
      answer[field.key] =
        field.options[0] ??
        `${question.sectionId}:${question.id}:${field.key}`;
    });
  });

  values.section_4 = {
    nivel_accesibilidad: "Alto",
    descripcion: deriveEvaluacionSection4Description("Alto"),
  };

  EVALUACION_SECTION_5_ITEMS.forEach((item) => {
    values.section_5[item.id] = {
      aplica: "Aplica",
      nota: `Nota libre del profesional para ${item.label}.`,
      ajustes: item.ajustes,
    };
  });

  values.observaciones_generales = "";
  values.cargos_compatibles = "Operario de apoyo";
  values.asistentes = [
    { nombre: "Laura Profesional", cargo: "Profesional RECA" },
    { nombre: "Invitada", cargo: "Talento humano" },
    { nombre: "Pedro Asesor", cargo: "Asesor Agencia" },
  ];

  return values;
}

describe("evaluacionSchema", () => {
  it("accepts the fully normalized F1 contract", () => {
    const result = evaluacionSchema.safeParse(createValidEvaluacionValues());

    expect(result.success).toBe(true);
  });

  it("allows empty observaciones_generales", () => {
    const values = createValidEvaluacionValues();
    values.observaciones_generales = "";

    const result = evaluacionSchema.safeParse(values);

    expect(result.success).toBe(true);
  });

  it("requires observaciones in question sections from sections 2.1 to 3", () => {
    const values = createValidEvaluacionValues();
    values.section_2_1.transporte_publico.observaciones = "";

    const result = evaluacionSchema.safeParse(values);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) =>
          issue.path.join(".") === "section_2_1.transporte_publico.observaciones"
      )
    ).toBe(true);
  });

  it("rejects missing responses for texto questions", () => {
    const values = createValidEvaluacionValues();
    values.section_2_2.linea_purpura.respuesta = "";

    const result = evaluacionSchema.safeParse(values);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) =>
          issue.path.join(".") === "section_2_2.linea_purpura.respuesta" &&
          issue.message.includes("Respuesta")
      )
    ).toBe(true);
  });

  it("keeps detalle required for questions that declare it", () => {
    const values = createValidEvaluacionValues();
    values.section_3.apoyo_bomberos_discapacidad.detalle = "";

    const result = evaluacionSchema.safeParse(values);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) =>
          issue.path.join(".") === "section_3.apoyo_bomberos_discapacidad.detalle"
      )
    ).toBe(true);
  });

  it("rejects tampering with derived fields", () => {
    const values = createValidEvaluacionValues();
    values.section_4.descripcion = "manual";
    values.section_5.discapacidad_fisica.ajustes = "manual";

    const result = evaluacionSchema.safeParse(values);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.path.join(".") === "section_4.nivel_accesibilidad"
      )
    ).toBe(true);
    expect(
      result.error?.issues.some(
        (issue) => issue.path.join(".") === "section_5.discapacidad_fisica.aplica"
      )
    ).toBe(true);
  });

  it("flags the attendee block when fewer than two significant attendees are present", () => {
    const values = createValidEvaluacionValues();
    values.asistentes = [
      { nombre: "Laura Profesional", cargo: "Profesional RECA" },
      { nombre: "", cargo: "" },
    ];

    const result = evaluacionSchema.safeParse(values);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.path.join(".") === "asistentes.0.nombre"
      )
    ).toBe(true);
    expect(
      result.error?.issues.some(
        (issue) =>
          issue.path.join(".") === "asistentes" &&
          issue.message === "Agrega al menos 2 asistentes significativos."
      )
    ).toBe(true);
  });

  it("uses the corrected option copy with tilde", () => {
    const values = createValidEvaluacionValues();
    values.modalidad = "Presenciales";

    const result = evaluacionSchema.safeParse(values);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.message === "Selecciona una opción válida"
      )
    ).toBe(true);
  });

  it("accepts a submission when empresa-derived readonly fields are empty", () => {
    const values = createValidEvaluacionValues();
    values.asesor = "";
    values.caja_compensacion = "";
    values.sede_empresa = "";
    values.correo_1 = "";

    const result = evaluacionSchema.safeParse(values);

    expect(result.success).toBe(true);
  });

  it("allows runtime validation while section 5 remains blocked", () => {
    const values = createValidEvaluacionValues();
    values.section_5.discapacidad_fisica.aplica = "";
    values.section_5.discapacidad_fisica.ajustes = "";

    const result = evaluacionRuntimeSchema.safeParse(values);

    expect(result.success).toBe(true);
  });

  it("keeps runtime and full schemas aligned outside section 5", () => {
    const values = createValidEvaluacionValues();
    values.section_2_1.transporte_publico.accesible = "";

    const runtimeResult = evaluacionRuntimeSchema.safeParse(values);
    const fullResult = evaluacionSchema.safeParse(values);

    expect(runtimeResult.success).toBe(false);
    expect(fullResult.success).toBe(false);
    expect(
      runtimeResult.error?.issues.some(
        (issue) =>
          issue.path.join(".") === "section_2_1.transporte_publico.accesible"
      )
    ).toBe(true);
    expect(
      fullResult.error?.issues.some(
        (issue) =>
          issue.path.join(".") === "section_2_1.transporte_publico.accesible"
      )
    ).toBe(true);
  });

  it("uses section 5 as the only effective difference between runtime and full schemas", () => {
    const values = createValidEvaluacionValues();
    values.section_5.discapacidad_fisica.aplica = "";
    values.section_5.discapacidad_fisica.ajustes = "";

    const runtimeResult = evaluacionRuntimeSchema.safeParse(values);
    const fullResult = evaluacionSchema.safeParse(values);

    expect(runtimeResult.success).toBe(true);
    expect(fullResult.success).toBe(false);
    expect(
      fullResult.error?.issues.some(
        (issue) => issue.path.join(".") === "section_5.discapacidad_fisica.aplica"
      )
    ).toBe(true);
  });
});
