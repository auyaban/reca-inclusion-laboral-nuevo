import { describe, expect, it } from "vitest";
import { FORMS } from "@/components/layout/HubMenu";

describe("HubMenu form availability", () => {
  it("keeps condiciones de la vacante enabled without enabling evaluacion", () => {
    const evaluacion = FORMS.find((form) => form.id === "evaluacion");
    const condicionesVacante = FORMS.find(
      (form) => form.id === "condiciones-vacante"
    );

    expect(evaluacion?.available).toBe(false);
    expect(condicionesVacante?.available).toBe(true);
  });
});
