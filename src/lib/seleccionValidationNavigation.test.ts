import { describe, expect, it } from "vitest";
import { getSeleccionValidationTarget } from "@/lib/seleccionValidationNavigation";

describe("getSeleccionValidationTarget", () => {
  it("prioritizes company errors first", () => {
    expect(
      getSeleccionValidationTarget({
        fecha_visita: { message: "Requerido" },
      })
    ).toEqual({
      sectionId: "company",
      fieldName: "fecha_visita",
    });
  });

  it("navigates to desarrollo_actividad when the root narrative fails", () => {
    expect(
      getSeleccionValidationTarget({
        desarrollo_actividad: { message: "Requerido" },
      })
    ).toEqual({
      sectionId: "activity",
      fieldName: "desarrollo_actividad",
    });
  });

  it("uses a stable nested path for oferentes", () => {
    const oferentes = [] as unknown[];
    oferentes[1] = {
      cargo_oferente: { message: "Requerido" },
    };

    expect(
      getSeleccionValidationTarget({
        oferentes,
      })
    ).toEqual({
      sectionId: "oferentes",
      fieldName: "oferentes.1.cargo_oferente",
    });
  });
});
