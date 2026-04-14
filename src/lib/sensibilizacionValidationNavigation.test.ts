import { describe, expect, it } from "vitest";
import type { FieldErrors } from "react-hook-form";
import type { SensibilizacionValues } from "@/lib/validations/sensibilizacion";
import { getSensibilizacionValidationTarget } from "@/lib/sensibilizacionValidationNavigation";

describe("getSensibilizacionValidationTarget", () => {
  it("maps visit errors to the first invalid visit field", () => {
    const errors = {
      modalidad: { type: "required", message: "Selecciona la modalidad" },
    } as FieldErrors<SensibilizacionValues>;

    expect(getSensibilizacionValidationTarget(errors)).toEqual({
      sectionId: "visit",
      fieldName: "modalidad",
    });
  });

  it("maps observations errors to the observations section", () => {
    const errors = {
      observaciones: {
        type: "required",
        message: "Las observaciones son requeridas",
      },
    } as FieldErrors<SensibilizacionValues>;

    expect(getSensibilizacionValidationTarget(errors)).toEqual({
      sectionId: "observations",
      fieldName: "observaciones",
    });
  });

  it("maps first-row attendee cargo errors", () => {
    const errors = {
      asistentes: [
        {
          cargo: { type: "custom", message: "El cargo es requerido" },
        },
      ],
    } as unknown as FieldErrors<SensibilizacionValues>;

    expect(getSensibilizacionValidationTarget(errors)).toEqual({
      sectionId: "attendees",
      fieldName: "asistentes.0.cargo",
    });
  });

  it("maps sparse attendee errors to the interleaved row without crashing", () => {
    const asistentesErrors = [];
    asistentesErrors[1] = {
      cargo: { type: "custom", message: "El cargo es requerido" },
    };

    const errors = {
      asistentes: asistentesErrors,
    } as unknown as FieldErrors<SensibilizacionValues>;

    expect(getSensibilizacionValidationTarget(errors)).toEqual({
      sectionId: "attendees",
      fieldName: "asistentes.1.cargo",
    });
  });

  it("maps last-row advisor errors", () => {
    const asistentesErrors = [];
    asistentesErrors[2] = {
      nombre: { type: "custom", message: "El nombre es requerido" },
    };

    const errors = {
      asistentes: asistentesErrors,
    } as unknown as FieldErrors<SensibilizacionValues>;

    expect(getSensibilizacionValidationTarget(errors)).toEqual({
      sectionId: "attendees",
      fieldName: "asistentes.2.nombre",
    });
  });

  it("falls back to the first attendee name for root-only attendee errors", () => {
    const errors = {
      asistentes: {
        root: {
          type: "custom",
          message: "Agrega al menos 2 asistentes significativos.",
        },
      },
    } as unknown as FieldErrors<SensibilizacionValues>;

    expect(getSensibilizacionValidationTarget(errors)).toEqual({
      sectionId: "attendees",
      fieldName: "asistentes.0.nombre",
    });
  });
});
