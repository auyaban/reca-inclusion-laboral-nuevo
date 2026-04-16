import { describe, expect, it } from "vitest";
import { getContratacionValidationTarget } from "@/lib/contratacionValidationNavigation";

describe("getContratacionValidationTarget", () => {
  it("prioritizes company errors first", () => {
    expect(
      getContratacionValidationTarget({
        fecha_visita: { message: "Requerido" },
      })
    ).toEqual({
      sectionId: "company",
      fieldName: "fecha_visita",
    });
  });

  it("navigates to desarrollo_actividad when the root narrative fails", () => {
    expect(
      getContratacionValidationTarget({
        desarrollo_actividad: { message: "Requerido" },
      })
    ).toEqual({
      sectionId: "activity",
      fieldName: "desarrollo_actividad",
    });
  });

  it("uses a stable nested path for vinculados", () => {
    const vinculados = [] as unknown[];
    vinculados[1] = {
      cargo_oferente: { message: "Requerido" },
    };

    expect(
      getContratacionValidationTarget({
        vinculados,
      })
    ).toEqual({
      sectionId: "vinculados",
      fieldName: "vinculados.1.cargo_oferente",
    });
  });
});
