import { describe, expect, it } from "vitest";
import { FORMS } from "@/components/layout/HubMenu";

describe("HubMenu form availability", () => {
  it("keeps migrated forms enabled while evaluacion stays locked", () => {
    const evaluacion = FORMS.find((form) => form.id === "evaluacion");
    const condicionesVacante = FORMS.find(
      (form) => form.id === "condiciones-vacante"
    );
    const seleccion = FORMS.find((form) => form.id === "seleccion");
    const contratacion = FORMS.find((form) => form.id === "contratacion");

    expect(evaluacion?.available).toBe(false);
    expect(condicionesVacante?.available).toBe(true);
    expect(seleccion?.available).toBe(true);
    expect(contratacion?.available).toBe(true);
  });
});
