import { describe, expect, it } from "vitest";
import {
  FAILED_VISIT_ACTION_REGISTRY,
  getFailedVisitActionConfig,
  isFailedVisitOptionalPath,
} from "@/lib/failedVisitActionRegistry";

describe("failedVisitActionRegistry", () => {
  it("registers the visible lots only and keeps excluded forms disabled", () => {
    expect(Object.keys(FAILED_VISIT_ACTION_REGISTRY)).toEqual([
      "presentacion",
      "sensibilizacion",
      "evaluacion",
      "induccion-operativa",
      "induccion-organizacional",
    ]);
    expect(getFailedVisitActionConfig("seguimientos")).toBeNull();
    expect(getFailedVisitActionConfig("interprete-lsc")).toBeNull();
  });

  it("keeps the phase 2 forms with empty optional paths and no preset groups", () => {
    expect(FAILED_VISIT_ACTION_REGISTRY.presentacion).toMatchObject({
      enabled: true,
      optionalWhenFailedPaths: [],
      dialog: {
        title: "Marcar visita fallida",
      },
      notice: {
        buttonLabel: "Marcar visita fallida",
      },
    });
    expect(FAILED_VISIT_ACTION_REGISTRY.presentacion.presetConfig.fieldGroups).toEqual(
      []
    );

    expect(FAILED_VISIT_ACTION_REGISTRY.sensibilizacion).toMatchObject({
      enabled: true,
      optionalWhenFailedPaths: [],
      dialog: {
        title: "Marcar visita fallida",
      },
      notice: {
        buttonLabel: "Marcar visita fallida",
      },
    });
    expect(
      FAILED_VISIT_ACTION_REGISTRY.sensibilizacion.presetConfig.fieldGroups
    ).toEqual([]);
  });

  it("builds real preset and optional-path contracts for the phase 3 forms", () => {
    expect(
      FAILED_VISIT_ACTION_REGISTRY.evaluacion.presetConfig.fieldGroups.length
    ).toBeGreaterThan(0);
    expect(FAILED_VISIT_ACTION_REGISTRY.evaluacion.dialog.confirmLabel).toBe(
      "Marcar como fallida"
    );
    expect(
      isFailedVisitOptionalPath(
        "evaluacion",
        "section_2_1.transporte_publico.accesible"
      )
    ).toBe(true);
    expect(
      isFailedVisitOptionalPath("evaluacion", "section_4.nivel_accesibilidad")
    ).toBe(true);

    expect(
      FAILED_VISIT_ACTION_REGISTRY["induccion-operativa"].optionalWhenFailedPaths
    ).toEqual(["fecha_primer_seguimiento"]);
    expect(
      FAILED_VISIT_ACTION_REGISTRY["induccion-operativa"].presetConfig.fieldGroups
    ).toHaveLength(3);

    expect(
      FAILED_VISIT_ACTION_REGISTRY["induccion-organizacional"]
        .presetConfig.fieldGroups[0]?.paths
    ).toContain("section_4.0.medio");
  });
});
