import { describe, expect, it } from "vitest";
import type { FieldErrors } from "react-hook-form";
import type { SensibilizacionValues } from "@/lib/validations/sensibilizacion";
import { getSensibilizacionValidationTarget } from "@/lib/sensibilizacionValidationNavigation";

describe("getSensibilizacionValidationTarget", () => {
  it("maps step 0 errors to the first invalid visit field", () => {
    const errors = {
      modalidad: { type: "required", message: "Selecciona la modalidad" },
    } as FieldErrors<SensibilizacionValues>;

    expect(getSensibilizacionValidationTarget(errors)).toEqual({
      step: 0,
      fieldName: "modalidad",
    });
  });

  it("maps observations errors to step 2", () => {
    const errors = {
      observaciones: {
        type: "required",
        message: "Las observaciones son requeridas",
      },
    } as FieldErrors<SensibilizacionValues>;

    expect(getSensibilizacionValidationTarget(errors)).toEqual({
      step: 2,
      fieldName: "observaciones",
    });
  });

  it("maps nested attendee errors to step 4", () => {
    const errors = {
      asistentes: [
        {
          nombre: { type: "required", message: "El nombre es requerido" },
        },
      ],
    } as unknown as FieldErrors<SensibilizacionValues>;

    expect(getSensibilizacionValidationTarget(errors)).toEqual({
      step: 4,
      fieldName: "asistentes.0.nombre",
    });
  });

  it("falls back to the first attendee name when the array only has a root error", () => {
    const errors = {
      asistentes: {
        root: { type: "min", message: "Agrega al menos un asistente" },
      },
    } as unknown as FieldErrors<SensibilizacionValues>;

    expect(getSensibilizacionValidationTarget(errors)).toEqual({
      step: 4,
      fieldName: "asistentes.0.nombre",
    });
  });
});
