import { describe, expect, it } from "vitest";
import {
  FAILED_VISIT_ACTION_REGISTRY,
  getFailedVisitActionConfig,
  isFailedVisitOptionalPath,
} from "@/lib/failedVisitActionRegistry";

describe("failedVisitActionRegistry", () => {
  it("registers only presentacion and sensibilizacion after the runtime-only refactor", () => {
    expect(Object.keys(FAILED_VISIT_ACTION_REGISTRY)).toEqual([
      "presentacion",
      "sensibilizacion",
    ]);
    expect(getFailedVisitActionConfig("seguimientos")).toBeNull();
    expect(getFailedVisitActionConfig("interprete-lsc")).toBeNull();
    expect(getFailedVisitActionConfig("evaluacion")).toBeNull();
  });

  it("keeps only runtime-visible config for the phase 2 forms", () => {
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
    expect(
      isFailedVisitOptionalPath("presentacion", "acuerdos_observaciones")
    ).toBe(false);

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
    expect(isFailedVisitOptionalPath("sensibilizacion", "observaciones")).toBe(
      false
    );
  });
});
