import { describe, expect, it } from "vitest";
import { buildValidSeleccionValues } from "@/lib/testing/seleccionFixtures";
import {
  isSeleccionActivitySectionComplete,
  isSeleccionAttendeesSectionComplete,
  isSeleccionOferentesSectionComplete,
  isSeleccionRecommendationsSectionComplete,
} from "@/lib/seleccionSections";

describe("seleccion section completeness", () => {
  it("requires meaningful oferentes before the activity section can be complete", () => {
    const defaults = buildValidSeleccionValues({
      desarrollo_actividad: "",
      oferentes: [{} as never],
    });

    expect(isSeleccionActivitySectionComplete(defaults)).toBe(false);
  });

  it("marks recommendations and attendees according to their own rules", () => {
    expect(
      isSeleccionRecommendationsSectionComplete({
        ajustes_recomendaciones: "Ajuste 1",
        nota: "Nota 1",
      })
    ).toBe(true);

    expect(
      isSeleccionAttendeesSectionComplete({
        asistentes: [{ nombre: "Marta Ruiz", cargo: "Profesional RECA" }],
      })
    ).toBe(true);
  });

  it("ignores placeholder rows when evaluating oferentes completeness", () => {
    const values = buildValidSeleccionValues({
      oferentes: [{} as never, { nombre_oferente: "Ana Perez" } as never],
    });

    expect(isSeleccionOferentesSectionComplete(values)).toBe(false);
  });
});
