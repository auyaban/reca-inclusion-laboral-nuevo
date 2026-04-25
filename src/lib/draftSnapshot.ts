import type { Empresa } from "@/lib/store/empresaStore";
import {
  getDefaultContratacionValues,
  normalizeContratacionValues,
} from "@/lib/contratacion";
import {
  createEmptyEvaluacionValues,
  normalizeEvaluacionValues,
} from "@/lib/evaluacion";
import {
  getDefaultSeleccionValues,
  normalizeSeleccionValues,
} from "@/lib/seleccion";
import {
  getDefaultPresentacionValues,
  normalizePresentacionValues,
} from "@/lib/presentacion";
import {
  getDefaultSensibilizacionValues,
  normalizeSensibilizacionValues,
} from "@/lib/sensibilizacion";
import {
  getDefaultInterpreteLscValues,
  normalizeInterpreteLscValues,
} from "@/lib/interpreteLsc";
import {
  FAILED_VISIT_AUDIT_FIELD,
  shouldPersistFailedVisitAuditForSlug,
} from "@/lib/failedVisitContract";
import { buildDraftSnapshotHash } from "@/lib/drafts/shared";
import { isLongFormSlug } from "@/lib/forms";

type DraftSnapshotParams = {
  slug?: string | null;
  step: number;
  data: Record<string, unknown>;
  empresa?: Empresa | null;
  lastCheckpointHash?: string | null;
};

function normalizeSnapshotData(
  slug: string | null | undefined,
  data: Record<string, unknown>,
  empresa?: Empresa | null
) {
  if (slug === "presentacion") {
    return normalizePresentacionValues(data, empresa);
  }

  if (slug === "sensibilizacion") {
    return normalizeSensibilizacionValues(data, empresa);
  }

  if (slug === "contratacion") {
    return normalizeContratacionValues(data, empresa);
  }

  if (slug === "seleccion") {
    return normalizeSeleccionValues(data, empresa);
  }

  if (slug === "evaluacion") {
    return normalizeEvaluacionValues(data, empresa);
  }

  if (slug === "interprete-lsc") {
    return normalizeInterpreteLscValues(data, empresa);
  }

  return data;
}

function getDefaultSnapshotData(
  slug: string | null | undefined,
  empresa?: Empresa | null
) {
  if (slug === "presentacion") {
    return getDefaultPresentacionValues(empresa);
  }

  if (slug === "sensibilizacion") {
    return getDefaultSensibilizacionValues(empresa);
  }

  if (slug === "contratacion") {
    return getDefaultContratacionValues(empresa);
  }

  if (slug === "seleccion") {
    return getDefaultSeleccionValues(empresa);
  }

  if (slug === "evaluacion") {
    return createEmptyEvaluacionValues(empresa);
  }

  if (slug === "interprete-lsc") {
    return getDefaultInterpreteLscValues(empresa);
  }

  return {};
}

function serializeSnapshot(value: unknown) {
  return JSON.stringify(value);
}

function buildCompatibleCheckpointHashes(
  slug: string | null | undefined,
  step: number,
  data: Record<string, unknown>
) {
  const hashes = new Set<string>([buildDraftSnapshotHash(step, data)]);

  if (shouldPersistFailedVisitAuditForSlug(slug) && data[FAILED_VISIT_AUDIT_FIELD] === null) {
    const legacyCompatibleData = { ...data };
    delete legacyCompatibleData[FAILED_VISIT_AUDIT_FIELD];
    hashes.add(buildDraftSnapshotHash(step, legacyCompatibleData));
  }

  return hashes;
}

export function shouldPersistSnapshot({
  slug,
  data,
  empresa,
}: Omit<DraftSnapshotParams, "step" | "lastCheckpointHash">) {
  const normalized = normalizeSnapshotData(slug, data, empresa);
  const defaults = getDefaultSnapshotData(slug, empresa);

  if (slug && isLongFormSlug(slug)) {
    return serializeSnapshot(normalized) !== serializeSnapshot(defaults);
  }

  return Object.keys(data).length > 0;
}

export function resolveHasLocalDirtyChanges({
  slug,
  step,
  data,
  empresa,
  lastCheckpointHash,
}: DraftSnapshotParams) {
  if (lastCheckpointHash) {
    const normalized = normalizeSnapshotData(slug, data, empresa);
    const compatibleHashes = buildCompatibleCheckpointHashes(
      slug,
      step,
      normalized
    );
    return !compatibleHashes.has(lastCheckpointHash);
  }

  return shouldPersistSnapshot({ slug, data, empresa });
}
