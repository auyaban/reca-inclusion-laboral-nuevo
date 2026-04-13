import type { Empresa } from "@/lib/store/empresaStore";
import {
  getDefaultPresentacionValues,
  normalizePresentacionValues,
} from "@/lib/presentacion";
import {
  getDefaultSensibilizacionValues,
  normalizeSensibilizacionValues,
} from "@/lib/sensibilizacion";
import { buildDraftSnapshotHash } from "@/lib/drafts/shared";

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

  return {};
}

function serializeSnapshot(value: unknown) {
  return JSON.stringify(value);
}

export function shouldPersistSnapshot({
  slug,
  data,
  empresa,
}: Omit<DraftSnapshotParams, "step" | "lastCheckpointHash">) {
  const normalized = normalizeSnapshotData(slug, data, empresa);
  const defaults = getDefaultSnapshotData(slug, empresa);

  if (slug === "presentacion" || slug === "sensibilizacion") {
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
    return buildDraftSnapshotHash(step, normalized) !== lastCheckpointHash;
  }

  return shouldPersistSnapshot({ slug, data, empresa });
}

