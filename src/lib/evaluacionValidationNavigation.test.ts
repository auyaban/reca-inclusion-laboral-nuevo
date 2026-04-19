import { describe, expect, it } from "vitest";
import { getEvaluacionValidationTarget } from "@/lib/evaluacionValidationNavigation";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";
import type { FieldErrors } from "react-hook-form";

describe("getEvaluacionValidationTarget", () => {
  it("prioritizes the active company fields", () => {
    const errors = {
      fecha_visita: { message: "requerido" },
      observaciones_generales: { message: "requerido" },
    } as FieldErrors<EvaluacionValues>;

    expect(getEvaluacionValidationTarget(errors)).toEqual({
      sectionId: "company",
      fieldName: "fecha_visita",
    });
  });

  it("routes question-section errors before section 6", () => {
    const errors = {
      section_2_1: {
        transporte_publico: {
          accesible: { message: "requerido" },
        },
      },
    } as unknown as FieldErrors<EvaluacionValues>;

    expect(getEvaluacionValidationTarget(errors)).toEqual({
      sectionId: "section_2_1",
      fieldName: "section_2_1.transporte_publico.accesible",
    });
  });

  it("routes section 4 errors after the question matrix", () => {
    const errors = {
      section_4: {
        nivel_accesibilidad: { message: "requerido" },
      },
    } as unknown as FieldErrors<EvaluacionValues>;

    expect(getEvaluacionValidationTarget(errors)).toEqual({
      sectionId: "section_4",
      fieldName: "section_4.nivel_accesibilidad",
    });
  });

  it("routes readonly section 4 description errors to the editable level field", () => {
    const errors = {
      section_4: {
        descripcion: { message: "derivada" },
      },
    } as unknown as FieldErrors<EvaluacionValues>;

    expect(getEvaluacionValidationTarget(errors)).toEqual({
      sectionId: "section_4",
      fieldName: "section_4.nivel_accesibilidad",
    });
  });

  it("routes section 5 errors before narratives and attendees", () => {
    const errors = {
      section_5: {
        discapacidad_fisica: {
          aplica: { message: "requerido" },
        },
      },
      observaciones_generales: { message: "requerido" },
    } as unknown as FieldErrors<EvaluacionValues>;

    expect(getEvaluacionValidationTarget(errors)).toEqual({
      sectionId: "section_5",
      fieldName: "section_5.discapacidad_fisica.aplica",
    });
  });

  it("routes readonly section 5 derived-field errors to the editable aplica field", () => {
    const errors = {
      section_5: {
        discapacidad_visual: {
          ajustes: { message: "sync" },
        },
      },
    } as unknown as FieldErrors<EvaluacionValues>;

    expect(getEvaluacionValidationTarget(errors)).toEqual({
      sectionId: "section_5",
      fieldName: "section_5.discapacidad_visual.aplica",
    });
  });

  it("routes attendee errors to section_8", () => {
    const errors = {
      asistentes: [{ nombre: { message: "requerido" } }],
    } as FieldErrors<EvaluacionValues>;

    expect(getEvaluacionValidationTarget(errors)).toEqual({
      sectionId: "section_8",
      fieldName: "asistentes.0.nombre",
    });
  });

  it("routes root attendee errors to the first actionable attendee row", () => {
    const errors = {
      asistentes: {
        message: "Agrega al menos un asistente significativo.",
      },
    } as unknown as FieldErrors<EvaluacionValues>;

    expect(getEvaluacionValidationTarget(errors)).toEqual({
      sectionId: "section_8",
      fieldName: "asistentes.1.nombre",
    });
  });
});
