import { describe, expect, it } from "vitest";
import {
  FAILED_VISIT_AUDIT_FIELD,
  failedVisitAuditFieldSchema,
  getDefaultFailedVisitAuditFields,
  normalizeFailedVisitAuditValue,
  shouldPersistFailedVisitAuditForSlug,
} from "@/lib/failedVisitContract";

describe("failedVisitContract", () => {
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

  it("only persists the audit field for the shared failed-visit slugs", () => {
    expect(shouldPersistFailedVisitAuditForSlug("presentacion")).toBe(true);
    expect(shouldPersistFailedVisitAuditForSlug("sensibilizacion")).toBe(true);
    expect(shouldPersistFailedVisitAuditForSlug("seleccion")).toBe(true);
    expect(shouldPersistFailedVisitAuditForSlug("contratacion")).toBe(true);
    expect(shouldPersistFailedVisitAuditForSlug("condiciones-vacante")).toBe(
      true
    );
    expect(shouldPersistFailedVisitAuditForSlug("evaluacion")).toBe(true);
    expect(shouldPersistFailedVisitAuditForSlug("induccion-operativa")).toBe(
      true
    );
    expect(
      shouldPersistFailedVisitAuditForSlug("induccion-organizacional")
    ).toBe(true);
    expect(shouldPersistFailedVisitAuditForSlug("seguimientos")).toBe(false);
    expect(shouldPersistFailedVisitAuditForSlug("interprete-lsc")).toBe(false);
    expect(shouldPersistFailedVisitAuditForSlug(null)).toBe(false);
  });
});
