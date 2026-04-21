import type { TextReviewFormSlug } from "@/lib/finalization/textReviewFields";
import {
  buildCanonicalCondicionesVacanteRequestHash,
  buildCanonicalContratacionRequestHash,
  buildCanonicalEvaluacionRequestHash,
  buildCanonicalPresentacionRequestHash,
  buildCanonicalSeleccionRequestHash,
  buildCanonicalSensibilizacionRequestHash,
} from "@/lib/finalization/canonicalPayloads";
import {
  buildScopedFinalizationIdempotencyKey,
  type FinalizationIdentity,
} from "@/lib/finalization/idempotencyCore";
import {
  FINALIZATION_FORM_SLUGS,
  type FinalizationFormSlug,
} from "@/lib/finalization/formSlugs";
import {
  buildInduccionOrganizacionalIdempotencyKey,
  buildInduccionOrganizacionalRequestHash,
} from "@/lib/finalization/induccionOrganizacionalRequest";
import {
  buildInduccionOperativaIdempotencyKey,
  buildInduccionOperativaRequestHash,
} from "@/lib/induccionOperativa";

type FinalizationFormRegistryEntry = {
  slug: FinalizationFormSlug;
  buildRequestHash: (payload: Record<string, unknown>) => string;
  buildIdempotencyKey: (options: {
    userId: string;
    identity: FinalizationIdentity;
    requestHash: string;
  }) => string;
  textReviewFormSlug: TextReviewFormSlug | null;
  supportsTextReview: boolean;
};

function createEntry(
  entry: Omit<FinalizationFormRegistryEntry, "supportsTextReview">
): FinalizationFormRegistryEntry {
  return {
    ...entry,
    supportsTextReview: entry.textReviewFormSlug !== null,
  };
}

function createSharedIdempotencyBuilder(formSlug: FinalizationFormSlug) {
  return (options: {
    userId: string;
    identity: FinalizationIdentity;
    requestHash: string;
  }) =>
    buildScopedFinalizationIdempotencyKey({
      formSlug,
      ...options,
    });
}

export const FINALIZATION_FORM_REGISTRY = {
  presentacion: createEntry({
    slug: "presentacion",
    buildRequestHash: buildCanonicalPresentacionRequestHash,
    buildIdempotencyKey: createSharedIdempotencyBuilder("presentacion"),
    textReviewFormSlug: "presentacion",
  }),
  sensibilizacion: createEntry({
    slug: "sensibilizacion",
    buildRequestHash: buildCanonicalSensibilizacionRequestHash,
    buildIdempotencyKey: createSharedIdempotencyBuilder("sensibilizacion"),
    textReviewFormSlug: "sensibilizacion",
  }),
  seleccion: createEntry({
    slug: "seleccion",
    buildRequestHash: buildCanonicalSeleccionRequestHash,
    buildIdempotencyKey: createSharedIdempotencyBuilder("seleccion"),
    textReviewFormSlug: "seleccion",
  }),
  contratacion: createEntry({
    slug: "contratacion",
    buildRequestHash: buildCanonicalContratacionRequestHash,
    buildIdempotencyKey: createSharedIdempotencyBuilder("contratacion"),
    textReviewFormSlug: "contratacion",
  }),
  "condiciones-vacante": createEntry({
    slug: "condiciones-vacante",
    buildRequestHash: buildCanonicalCondicionesVacanteRequestHash,
    buildIdempotencyKey: createSharedIdempotencyBuilder("condiciones-vacante"),
    textReviewFormSlug: "condiciones_vacante",
  }),
  evaluacion: createEntry({
    slug: "evaluacion",
    buildRequestHash: buildCanonicalEvaluacionRequestHash,
    buildIdempotencyKey: createSharedIdempotencyBuilder("evaluacion"),
    textReviewFormSlug: "evaluacion",
  }),
  "induccion-organizacional": createEntry({
    slug: "induccion-organizacional",
    buildRequestHash: (payload) =>
      buildInduccionOrganizacionalRequestHash(payload as never),
    buildIdempotencyKey: buildInduccionOrganizacionalIdempotencyKey,
    textReviewFormSlug: "induccion_organizacional",
  }),
  "induccion-operativa": createEntry({
    slug: "induccion-operativa",
    buildRequestHash: (payload) => buildInduccionOperativaRequestHash(payload as never),
    buildIdempotencyKey: buildInduccionOperativaIdempotencyKey,
    textReviewFormSlug: "induccion_operativa",
  }),
} as const satisfies Record<FinalizationFormSlug, FinalizationFormRegistryEntry>;

export { FINALIZATION_FORM_SLUGS };

export function isFinalizationFormSlug(
  formSlug: string
): formSlug is FinalizationFormSlug {
  return (FINALIZATION_FORM_SLUGS as readonly string[]).includes(formSlug.trim());
}

export function getFinalizationFormRegistryEntry(formSlug: FinalizationFormSlug) {
  return FINALIZATION_FORM_REGISTRY[formSlug];
}

export function getFinalizationFormTextReviewSlug(formSlug: string) {
  const normalizedFormSlug = formSlug.trim();
  if (!isFinalizationFormSlug(normalizedFormSlug)) {
    const registryEntry = Object.values(FINALIZATION_FORM_REGISTRY).find(
      (entry) => entry.textReviewFormSlug === normalizedFormSlug
    );
    return registryEntry?.textReviewFormSlug ?? null;
  }

  return FINALIZATION_FORM_REGISTRY[normalizedFormSlug]?.textReviewFormSlug ?? null;
}

export function buildRegisteredFinalizationRequestHash(
  formSlug: FinalizationFormSlug,
  payload: Record<string, unknown>
) {
  return getFinalizationFormRegistryEntry(formSlug).buildRequestHash(payload);
}

export function buildRegisteredFinalizationIdempotencyKey(options: {
  formSlug: FinalizationFormSlug;
  userId: string;
  identity: FinalizationIdentity;
  requestHash: string;
}) {
  const { formSlug, ...rest } = options;
  return getFinalizationFormRegistryEntry(formSlug).buildIdempotencyKey(rest);
}
