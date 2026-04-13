import { describe, expect, it } from "vitest";
import type { FieldErrors } from "react-hook-form";
import type { PresentacionValues } from "@/lib/validations/presentacion";
import { getPresentacionValidationTarget } from "@/lib/presentacionValidationNavigation";

describe("getPresentacionValidationTarget", () => {
  it("maps visit errors to the visit section and first failing field", () => {
    const errors = {
      fecha_visita: { type: "required", message: "La fecha es requerida" },
    } as FieldErrors<PresentacionValues>;

    expect(getPresentacionValidationTarget(errors)).toEqual({
      sectionId: "visit",
      fieldName: "fecha_visita",
    });
  });

  it("maps motivation errors to the motivation section", () => {
    const errors = {
      motivacion: {
        type: "min",
        message: "Selecciona al menos una motivación",
      },
    } as FieldErrors<PresentacionValues>;

    expect(getPresentacionValidationTarget(errors)).toEqual({
      sectionId: "motivation",
      fieldName: "motivacion",
    });
  });

  it("maps agreements errors to the agreements section", () => {
    const errors = {
      acuerdos_observaciones: {
        type: "required",
        message: "Los acuerdos y observaciones son requeridos",
      },
    } as FieldErrors<PresentacionValues>;

    expect(getPresentacionValidationTarget(errors)).toEqual({
      sectionId: "agreements",
      fieldName: "acuerdos_observaciones",
    });
  });

  it("maps nested attendee errors to the first attendee field path", () => {
    const errors = {
      asistentes: [
        {
          nombre: { type: "required", message: "El nombre es requerido" },
        },
      ],
    } as unknown as FieldErrors<PresentacionValues>;

    expect(getPresentacionValidationTarget(errors)).toEqual({
      sectionId: "attendees",
      fieldName: "asistentes.0.nombre",
    });
  });

  it("falls back to the first attendee name when the array only has a root error", () => {
    const errors = {
      asistentes: {
        root: { type: "min", message: "Agrega al menos un asistente" },
      },
    } as unknown as FieldErrors<PresentacionValues>;

    expect(getPresentacionValidationTarget(errors)).toEqual({
      sectionId: "attendees",
      fieldName: "asistentes.0.nombre",
    });
  });
});
