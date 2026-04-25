import { describe, expect, it } from "vitest";
import {
  FAILED_VISIT_AUDIT_FIELD,
  FAILED_VISIT_CONTRACT_REGISTRY,
  FAILED_VISIT_SUPPORTED_FORM_SLUGS,
  failedVisitAuditFieldSchema,
  getDefaultFailedVisitAuditFields,
  getFailedVisitContract,
  normalizeFailedVisitAuditValue,
} from "@/lib/failedVisitContract";

describe("failedVisitContract", () => {
  it("registers exactly the 8 supported forms for phase 1", () => {
    expect(Object.keys(FAILED_VISIT_CONTRACT_REGISTRY)).toEqual([
      "presentacion",
      "sensibilizacion",
      "seleccion",
      "contratacion",
      "condiciones-vacante",
      "evaluacion",
      "induccion-operativa",
      "induccion-organizacional",
    ]);
    expect(FAILED_VISIT_SUPPORTED_FORM_SLUGS).toHaveLength(8);
  });

  it("keeps seguimientos and interprete-lsc outside the shared registry", () => {
    expect(getFailedVisitContract("seguimientos")).toBeNull();
    expect(getFailedVisitContract("interprete-lsc")).toBeNull();
  });

  it("stores the expected topology and attendee minimums per form", () => {
    expect(FAILED_VISIT_CONTRACT_REGISTRY.presentacion).toMatchObject({
      attendeeTopology: "agency_advisor",
      normalMinMeaningfulAttendees: 1,
      failedVisitMinMeaningfulAttendees: 1,
      reversible: false,
      persistAuditInPayload: true,
    });
    expect(FAILED_VISIT_CONTRACT_REGISTRY.sensibilizacion).toMatchObject({
      attendeeTopology: "generic",
      normalMinMeaningfulAttendees: 2,
    });
    expect(FAILED_VISIT_CONTRACT_REGISTRY["condiciones-vacante"]).toMatchObject({
      attendeeTopology: "agency_advisor",
      normalMinMeaningfulAttendees: 2,
    });
    expect(FAILED_VISIT_CONTRACT_REGISTRY.evaluacion).toMatchObject({
      attendeeTopology: "agency_advisor",
      normalMinMeaningfulAttendees: 2,
    });
    expect(
      FAILED_VISIT_CONTRACT_REGISTRY["induccion-organizacional"]
    ).toMatchObject({
      attendeeTopology: "generic",
      normalMinMeaningfulAttendees: 1,
    });
  });

  it("accepts missing, null and ISO datetimes while rejecting invalid strings", () => {
    expect(failedVisitAuditFieldSchema.parse(undefined)).toBeNull();
    expect(failedVisitAuditFieldSchema.parse(null)).toBeNull();
    expect(
      failedVisitAuditFieldSchema.parse("2026-04-24T12:00:00.000Z")
    ).toBe("2026-04-24T12:00:00.000Z");
    expect(
      failedVisitAuditFieldSchema.safeParse("no-es-una-fecha").success
    ).toBe(false);
  });

  it("exposes default and normalization helpers for the technical field", () => {
    expect(getDefaultFailedVisitAuditFields()).toEqual({
      [FAILED_VISIT_AUDIT_FIELD]: null,
    });
    expect(normalizeFailedVisitAuditValue(undefined)).toBeNull();
    expect(normalizeFailedVisitAuditValue("2026-04-24T12:00:00.000Z")).toBe(
      "2026-04-24T12:00:00.000Z"
    );
    expect(normalizeFailedVisitAuditValue("bad-value")).toBeNull();
  });
});
