import { describe, expect, it } from "vitest";
import { getFailedVisitActionConfig } from "@/lib/failedVisitActionRegistry";
import { applyFailedVisitPreset } from "@/lib/failedVisitPreset";
import {
  getInduccionOrganizacionalRecommendationForMedium,
  normalizeInduccionOrganizacionalValues,
} from "@/lib/induccionOrganizacional";
import {
  buildValidInduccionOrganizacionalValues,
  INDUCCION_ORGANIZACIONAL_TEST_EMPRESA,
} from "@/lib/testing/induccionOrganizacionalFixtures";
import { induccionOrganizacionalSchema } from "@/lib/validations/induccionOrganizacional";

function createFailedVisitOrganizacionalValues() {
  const config = getFailedVisitActionConfig("induccion-organizacional");
  if (!config) {
    throw new Error("Missing induccion organizacional failed-visit config");
  }

  const values = applyFailedVisitPreset(
    {
      ...buildValidInduccionOrganizacionalValues(),
      failed_visit_applied_at: "2026-04-24T12:00:00.000Z",
    },
    config.presetConfig
  );

  return normalizeInduccionOrganizacionalValues(
    values,
    INDUCCION_ORGANIZACIONAL_TEST_EMPRESA
  );
}

describe("induccionOrganizacionalSchema failed visit", () => {
  it("accepts failed visit with section 4 derived back to No aplica", () => {
    const values = createFailedVisitOrganizacionalValues();
    values.section_5.observaciones =
      "No fue posible ejecutar la induccion por indisponibilidad del equipo.";

    const result = induccionOrganizacionalSchema.safeParse(values);

    expect(result.success).toBe(true);
    expect(values.section_3.historia_empresa.visto).toBe("No aplica");
    expect(values.section_4[2]?.medio).toBe("No aplica");
    expect(values.section_4[2]?.recomendacion).toBe(
      getInduccionOrganizacionalRecommendationForMedium("No aplica")
    );
  });

  it("requires observations during failed visit", () => {
    const values = createFailedVisitOrganizacionalValues();
    values.section_5.observaciones = "";

    const result = induccionOrganizacionalSchema.safeParse(values);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.path.join(".") === "section_5.observaciones"
      )
    ).toBe(true);
  });
});
