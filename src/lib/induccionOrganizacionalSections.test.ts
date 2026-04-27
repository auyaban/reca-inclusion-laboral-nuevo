import { describe, expect, it } from "vitest";
import {
  getInduccionOrganizacionalValidationTarget,
  isInduccionOrganizacionalAttendeesSectionComplete,
  isInduccionOrganizacionalDevelopmentSectionComplete,
  isInduccionOrganizacionalObservacionesSectionComplete,
  isInduccionOrganizacionalRecommendationsSectionComplete,
  isInduccionOrganizacionalVinculadoSectionComplete,
} from "@/lib/induccionOrganizacionalSections";
import { buildValidInduccionOrganizacionalValues } from "@/lib/testing/induccionOrganizacionalFixtures";

describe("induccionOrganizacional section helpers", () => {
  it("marks the shared sections as complete when the normalized form is full", () => {
    const values = buildValidInduccionOrganizacionalValues();

    expect(isInduccionOrganizacionalVinculadoSectionComplete(values.vinculado)).toBe(
      true
    );
    expect(isInduccionOrganizacionalDevelopmentSectionComplete(values.section_3)).toBe(
      true
    );
    expect(
      isInduccionOrganizacionalRecommendationsSectionComplete(values.section_4)
    ).toBe(true);
    expect(
      isInduccionOrganizacionalObservacionesSectionComplete(values.section_5)
    ).toBe(true);
    expect(isInduccionOrganizacionalAttendeesSectionComplete(values.asistentes)).toBe(
      true
    );
  });

  it("keeps the observations section complete even when the optional note is empty", () => {
    expect(
      isInduccionOrganizacionalObservacionesSectionComplete({
        observaciones: "",
      })
    ).toBe(true);
  });

  it("requires observations when failed-visit mode marks the section as required", () => {
    expect(
      isInduccionOrganizacionalObservacionesSectionComplete({
        observaciones: "",
        required: true,
      })
    ).toBe(false);
    expect(
      isInduccionOrganizacionalObservacionesSectionComplete({
        observaciones: "Se reagendara la induccion.",
        required: true,
      })
    ).toBe(true);
  });

  it("requires exactly three recommendation rows with a selected medium", () => {
    const values = buildValidInduccionOrganizacionalValues();

    expect(isInduccionOrganizacionalRecommendationsSectionComplete([])).toBe(false);
    expect(
      isInduccionOrganizacionalRecommendationsSectionComplete(values.section_4.slice(0, 2))
    ).toBe(false);
    expect(
      isInduccionOrganizacionalRecommendationsSectionComplete([
        values.section_4[0],
        { ...values.section_4[1], medio: "" },
        values.section_4[2],
      ])
    ).toBe(false);
    expect(
      isInduccionOrganizacionalRecommendationsSectionComplete(values.section_4)
    ).toBe(true);
  });

  it("routes validation to the first failing shared section", () => {
    expect(
      getInduccionOrganizacionalValidationTarget({
        fecha_visita: { message: "Requerido", type: "required" },
      } as never)
    ).toEqual({
      sectionId: "company",
      fieldName: "fecha_visita",
    });

    const values = buildValidInduccionOrganizacionalValues();
    values.section_3.historia_empresa.descripcion = "";

    expect(
      getInduccionOrganizacionalValidationTarget({
        section_3: {
          historia_empresa: {
            descripcion: { message: "Requerido", type: "required" },
          },
        },
      } as never)
    ).toEqual({
      sectionId: "desarrollo",
      fieldName: "section_3.historia_empresa.descripcion",
    });
  });
});
