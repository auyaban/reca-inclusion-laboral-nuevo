import { describe, expect, it } from "vitest";
import {
  calculateEvaluacionAccessibilitySummary,
  createEmptyEvaluacionValues,
  deriveEvaluacionSection4Description,
  deriveEvaluacionSection5ItemValue,
  ensureEvaluacionBaseAsistentes,
  normalizeEvaluacionValues,
  resolveEvaluacionSection4LevelSync,
} from "@/lib/evaluacion";
import { ASESOR_AGENCIA_CARGO } from "@/lib/asistentes";
import { EVALUACION_SECTION_5_ITEMS } from "@/lib/evaluacionSections";

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

describe("evaluacion domain helpers", () => {
  it("builds stable defaults with company snapshot and two attendee base rows", () => {
    const values = createEmptyEvaluacionValues(createEmpresa());

    expect(values.nit_empresa).toBe("9001");
    expect(values.nombre_empresa).toBe("Empresa Uno");
    expect(values.sede_empresa).toBe("Zona Centro");
    expect(values.section_2_1.transporte_publico).toEqual({
      accesible: "",
      respuesta: "",
      secundaria: "",
      terciaria: "",
      cuaternaria: "",
      quinary: "",
      observaciones: "",
      detalle: "",
    });
    expect(values.section_5.discapacidad_fisica).toEqual({
      aplica: "",
      nota: "",
      ajustes: "",
    });
    expect(values.asistentes).toEqual([
      { nombre: "Laura Profesional", cargo: "" },
      { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
    ]);
  });

  it("normalizes modality aliases and keeps derived fields synchronized", () => {
    const values = normalizeEvaluacionValues(
      {
        modalidad: "Mixto",
        section_2_1: {
          transporte_publico: {
            accesible: "sí",
            observaciones: "Ruta accesible",
          },
          senales_podotactiles: {
            accesible: "Parcial",
            respuesta:
              "Presencia de señales podotáctiles continuas y en buen estado.",
          },
        },
        section_4: {
          nivel_accesibilidad: "alto",
          descripcion: "manual",
        },
        section_5: {
          discapacidad_fisica: {
            aplica: "Aplica",
            nota: "manual",
            ajustes: "manual",
          },
        },
        asistentes: [
          { nombre: "Laura Profesional", cargo: "Profesional RECA" },
          { nombre: "Invitada", cargo: "Talento humano" },
        ],
      },
      createEmpresa()
    );

    expect(values.modalidad).toBe("Mixta");
    expect(values.section_2_1.transporte_publico.accesible).toBe("Si");
    expect(values.section_2_1.senales_podotactiles.respuesta).toBe(
      "Presencia de señales podotáctiles continuas y en buen estado."
    );
    expect(values.section_4).toEqual({
      nivel_accesibilidad: "Alto",
      descripcion: deriveEvaluacionSection4Description("Alto"),
    });
    expect(values.section_5.discapacidad_fisica.nota).toBe("manual");
    expect(values.section_5.discapacidad_fisica.ajustes).toBe(
      EVALUACION_SECTION_5_ITEMS[0]?.ajustes
    );
    expect(values.asistentes).toEqual([
      { nombre: "Laura Profesional", cargo: "Profesional RECA" },
      { nombre: "Invitada", cargo: "Talento humano" },
      { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
    ]);
  });

  it("preserves section 5 notes as professional free text while normalizing derived ajustes", () => {
    const values = normalizeEvaluacionValues(
      {
        section_5: {
          discapacidad_fisica: {
            aplica: "Aplica",
            nota: "nota escrita en un draft legacy",
            ajustes: "ajuste escrito en un draft legacy",
          },
        },
      },
      createEmpresa()
    );

    expect(values.section_5.discapacidad_fisica).toEqual({
      aplica: "Aplica",
      nota: "nota escrita en un draft legacy",
      ajustes: EVALUACION_SECTION_5_ITEMS[0]?.ajustes,
    });
  });

  it("accepts quinaria as a read alias while persisting quinary", () => {
    const values = normalizeEvaluacionValues(
      {
        section_2_3: {
          bano_discapacidad_fisica: {
            accesible: "Si",
            respuesta:
              "Cuenta con barras de agarre en ambos lados de la unidad sanitaria.",
            secundaria:
              "Cuenta con espacio mínimo de lado o al frente de 120 cm.",
            terciaria: "Cuenta con lavamanos de altura de 75 cm.",
            cuaternaria:
              "Cuenta con timbre de emergencia situado al lado del sanitario.",
            quinaria: "Los accesorios NO interfieren con las barras de apoyo.",
          },
        },
      },
      createEmpresa()
    );

    expect(values.section_2_3.bano_discapacidad_fisica.quinary).toBe(
      "Los accesorios NO interfieren con las barras de apoyo."
    );
  });

  it("treats the first non-advisor row as the user's RECA row without forcing the assigned professional in", () => {
    const asistentes = ensureEvaluacionBaseAsistentes(
      [
        { nombre: "Invitada", cargo: "Talento humano" },
        { nombre: "Pedro asesor", cargo: "Asesor Agencia" },
      ],
      createEmpresa()
    );

    expect(asistentes).toHaveLength(2);
    expect(asistentes[0]).toEqual({
      nombre: "Invitada",
      cargo: "Talento humano",
    });
    expect(asistentes[1]).toEqual({
      nombre: "Pedro Asesor",
      cargo: ASESOR_AGENCIA_CARGO,
    });
  });

  it("preserves a user override of the assigned professional in the first row across save/restore", () => {
    const asistentes = ensureEvaluacionBaseAsistentes(
      [
        { nombre: "Andrés Montes", cargo: "" },
        { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
      ],
      createEmpresa()
    );

    expect(asistentes).toHaveLength(2);
    expect(asistentes[0]).toEqual({
      nombre: "Andrés Montes",
      cargo: "",
    });
    expect(asistentes[1]).toEqual({
      nombre: "",
      cargo: ASESOR_AGENCIA_CARGO,
    });
  });

  it("seeds the assigned professional in the first row only when the array is empty", () => {
    const fromEmpty = ensureEvaluacionBaseAsistentes([], createEmpresa());
    const fromUndefined = ensureEvaluacionBaseAsistentes(undefined, createEmpresa());

    for (const asistentes of [fromEmpty, fromUndefined]) {
      expect(asistentes).toEqual([
        { nombre: "Laura Profesional", cargo: "" },
        { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
      ]);
    }
  });

  it("reproduces the legacy accessibility summary thresholds", () => {
    const summary = calculateEvaluacionAccessibilitySummary({
      section_2_1: {
        a: {
          accesible: "Si",
          respuesta: "",
          secundaria: "",
          terciaria: "",
          cuaternaria: "",
          quinary: "",
          observaciones: "",
          detalle: "",
        },
        b: {
          accesible: "Sí",
          respuesta: "",
          secundaria: "",
          terciaria: "",
          cuaternaria: "",
          quinary: "",
          observaciones: "",
          detalle: "",
        },
        c: {
          accesible: "Parcial",
          respuesta: "",
          secundaria: "",
          terciaria: "",
          cuaternaria: "",
          quinary: "",
          observaciones: "",
          detalle: "",
        },
      },
      section_2_2: {},
      section_2_3: {},
      section_2_4: {},
      section_2_5: {},
      section_2_6: {},
      section_3: {},
    });

    expect(summary.counts).toEqual({
      si: 2,
      no: 0,
      parcial: 1,
    });
    expect(summary.suggestion).toBe("Medio");
  });

  it("keeps the section 4 prefill editable policy stable", () => {
    expect(
      resolveEvaluacionSection4LevelSync({
        currentLevel: "",
        previousSuggestion: "",
        nextSuggestion: "Bajo",
      })
    ).toBe("Bajo");

    expect(
      resolveEvaluacionSection4LevelSync({
        currentLevel: "Medio",
        previousSuggestion: "Medio",
        nextSuggestion: "Alto",
      })
    ).toBe("Alto");

    expect(
      resolveEvaluacionSection4LevelSync({
        currentLevel: "Bajo",
        previousSuggestion: "Medio",
        nextSuggestion: "Alto",
      })
    ).toBe("Bajo");
  });

  it("derives section 5 ajustes from aplica and preserves the user-provided nota", () => {
    expect(
      deriveEvaluacionSection5ItemValue(
        "discapacidad_fisica",
        "Aplica",
        "Observación libre del profesional."
      )
    ).toEqual({
      aplica: "Aplica",
      nota: "Observación libre del profesional.",
      ajustes: EVALUACION_SECTION_5_ITEMS[0]?.ajustes ?? "",
    });

    expect(
      deriveEvaluacionSection5ItemValue("discapacidad_fisica", "No aplica")
    ).toEqual({
      aplica: "No aplica",
      nota: "",
      ajustes: "No aplica",
    });

    // Drafts pre-cambio guardaron el codigo CIE-10 como nota; al rehidratar
    // ese contenido legacy se descarta para que el campo libre arranque vacio.
    expect(
      deriveEvaluacionSection5ItemValue(
        "discapacidad_fisica",
        "Aplica",
        EVALUACION_SECTION_5_ITEMS[0]?.codes
      ).nota
    ).toBe("");
  });
});
