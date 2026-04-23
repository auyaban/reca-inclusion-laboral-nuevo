import { describe, expect, it } from "vitest";
import type { FieldErrors } from "react-hook-form";

import { getInterpreteLscValidationTarget } from "@/lib/interpreteLscValidationNavigation";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";

describe("getInterpreteLscValidationTarget", () => {
  it("returns null when there are no validation errors", () => {
    expect(getInterpreteLscValidationTarget({})).toBeNull();
  });

  it("maps company errors first", () => {
    const errors = {
      modalidad_profesional_reca: {
        type: "required",
        message: "Selecciona la modalidad",
      },
    } as FieldErrors<InterpreteLscValues>;

    expect(getInterpreteLscValidationTarget(errors)).toEqual({
      sectionId: "company",
      fieldName: "modalidad_profesional_reca",
    });
  });

  it("maps participant errors to the participants section", () => {
    const errors = {
      oferentes: [
        {
          cedula: { type: "custom", message: "La cedula es obligatoria" },
        },
      ],
    } as unknown as FieldErrors<InterpreteLscValues>;

    expect(getInterpreteLscValidationTarget(errors)).toEqual({
      sectionId: "participants",
      fieldName: "oferentes.0.cedula",
    });
  });

  it("maps nested interpreter errors without crashing on sparse rows", () => {
    const interpretesErrors = [];
    interpretesErrors[1] = {
      hora_final: { type: "custom", message: "La hora final es obligatoria" },
    };

    const errors = {
      interpretes: interpretesErrors,
    } as unknown as FieldErrors<InterpreteLscValues>;

    expect(getInterpreteLscValidationTarget(errors)).toEqual({
      sectionId: "interpreters",
      fieldName: "interpretes.1.hora_final",
    });
  });

  it("falls back to the first interpreter name for root-only interpreter errors", () => {
    const errors = {
      interpretes: {
        root: {
          type: "custom",
          message: "Agrega al menos 1 interprete significativo.",
        },
      },
    } as unknown as FieldErrors<InterpreteLscValues>;

    expect(getInterpreteLscValidationTarget(errors)).toEqual({
      sectionId: "interpreters",
      fieldName: "interpretes.0.nombre",
    });
  });

  it("maps attendee errors after the other sections", () => {
    const errors = {
      asistentes: {
        root: {
          type: "custom",
          message: "Completa los asistentes.",
        },
      },
    } as unknown as FieldErrors<InterpreteLscValues>;

    expect(getInterpreteLscValidationTarget(errors)).toEqual({
      sectionId: "attendees",
      fieldName: "asistentes.0.nombre",
    });
  });
});
