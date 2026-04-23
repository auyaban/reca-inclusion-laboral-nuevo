import {
  buildCanonicalFinalizationPayloadForSharedForm,
  normalizeCanonicalCondicionesVacantePayload,
  normalizeCanonicalCondicionesVacantePayloadFromNormalizedValues,
  normalizeCanonicalContratacionPayload,
  normalizeCanonicalContratacionPayloadFromNormalizedValues,
  normalizeCanonicalEvaluacionPayload,
  normalizeCanonicalEvaluacionPayloadFromNormalizedValues,
  normalizeCanonicalInterpreteLscPayload,
  normalizeCanonicalInterpreteLscPayloadFromNormalizedValues,
  normalizeCanonicalPresentacionPayload,
  normalizeCanonicalSeleccionPayload,
  normalizeCanonicalSeleccionPayloadFromNormalizedValues,
  normalizeCanonicalSensibilizacionPayload,
} from "@/lib/finalization/canonicalPayloads";
import {
  buildRegisteredFinalizationIdempotencyKey,
  buildRegisteredFinalizationRequestHash,
} from "@/lib/finalization/formRegistry";
import {
  isCanonicalFinalizationFormSlug,
  type FinalizationFormSlug,
} from "@/lib/finalization/formSlugs";
import {
  buildRequestHash,
  hashStringHex,
  type FinalizationIdentity,
  type FinalizationSuccessResponse,
} from "@/lib/finalization/idempotencyCore";
import type { ContratacionValues } from "@/lib/validations/contratacion";
import type { CondicionesVacanteValues } from "@/lib/validations/condicionesVacante";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";
import type { SeleccionValues } from "@/lib/validations/seleccion";

export type {
  FinalizationFormSlug,
  FinalizationIdentity,
  FinalizationSuccessResponse,
};

export {
  buildRequestHash,
  hashStringHex,
  normalizeCanonicalPresentacionPayload,
  normalizeCanonicalSensibilizacionPayload,
  normalizeCanonicalContratacionPayload,
  normalizeCanonicalContratacionPayloadFromNormalizedValues,
  normalizeCanonicalSeleccionPayload,
  normalizeCanonicalSeleccionPayloadFromNormalizedValues,
  normalizeCanonicalCondicionesVacantePayload,
  normalizeCanonicalCondicionesVacantePayloadFromNormalizedValues,
  normalizeCanonicalEvaluacionPayload,
  normalizeCanonicalEvaluacionPayloadFromNormalizedValues,
  normalizeCanonicalInterpreteLscPayload,
  normalizeCanonicalInterpreteLscPayloadFromNormalizedValues,
};

export function buildCanonicalFinalizationPayload(
  formSlug: FinalizationFormSlug,
  payload: Record<string, unknown>
) {
  if (isCanonicalFinalizationFormSlug(formSlug)) {
    return buildCanonicalFinalizationPayloadForSharedForm(formSlug, payload);
  }

  throw new Error(
    `El formulario ${formSlug} no usa buildCanonicalFinalizationPayload().`
  );
}

export function buildFinalizationRequestHash(
  formSlug: FinalizationFormSlug,
  payload: Record<string, unknown>
) {
  return buildRegisteredFinalizationRequestHash(formSlug, payload);
}

export function buildCondicionesVacanteRequestHash(
  payload: CondicionesVacanteValues
) {
  return buildRequestHash(
    normalizeCanonicalCondicionesVacantePayloadFromNormalizedValues(payload)
  );
}

export function buildContratacionRequestHash(payload: ContratacionValues) {
  return buildRequestHash(
    normalizeCanonicalContratacionPayloadFromNormalizedValues(payload)
  );
}

export function buildSeleccionRequestHash(payload: SeleccionValues) {
  return buildRequestHash(
    normalizeCanonicalSeleccionPayloadFromNormalizedValues(payload)
  );
}

export function buildEvaluacionRequestHash(payload: EvaluacionValues) {
  return buildRequestHash(
    normalizeCanonicalEvaluacionPayloadFromNormalizedValues(payload)
  );
}

export function buildInterpreteLscRequestHash(payload: InterpreteLscValues) {
  return buildRequestHash(
    normalizeCanonicalInterpreteLscPayloadFromNormalizedValues(payload)
  );
}

export function buildFinalizationIdempotencyKey({
  formSlug,
  userId,
  identity,
  requestHash,
}: {
  formSlug: FinalizationFormSlug;
  userId: string;
  identity: FinalizationIdentity;
  requestHash: string;
}) {
  return buildRegisteredFinalizationIdempotencyKey({
    formSlug,
    userId,
    identity,
    requestHash,
  });
}
