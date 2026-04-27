import { describe, expect, it } from "vitest";
import { getFailedVisitActionConfig } from "@/lib/failedVisitActionRegistry";
import { applyFailedVisitPreset } from "@/lib/failedVisitPreset";
import { normalizeInduccionOperativaValues } from "@/lib/induccionOperativa";
import {
  buildValidInduccionOperativaValues,
  INDUCCION_OPERATIVA_TEST_EMPRESA,
} from "@/lib/testing/induccionOperativaFixtures";
import { induccionOperativaSchema } from "@/lib/validations/induccionOperativa";

function createFailedVisitOperativaValues() {
  const config = getFailedVisitActionConfig("induccion-operativa");
  if (!config) {
    throw new Error("Missing induccion operativa failed-visit config");
  }

  const values = applyFailedVisitPreset(
    {
      ...buildValidInduccionOperativaValues(),
      failed_visit_applied_at: "2026-04-24T12:00:00.000Z",
    },
    config.presetConfig
  );

  return normalizeInduccionOperativaValues(
    values,
    INDUCCION_OPERATIVA_TEST_EMPRESA
  );
}

describe("induccionOperativaSchema failed visit", () => {
  it("accepts failed visit without followup date after applying the preset", () => {
    const values = createFailedVisitOperativaValues();
    values.fecha_primer_seguimiento = "";
    values.observaciones_recomendaciones =
      "La visita no pudo continuar por cierre operativo del area.";

    const result = induccionOperativaSchema.safeParse(values);

    expect(result.success).toBe(true);
    expect(values.ajustes_requeridos).toBe("No aplica");
    expect(values.section_3.funciones_corresponden_perfil.ejecucion).toBe(
      "No aplica"
    );
    expect(values.section_4.items.reconoce_instrucciones.nivel_apoyo).toBe(
      "No aplica."
    );
  });

  it("requires the final narrative during failed visit", () => {
    const values = createFailedVisitOperativaValues();
    values.fecha_primer_seguimiento = "";
    values.observaciones_recomendaciones = "";

    const result = induccionOperativaSchema.safeParse(values);

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.path.join(".") === "observaciones_recomendaciones"
      )
    ).toBe(true);
  });
});
