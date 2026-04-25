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

export type FailedVisitAttendeeTopology =
  | "generic"
  | "agency_advisor"
  | "special";

export type FailedVisitSupportedFormSlug =
  | "presentacion"
  | "sensibilizacion"
  | "seleccion"
  | "contratacion"
  | "condiciones-vacante"
  | "evaluacion"
  | "induccion-operativa"
  | "induccion-organizacional";

export type FailedVisitContract = {
  formSlug: FailedVisitSupportedFormSlug;
  supported: true;
  attendeeTopology: FailedVisitAttendeeTopology;
  normalMinMeaningfulAttendees: number;
  failedVisitMinMeaningfulAttendees: 1;
  reversible: false;
  persistAuditInPayload: true;
};

export const FAILED_VISIT_SUPPORTED_FORM_SLUGS = [
  "presentacion",
  "sensibilizacion",
  "seleccion",
  "contratacion",
  "condiciones-vacante",
  "evaluacion",
  "induccion-operativa",
  "induccion-organizacional",
] as const satisfies readonly FailedVisitSupportedFormSlug[];

export const FAILED_VISIT_CONTRACT_REGISTRY = {
  presentacion: {
    formSlug: "presentacion",
    supported: true,
    attendeeTopology: "agency_advisor",
    normalMinMeaningfulAttendees: 1,
    failedVisitMinMeaningfulAttendees: 1,
    reversible: false,
    persistAuditInPayload: true,
  },
  sensibilizacion: {
    formSlug: "sensibilizacion",
    supported: true,
    attendeeTopology: "generic",
    normalMinMeaningfulAttendees: 2,
    failedVisitMinMeaningfulAttendees: 1,
    reversible: false,
    persistAuditInPayload: true,
  },
  seleccion: {
    formSlug: "seleccion",
    supported: true,
    attendeeTopology: "generic",
    normalMinMeaningfulAttendees: 1,
    failedVisitMinMeaningfulAttendees: 1,
    reversible: false,
    persistAuditInPayload: true,
  },
  contratacion: {
    formSlug: "contratacion",
    supported: true,
    attendeeTopology: "generic",
    normalMinMeaningfulAttendees: 1,
    failedVisitMinMeaningfulAttendees: 1,
    reversible: false,
    persistAuditInPayload: true,
  },
  "condiciones-vacante": {
    formSlug: "condiciones-vacante",
    supported: true,
    attendeeTopology: "agency_advisor",
    normalMinMeaningfulAttendees: 2,
    failedVisitMinMeaningfulAttendees: 1,
    reversible: false,
    persistAuditInPayload: true,
  },
  evaluacion: {
    formSlug: "evaluacion",
    supported: true,
    attendeeTopology: "agency_advisor",
    normalMinMeaningfulAttendees: 2,
    failedVisitMinMeaningfulAttendees: 1,
    reversible: false,
    persistAuditInPayload: true,
  },
  "induccion-operativa": {
    formSlug: "induccion-operativa",
    supported: true,
    attendeeTopology: "generic",
    normalMinMeaningfulAttendees: 1,
    failedVisitMinMeaningfulAttendees: 1,
    reversible: false,
    persistAuditInPayload: true,
  },
  "induccion-organizacional": {
    formSlug: "induccion-organizacional",
    supported: true,
    attendeeTopology: "generic",
    normalMinMeaningfulAttendees: 1,
    failedVisitMinMeaningfulAttendees: 1,
    reversible: false,
    persistAuditInPayload: true,
  },
} as const satisfies Record<FailedVisitSupportedFormSlug, FailedVisitContract>;

export function getFailedVisitContract(formSlug: string) {
  return FAILED_VISIT_CONTRACT_REGISTRY[
    formSlug as FailedVisitSupportedFormSlug
  ] ?? null;
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
