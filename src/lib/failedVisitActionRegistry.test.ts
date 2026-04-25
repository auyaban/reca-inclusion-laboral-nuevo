import { describe, expect, it } from "vitest";
import {
  FAILED_VISIT_ACTION_REGISTRY,
  getFailedVisitActionConfig,
} from "@/lib/failedVisitActionRegistry";

describe("failedVisitActionRegistry", () => {
  it("registers only presentacion and sensibilizacion for phase 2", () => {
    expect(Object.keys(FAILED_VISIT_ACTION_REGISTRY)).toEqual([
      "presentacion",
      "sensibilizacion",
    ]);
    expect(getFailedVisitActionConfig("seguimientos")).toBeNull();
    expect(getFailedVisitActionConfig("interprete-lsc")).toBeNull();
  });

  it("keeps the expected attendee policy and empty preset groups for the first lot", () => {
    expect(FAILED_VISIT_ACTION_REGISTRY.presentacion).toMatchObject({
      enabled: true,
      narrativeFields: ["acuerdos_observaciones"],
      attendeePolicy: {
        preserveExistingRows: true,
        failedVisitMinMeaningfulAttendees: 1,
        agencyAdvisorRowOptionalWhenFailed: true,
      },
    });
    expect(FAILED_VISIT_ACTION_REGISTRY.presentacion.presetConfig.fieldGroups).toEqual(
      []
    );

    expect(FAILED_VISIT_ACTION_REGISTRY.sensibilizacion).toMatchObject({
      enabled: true,
      narrativeFields: ["observaciones"],
      attendeePolicy: {
        preserveExistingRows: true,
        failedVisitMinMeaningfulAttendees: 1,
        agencyAdvisorRowOptionalWhenFailed: false,
      },
    });
    expect(
      FAILED_VISIT_ACTION_REGISTRY.sensibilizacion.presetConfig.fieldGroups
    ).toEqual([]);
  });
});
