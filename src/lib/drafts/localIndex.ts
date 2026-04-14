import { parseEmpresaSnapshot } from "@/lib/empresa";
import { shouldPersistSnapshot } from "@/lib/draftSnapshot";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  buildDraftSnapshotHash,
  buildLocalDraftIndexId,
  getLocalStorageHandle,
  isRecord,
  LOCAL_DRAFT_INDEX_KEY,
  type LocalDraftIndexEntry,
} from "./shared";
import { getDraftAlias } from "./aliases";

export function parseLocalDraftIndexEntry(value: unknown): LocalDraftIndexEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const slug =
    typeof value.slug === "string" && value.slug.trim() ? value.slug : null;
  const sessionId =
    typeof value.sessionId === "string" && value.sessionId.trim()
      ? value.sessionId
      : null;
  const updatedAt =
    typeof value.updatedAt === "string" && value.updatedAt.trim()
      ? value.updatedAt
      : null;

  if (!slug || !sessionId || !updatedAt) {
    return null;
  }

  const draftId =
    typeof value.draftId === "string" && value.draftId.trim()
      ? value.draftId
      : null;
  const empresaSnapshot = parseEmpresaSnapshot(value.empresaSnapshot);
  const empresaNombre =
    typeof value.empresaNombre === "string" && value.empresaNombre.trim()
      ? value.empresaNombre
      : empresaSnapshot?.nombre_empresa;
  const snapshotHash =
    typeof value.snapshotHash === "string" && value.snapshotHash.trim()
      ? value.snapshotHash
      : null;
  const empresaNit =
    typeof value.empresaNit === "string" && value.empresaNit.trim()
      ? value.empresaNit
      : empresaSnapshot?.nit_empresa ?? "";
  const hasMeaningfulContent =
    typeof value.hasMeaningfulContent === "boolean"
      ? value.hasMeaningfulContent
      : true;

  if (!empresaNombre && !empresaNit) {
    return null;
  }

  return {
    id: buildLocalDraftIndexId(slug, draftId, sessionId),
    slug,
    sessionId,
    draftId,
    empresaNit,
    empresaNombre: empresaNombre ?? undefined,
    empresaSnapshot,
    step: typeof value.step === "number" ? value.step : 0,
    updatedAt,
    snapshotHash,
    hasMeaningfulContent,
  };
}

export function readLocalDraftIndex() {
  const storage = getLocalStorageHandle();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(LOCAL_DRAFT_INDEX_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => parseLocalDraftIndexEntry(entry))
      .filter((entry): entry is LocalDraftIndexEntry => !!entry);
  } catch {
    return [];
  }
}

export function writeLocalDraftIndex(entries: LocalDraftIndexEntry[]) {
  const storage = getLocalStorageHandle();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(LOCAL_DRAFT_INDEX_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function buildLocalDraftIndexEntry({
  slug,
  sessionId,
  draftId,
  step,
  updatedAt,
  empresaSnapshot,
  empresaNit,
  empresaNombre,
  data,
  snapshotHash,
}: {
  slug: string;
  sessionId: string;
  draftId: string | null;
  step: number;
  updatedAt: string | null;
  empresaSnapshot: Empresa | null;
  empresaNit?: string;
  empresaNombre?: string;
  data?: Record<string, unknown> | null;
  snapshotHash?: string | null;
}) {
  const normalizedEmpresa = empresaSnapshot ? parseEmpresaSnapshot(empresaSnapshot) : null;
  const resolvedNit = empresaNit ?? normalizedEmpresa?.nit_empresa ?? "";
  const resolvedNombre = empresaNombre ?? normalizedEmpresa?.nombre_empresa ?? undefined;
  const resolvedSnapshotHash =
    snapshotHash ??
    (data ? buildDraftSnapshotHash(step, data) : null);
  const hasMeaningfulContent = data
    ? shouldPersistSnapshot({
        slug,
        data,
        empresa: normalizedEmpresa,
      })
    : true;

  if (!slug || !sessionId || !updatedAt || (!resolvedNit && !resolvedNombre)) {
    return null;
  }

  return {
    id: buildLocalDraftIndexId(slug, draftId, sessionId),
    slug,
    sessionId,
    draftId,
    empresaNit: resolvedNit,
    empresaNombre: resolvedNombre,
    empresaSnapshot: normalizedEmpresa,
    step,
    updatedAt,
    snapshotHash: resolvedSnapshotHash,
    hasMeaningfulContent,
  } satisfies LocalDraftIndexEntry;
}

export function upsertLocalDraftIndexEntry(entry: LocalDraftIndexEntry) {
  const entries = readLocalDraftIndex().filter((current) => current.id !== entry.id);
  entries.push(entry);
  entries.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  writeLocalDraftIndex(entries);
}

export function removeLocalDraftIndexEntry(entryId: string) {
  const nextEntries = readLocalDraftIndex().filter((entry) => entry.id !== entryId);
  writeLocalDraftIndex(nextEntries);
}

export function findPersistedDraftIdForSession(
  slug: string,
  sessionId: string
) {
  const aliasedDraftId = getDraftAlias(slug, sessionId);
  if (aliasedDraftId) {
    return aliasedDraftId;
  }

  const match = readLocalDraftIndex()
    .filter(
      (entry) =>
        entry.slug === slug &&
        entry.sessionId === sessionId &&
        typeof entry.draftId === "string" &&
        entry.draftId.trim()
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

  return match?.draftId ?? null;
}
