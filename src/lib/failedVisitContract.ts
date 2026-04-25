import { z } from "zod";

export const FAILED_VISIT_AUDIT_FIELD = "failed_visit_applied_at";

export const failedVisitAuditFieldSchema = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .default(null);

export type FailedVisitAuditFields = {
  [FAILED_VISIT_AUDIT_FIELD]: string | null;
};

const FAILED_VISIT_AUDIT_PERSISTED_SLUGS = new Set([
  "presentacion",
  "sensibilizacion",
  "seleccion",
  "contratacion",
  "condiciones-vacante",
  "evaluacion",
  "induccion-operativa",
  "induccion-organizacional",
]);

export function shouldPersistFailedVisitAuditForSlug(
  formSlug: string | null | undefined
) {
  if (!formSlug) {
    return false;
  }

  return FAILED_VISIT_AUDIT_PERSISTED_SLUGS.has(formSlug);
}

export function normalizeFailedVisitAuditValue(value: unknown) {
  const parsed = failedVisitAuditFieldSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function getDefaultFailedVisitAuditFields(): FailedVisitAuditFields {
  return {
    [FAILED_VISIT_AUDIT_FIELD]: null,
  };
}
