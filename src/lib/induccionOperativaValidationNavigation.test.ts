import { describe, expect, it } from "vitest";
import { getInduccionOperativaValidationTarget } from "@/lib/induccionOperativaValidationNavigation";

describe("getInduccionOperativaValidationTarget", () => {
  it("routes company field errors to the company section", () => {
    expect(
      getInduccionOperativaValidationTarget({
        fecha_visita: { message: "La fecha es requerida", type: "custom" },
      } as never)
    ).toEqual({
      sectionId: "company",
      fieldName: "fecha_visita",
    });
  });

  it("routes support and observations errors to their sections", () => {
    expect(
      getInduccionOperativaValidationTarget({
        section_5: {
          condiciones_medicas_salud: {
            nivel_apoyo_requerido: {
            message: "error",
            type: "custom",
            },
          },
        },
      } as never)
    ).toEqual({
      sectionId: "support",
      fieldName: "section_5.condiciones_medicas_salud.nivel_apoyo_requerido",
    });

    expect(
      getInduccionOperativaValidationTarget({
        observaciones_recomendaciones: {
          message: "error",
          type: "custom",
        },
      } as never)
    ).toEqual({
      sectionId: "observations",
      fieldName: "observaciones_recomendaciones",
    });
  });
});
