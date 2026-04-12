import { createClient } from "@/lib/supabase/client";
import {
  deleteDraftPayload,
  listDraftPayloadKeys,
  readDraftPayload,
  writeDraftPayload,
} from "@/lib/draftStorage";
import { EMPRESA_SELECT_FIELDS, parseEmpresaSnapshot } from "@/lib/empresa";
import type { Empresa } from "@/lib/store/empresaStore";

export type DraftSummary = {
  id: string;
  form_slug: string;
  step: number;
  empresa_nit: string;
  empresa_nombre?: string;
  empresa_snapshot?: Empresa | null;
  updated_at?: string;
  created_at?: string;
  last_checkpoint_at?: string | null;
};

export type DraftMeta = DraftSummary & {
  data: Record<string, unknown>;
  last_checkpoint_hash?: string | null;
};

export type LocalDraft = {
  step: number;
  data: Record<string, unknown>;
  empresa: Empresa | null;
  updatedAt: string | null;
};

export type LocalDraftIndexEntry = {
  id: string;
  slug: string;
  sessionId: string;
  draftId: string | null;
  empresaNit: string;
  empresaNombre?: string;
  empresaSnapshot: Empresa | null;
  step: number;
  updatedAt: string;
};

export type HubDraftSyncStatus =
  | "local_only"
  | "local_newer"
  | "synced"
  | "remote_only";

export type HubDraft = {
  id: string;
  form_slug: string;
  empresa_nit: string;
  empresa_nombre?: string;
  empresa_snapshot?: Empresa | null;
  step: number;
  draftId: string | null;
  sessionId: string | null;
  localUpdatedAt: string | null;
  remoteUpdatedAt: string | null;
  effectiveUpdatedAt: string | null;
  syncStatus: HubDraftSyncStatus;
};

type DraftSelectResult = {
  data: unknown;
  error: unknown;
};

type DraftRow = {
  id: string;
  form_slug: string;
  empresa_nit: string;
  empresa_nombre: string | null;
  empresa_snapshot: unknown;
  step: number | null;
  data: Record<string, unknown> | null;
  updated_at: string | null;
  created_at: string | null;
  last_checkpoint_at: string | null;
  last_checkpoint_hash: string | null;
};

type DraftSchemaMode = "unknown" | "legacy" | "extended";
type CheckpointColumnsMode = "unknown" | "supported" | "unsupported";

export const LOCAL_DRAFT_INDEX_KEY = "draft_index__v1";
export const LOCAL_DRAFT_PREFIX = "draft__";

const EXTENDED_DRAFT_BASE_FIELDS = [
  "id",
  "form_slug",
  "empresa_nit",
  "empresa_nombre",
  "step",
  "updated_at",
  "created_at",
].join(", ");

const EXTENDED_DRAFT_SUMMARY_FIELDS = [
  EXTENDED_DRAFT_BASE_FIELDS,
  "last_checkpoint_at",
].join(", ");

const EXTENDED_DRAFT_RETURN_FIELDS = [
  EXTENDED_DRAFT_SUMMARY_FIELDS,
  "last_checkpoint_hash",
].join(", ");

const EXTENDED_DRAFT_PAYLOAD_FIELDS = [
  EXTENDED_DRAFT_RETURN_FIELDS,
  "empresa_snapshot",
  "data",
].join(", ");

const LEGACY_DRAFT_BASE_FIELDS = [
  "id",
  "form_slug",
  "empresa_nit",
  "empresa_nombre",
  "step",
  "updated_at",
].join(", ");

const LEGACY_DRAFT_SUMMARY_FIELDS = LEGACY_DRAFT_BASE_FIELDS;
const LEGACY_DRAFT_RETURN_FIELDS = LEGACY_DRAFT_BASE_FIELDS;
const LEGACY_DRAFT_PAYLOAD_FIELDS = [
  LEGACY_DRAFT_BASE_FIELDS,
  "data",
].join(", ");

let draftSchemaMode: DraftSchemaMode = "unknown";
let checkpointColumnsMode: CheckpointColumnsMode = "unknown";
let reconcileLocalDraftIndexPromise: Promise<LocalDraftIndexEntry[]> | null = null;
let currentUserIdCache:
  | {
      value: string | null;
      fetchedAt: number;
      inflight: Promise<string | null> | null;
    }
  | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeDraftData(value: unknown) {
  return isRecord(value) ? value : {};
}

export function isMissingDraftSchemaError(error: unknown) {
  return isRecord(error) && error.code === "42703";
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (isRecord(error)) {
    const message =
      typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : null;
    const details =
      typeof error.details === "string" && error.details.trim()
        ? error.details.trim()
        : null;
    const hint =
      typeof error.hint === "string" && error.hint.trim()
        ? error.hint.trim()
        : null;

    const combined = [message, details, hint].filter(Boolean).join(" ");
    if (combined) {
      return combined;
    }
  }

  return fallback;
}

export function getDraftSchemaMode() {
  return draftSchemaMode;
}

export function getCheckpointColumnsMode() {
  return checkpointColumnsMode;
}

export function markCheckpointColumnsUnsupported() {
  checkpointColumnsMode = "unsupported";
}

export function markDraftSchemaLegacy() {
  draftSchemaMode = "legacy";
}

export function markDraftSchemaExtended() {
  draftSchemaMode = "extended";
}

export function getDraftFields(
  mode: "summary" | "return" | "payload",
  options?: { includeCheckpointColumns?: boolean }
) {
  const includeCheckpointColumns =
    options?.includeCheckpointColumns ?? checkpointColumnsMode !== "unsupported";

  if (draftSchemaMode === "legacy") {
    if (mode === "payload") {
      return LEGACY_DRAFT_PAYLOAD_FIELDS;
    }

    return mode === "return"
      ? LEGACY_DRAFT_RETURN_FIELDS
      : LEGACY_DRAFT_SUMMARY_FIELDS;
  }

  if (mode === "payload") {
    return includeCheckpointColumns
      ? EXTENDED_DRAFT_PAYLOAD_FIELDS
      : [EXTENDED_DRAFT_BASE_FIELDS, "data"].join(", ");
  }

  if (mode === "return") {
    return includeCheckpointColumns
      ? EXTENDED_DRAFT_RETURN_FIELDS
      : EXTENDED_DRAFT_BASE_FIELDS;
  }

  return includeCheckpointColumns
    ? EXTENDED_DRAFT_SUMMARY_FIELDS
    : EXTENDED_DRAFT_BASE_FIELDS;
}

export async function runDraftSelect(
  mode: "summary" | "return" | "payload",
  queryFactory: (fields: string) => PromiseLike<DraftSelectResult>
): Promise<DraftSelectResult> {
  const withCheckpointFields = getDraftFields(mode);
  let result = await queryFactory(withCheckpointFields);

  if (
    draftSchemaMode !== "legacy" &&
    checkpointColumnsMode !== "unsupported" &&
    isRecord(result) &&
    isMissingDraftSchemaError(result.error)
  ) {
    checkpointColumnsMode = "unsupported";
    result = await queryFactory(
      getDraftFields(mode, { includeCheckpointColumns: false })
    );
  }

  if (
    draftSchemaMode !== "legacy" &&
    isRecord(result) &&
    isMissingDraftSchemaError(result.error)
  ) {
    draftSchemaMode = "legacy";
    result = await queryFactory(getDraftFields(mode));
  } else if (draftSchemaMode === "unknown" && isRecord(result) && !result.error) {
    draftSchemaMode = "extended";
  }

  if (
    draftSchemaMode === "extended" &&
    checkpointColumnsMode === "unknown" &&
    isRecord(result) &&
    !result.error &&
    withCheckpointFields.includes("last_checkpoint_at")
  ) {
    checkpointColumnsMode = "supported";
  }

  return result;
}

export async function getCurrentUserId() {
  const now = Date.now();
  if (
    currentUserIdCache &&
    currentUserIdCache.inflight === null &&
    !!currentUserIdCache.value &&
    now - currentUserIdCache.fetchedAt < 5_000
  ) {
    return currentUserIdCache.value;
  }

  if (currentUserIdCache?.inflight) {
    return currentUserIdCache.inflight;
  }

  const inflight = (async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const value = session?.user.id ?? null;
      currentUserIdCache = {
        value,
        fetchedAt: value ? Date.now() : 0,
        inflight: null,
      };
      return value;
    } catch (error) {
      currentUserIdCache = {
        value: null,
        fetchedAt: 0,
        inflight: null,
      };
      throw error;
    }
  })();

  currentUserIdCache = {
    value: currentUserIdCache?.value ?? null,
    fetchedAt: currentUserIdCache?.fetchedAt ?? 0,
    inflight,
  };

  return inflight;
}

export function buildDraftSummary(
  row: DraftRow,
  empresaSnapshot: Empresa | null
): DraftSummary {
  return {
    id: row.id,
    form_slug: row.form_slug,
    step: row.step ?? 0,
    empresa_nit: row.empresa_nit,
    empresa_nombre: row.empresa_nombre ?? undefined,
    empresa_snapshot: empresaSnapshot,
    updated_at: row.updated_at ?? undefined,
    created_at: row.created_at ?? undefined,
    last_checkpoint_at: row.last_checkpoint_at ?? null,
  };
}

export function buildDraftMeta(row: DraftRow, empresaSnapshot: Empresa | null): DraftMeta {
  return {
    ...buildDraftSummary(row, empresaSnapshot),
    data: row.data ?? {},
    last_checkpoint_hash: row.last_checkpoint_hash ?? null,
  };
}

function buildLocalDraftIndexId(
  slug: string,
  draftId: string | null,
  sessionId: string
) {
  return draftId ? `draft:${draftId}` : `session:${slug}:${sessionId}`;
}

export function getDraftWritePayload(
  slug: string,
  empresa: Empresa,
  step: number,
  data: Record<string, unknown>
) {
  const basePayload = {
    form_slug: slug,
    empresa_nit: empresa.nit_empresa,
    empresa_nombre: empresa.nombre_empresa,
    step,
    data,
  };

  if (draftSchemaMode === "legacy") {
    return basePayload;
  }

  return {
    ...basePayload,
    empresa_snapshot: empresa,
  };
}

export function getDraftStubWritePayload(slug: string, empresa: Empresa, step: number) {
  const basePayload = getDraftWritePayload(slug, empresa, step, {});

  if (checkpointColumnsMode === "unsupported") {
    return basePayload;
  }

  return {
    ...basePayload,
    last_checkpoint_at: null,
    last_checkpoint_hash: null,
  };
}

export function getDraftCheckpointWritePayload(
  slug: string,
  empresa: Empresa,
  step: number,
  data: Record<string, unknown>,
  checkpointAt: string,
  checkpointHash: string
) {
  const basePayload = getDraftWritePayload(slug, empresa, step, data);

  if (checkpointColumnsMode === "unsupported") {
    return basePayload;
  }

  return {
    ...basePayload,
    last_checkpoint_at: checkpointAt,
    last_checkpoint_hash: checkpointHash,
  };
}

export function getStorageKey(
  slug: string | null | undefined,
  draftId: string | null,
  localDraftSessionId: string
) {
  if (!slug) {
    return null;
  }

  if (draftId) {
    return `draft__${slug}__${draftId}`;
  }

  return `draft__${slug}__session__${localDraftSessionId}`;
}

function parseStorageKey(storageKey: string) {
  if (!storageKey.startsWith(LOCAL_DRAFT_PREFIX)) {
    return null;
  }

  const parts = storageKey.split("__");
  if (parts.length === 4 && parts[2] === "session") {
    return {
      slug: parts[1],
      draftId: null,
      sessionId: parts[3],
    };
  }

  if (parts.length === 3) {
    return {
      slug: parts[1],
      draftId: parts[2],
      sessionId: `draft:${parts[2]}`,
    };
  }

  return null;
}

export function getDraftUpdatedAt(draft: DraftSummary | DraftMeta) {
  return draft.updated_at ?? draft.created_at ?? null;
}

export function hasRemoteCheckpoint(draft: DraftSummary | DraftMeta) {
  return Boolean(draft.last_checkpoint_at ?? null);
}

function getTimestampValue(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareTimestamps(a?: string | null, b?: string | null) {
  return getTimestampValue(a) - getTimestampValue(b);
}

function buildDraftReconcileFingerprint(
  slug: string,
  draft: LocalDraft,
  empresaNit?: string,
  empresaNombre?: string
) {
  return [
    slug,
    draft.updatedAt ?? "",
    draft.step,
    empresaNit ?? draft.empresa?.nit_empresa ?? "",
    empresaNombre ?? draft.empresa?.nombre_empresa ?? "",
  ].join("|");
}

export async function saveLocalCopy(
  storageKey: string | null,
  step: number,
  data: Record<string, unknown>,
  empresaSnapshot: Empresa | null,
  updatedAtOverride?: string | null
) {
  if (!storageKey) return null;

  const updatedAt =
    typeof updatedAtOverride === "string" && updatedAtOverride.trim()
      ? updatedAtOverride
      : new Date().toISOString();

  return writeDraftPayload(storageKey, {
    step,
    data,
    empresaSnapshot,
    updatedAt,
  });
}

export async function removeLocalCopy(storageKey: string | null) {
  if (!storageKey) return;

  try {
    localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }

  await deleteDraftPayload(storageKey);
}

function parseLegacyUpdatedAt(ts: unknown) {
  if (typeof ts === "number" && Number.isFinite(ts)) {
    return new Date(ts).toISOString();
  }

  if (typeof ts === "string" && ts.trim()) {
    const parsed = new Date(ts);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

export async function readLocalCopy(storageKey: string | null): Promise<LocalDraft | null> {
  if (!storageKey) {
    return null;
  }

  const indexedPayload = await readDraftPayload(storageKey);
  if (indexedPayload) {
    return {
      step: indexedPayload.step,
      data: normalizeDraftData(indexedPayload.data),
      empresa: parseEmpresaSnapshot(indexedPayload.empresaSnapshot),
      updatedAt: indexedPayload.updatedAt ?? null,
    };
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    if (parsed.version === 2) {
      const localDraft = {
        step: typeof parsed.step === "number" ? parsed.step : 0,
        data: normalizeDraftData(parsed.data),
        empresa: parseEmpresaSnapshot(parsed.empresaSnapshot),
        updatedAt:
          typeof parsed.updatedAt === "string" && parsed.updatedAt.trim()
            ? parsed.updatedAt
            : null,
      };

      const savedAt = await writeDraftPayload(storageKey, {
        step: localDraft.step,
        data: localDraft.data,
        empresaSnapshot: localDraft.empresa,
        updatedAt: localDraft.updatedAt ?? new Date().toISOString(),
      });

      if (savedAt) {
        localStorage.removeItem(storageKey);
      }

      return {
        ...localDraft,
        updatedAt: savedAt ?? localDraft.updatedAt,
      };
    }

    const localDraft = {
      step: typeof parsed.step === "number" ? parsed.step : 0,
      data: normalizeDraftData(parsed.data),
      empresa: null,
      updatedAt: parseLegacyUpdatedAt(parsed.ts),
    };

    const savedAt = await writeDraftPayload(storageKey, {
      step: localDraft.step,
      data: localDraft.data,
      empresaSnapshot: localDraft.empresa,
      updatedAt: localDraft.updatedAt ?? new Date().toISOString(),
    });

    if (savedAt) {
      localStorage.removeItem(storageKey);
    }

    return {
      ...localDraft,
      updatedAt: savedAt ?? localDraft.updatedAt,
    };
  } catch {
    return null;
  }
}

function parseLocalDraftIndexEntry(value: unknown): LocalDraftIndexEntry | null {
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
  const empresaNit =
    typeof value.empresaNit === "string" && value.empresaNit.trim()
      ? value.empresaNit
      : empresaSnapshot?.nit_empresa ?? "";

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
  };
}

function readLocalDraftIndex() {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFT_INDEX_KEY);
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

function writeLocalDraftIndex(entries: LocalDraftIndexEntry[]) {
  try {
    localStorage.setItem(LOCAL_DRAFT_INDEX_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function buildLocalDraftIndexEntry({
  slug,
  sessionId,
  draftId,
  step,
  updatedAt,
  empresaSnapshot,
  empresaNit,
  empresaNombre,
}: {
  slug: string;
  sessionId: string;
  draftId: string | null;
  step: number;
  updatedAt: string | null;
  empresaSnapshot: Empresa | null;
  empresaNit?: string;
  empresaNombre?: string;
}) {
  const normalizedEmpresa = empresaSnapshot ? parseEmpresaSnapshot(empresaSnapshot) : null;
  const resolvedNit = empresaNit ?? normalizedEmpresa?.nit_empresa ?? "";
  const resolvedNombre = empresaNombre ?? normalizedEmpresa?.nombre_empresa ?? undefined;

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
  } satisfies LocalDraftIndexEntry;
}

export async function reconcileLocalDraftIndex() {
  if (reconcileLocalDraftIndexPromise) {
    return reconcileLocalDraftIndexPromise;
  }

  reconcileLocalDraftIndexPromise = (async () => {
    const reconciled = new Map<string, LocalDraftIndexEntry>();
    const draftFingerprints = new Set<string>();
    const indexedEntries = readLocalDraftIndex();

    const commitEntry = (
      entry: LocalDraftIndexEntry,
      localDraft: LocalDraft,
      options?: { skipIfDuplicateSession?: boolean }
    ) => {
      const fingerprint = buildDraftReconcileFingerprint(
        entry.slug,
        localDraft,
        entry.empresaNit,
        entry.empresaNombre
      );

      if (options?.skipIfDuplicateSession && !entry.draftId && draftFingerprints.has(fingerprint)) {
        return;
      }

      reconciled.set(entry.id, entry);
      if (entry.draftId) {
        draftFingerprints.add(fingerprint);
      }
    };

    for (const entry of indexedEntries) {
      const storageKey = getStorageKey(entry.slug, entry.draftId, entry.sessionId);
      const localDraft = await readLocalCopy(storageKey);
      if (!localDraft) {
        continue;
      }

      const refreshedEntry = buildLocalDraftIndexEntry({
        slug: entry.slug,
        sessionId: entry.sessionId,
        draftId: entry.draftId,
        step: localDraft.step,
        updatedAt: localDraft.updatedAt ?? entry.updatedAt,
        empresaSnapshot: localDraft.empresa ?? entry.empresaSnapshot,
        empresaNit: entry.empresaNit,
        empresaNombre: entry.empresaNombre,
      });

      if (refreshedEntry) {
        commitEntry(refreshedEntry, localDraft);
      }
    }

    try {
      const indexedDbKeys = await listDraftPayloadKeys();

      for (const storageKey of indexedDbKeys) {
        const parsedKey = parseStorageKey(storageKey);
        if (!parsedKey) {
          continue;
        }

        const entryId = buildLocalDraftIndexId(
          parsedKey.slug,
          parsedKey.draftId,
          parsedKey.sessionId
        );
        if (reconciled.has(entryId)) {
          continue;
        }

        const localDraft = await readLocalCopy(storageKey);
        if (!localDraft) {
          continue;
        }

        const discoveredEntry = buildLocalDraftIndexEntry({
          slug: parsedKey.slug,
          sessionId: parsedKey.sessionId,
          draftId: parsedKey.draftId,
          step: localDraft.step,
          updatedAt: localDraft.updatedAt,
          empresaSnapshot: localDraft.empresa,
        });

        if (discoveredEntry) {
          commitEntry(discoveredEntry, localDraft, { skipIfDuplicateSession: true });
        }
      }

      const localStorageKeys = Array.from(
        { length: localStorage.length },
        (_, index) => localStorage.key(index)
      );

      for (const storageKey of localStorageKeys) {
        if (!storageKey || !storageKey.startsWith(LOCAL_DRAFT_PREFIX)) {
          continue;
        }

        const parsedKey = parseStorageKey(storageKey);
        if (!parsedKey) {
          continue;
        }

        const entryId = buildLocalDraftIndexId(
          parsedKey.slug,
          parsedKey.draftId,
          parsedKey.sessionId
        );
        if (reconciled.has(entryId)) {
          continue;
        }

        const localDraft = await readLocalCopy(storageKey);
        if (!localDraft) {
          continue;
        }

        const discoveredEntry = buildLocalDraftIndexEntry({
          slug: parsedKey.slug,
          sessionId: parsedKey.sessionId,
          draftId: parsedKey.draftId,
          step: localDraft.step,
          updatedAt: localDraft.updatedAt,
          empresaSnapshot: localDraft.empresa,
        });

        if (discoveredEntry) {
          commitEntry(discoveredEntry, localDraft, { skipIfDuplicateSession: true });
        }
      }
    } catch {
      return [];
    }

    const nextEntries = Array.from(reconciled.values()).sort(
      (left, right) => compareTimestamps(right.updatedAt, left.updatedAt)
    );

    writeLocalDraftIndex(nextEntries);
    return nextEntries;
  })();

  try {
    return await reconcileLocalDraftIndexPromise;
  } finally {
    reconcileLocalDraftIndexPromise = null;
  }
}

export function buildHubDrafts(
  remoteDrafts: DraftSummary[],
  localEntries: LocalDraftIndexEntry[]
) {
  const drafts: HubDraft[] = [];
  const usedRemoteDraftIds = new Set<string>();
  const remoteDraftsById = new Map(
    remoteDrafts.map((draft) => [draft.id, draft] as const)
  );

  for (const localEntry of localEntries) {
    const remoteDraft =
      localEntry.draftId ? remoteDraftsById.get(localEntry.draftId) : null;

    if (!remoteDraft || !hasRemoteCheckpoint(remoteDraft)) {
      drafts.push({
        id: localEntry.id,
        form_slug: localEntry.slug,
        empresa_nit: localEntry.empresaNit,
        empresa_nombre: localEntry.empresaNombre,
        empresa_snapshot: localEntry.empresaSnapshot,
        step: localEntry.step,
        draftId: remoteDraft?.id ?? localEntry.draftId,
        sessionId: localEntry.sessionId,
        localUpdatedAt: localEntry.updatedAt,
        remoteUpdatedAt: remoteDraft ? getDraftUpdatedAt(remoteDraft) : null,
        effectiveUpdatedAt: localEntry.updatedAt,
        syncStatus: "local_only",
      });

      if (remoteDraft) {
        usedRemoteDraftIds.add(remoteDraft.id);
      }
      continue;
    }

    usedRemoteDraftIds.add(remoteDraft.id);

    const remoteUpdatedAt = getDraftUpdatedAt(remoteDraft);
    const localIsNewer = compareTimestamps(localEntry.updatedAt, remoteUpdatedAt) > 0;
    const empresaSnapshot =
      localEntry.empresaSnapshot ?? remoteDraft.empresa_snapshot;

    drafts.push({
      id: buildLocalDraftIndexId(
        remoteDraft.form_slug,
        remoteDraft.id,
        localEntry.sessionId
      ),
      form_slug: remoteDraft.form_slug,
      empresa_nit: localEntry.empresaNit || remoteDraft.empresa_nit,
      empresa_nombre:
        localEntry.empresaNombre ?? remoteDraft.empresa_nombre ?? undefined,
      empresa_snapshot: empresaSnapshot,
      step: localIsNewer ? localEntry.step : remoteDraft.step,
      draftId: remoteDraft.id,
      sessionId: localEntry.sessionId,
      localUpdatedAt: localEntry.updatedAt,
      remoteUpdatedAt,
      effectiveUpdatedAt: localIsNewer ? localEntry.updatedAt : remoteUpdatedAt,
      syncStatus: localIsNewer ? "local_newer" : "synced",
    });
  }

  for (const remoteDraft of remoteDrafts) {
    if (usedRemoteDraftIds.has(remoteDraft.id)) {
      continue;
    }

    if (!hasRemoteCheckpoint(remoteDraft)) {
      continue;
    }

    const remoteUpdatedAt = getDraftUpdatedAt(remoteDraft);
    drafts.push({
      id: buildLocalDraftIndexId(
        remoteDraft.form_slug,
        remoteDraft.id,
        `draft:${remoteDraft.id}`
      ),
      form_slug: remoteDraft.form_slug,
      empresa_nit: remoteDraft.empresa_nit,
      empresa_nombre: remoteDraft.empresa_nombre,
      empresa_snapshot: remoteDraft.empresa_snapshot,
      step: remoteDraft.step,
      draftId: remoteDraft.id,
      sessionId: null,
      localUpdatedAt: null,
      remoteUpdatedAt,
      effectiveUpdatedAt: remoteUpdatedAt,
      syncStatus: "remote_only",
    });
  }

  return drafts.sort((left, right) =>
    compareTimestamps(right.effectiveUpdatedAt, left.effectiveUpdatedAt)
  );
}

export async function getEmpresaFromNit(nit: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("empresas")
    .select(EMPRESA_SELECT_FIELDS)
    .eq("nit_empresa", nit)
    .limit(1)
    .maybeSingle();

  return (data as Empresa | null) ?? null;
}

export async function fetchDraftSummaries(userId: string) {
  const supabase = createClient();
  const { data, error } = await runDraftSelect("summary", (fields) =>
    supabase
      .from("form_drafts")
      .select(fields)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
  );

  if (error) {
    throw error;
  }

  return (((data ?? []) as unknown) as DraftRow[]).map((row) =>
    buildDraftSummary(row, parseEmpresaSnapshot(row.empresa_snapshot))
  );
}

export async function fetchRecoverableRemoteDraftIds(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("form_drafts")
    .select("id")
    .eq("user_id", userId)
    .not("last_checkpoint_at", "is", null);

  if (!error) {
    return (((data ?? []) as unknown[]) as Array<{ id?: string | null }>)
      .map((row) => (typeof row?.id === "string" ? row.id : null))
      .filter((id): id is string => !!id);
  }

  const summaries = await fetchDraftSummaries(userId);
  return summaries
    .filter((draft) => hasRemoteCheckpoint(draft))
    .map((draft) => draft.id);
}

export async function fetchDraftPayload(userId: string, draftId: string) {
  const supabase = createClient();
  const { data, error } = await runDraftSelect("payload", (fields) =>
    supabase
      .from("form_drafts")
      .select(fields)
      .eq("user_id", userId)
      .eq("id", draftId)
      .maybeSingle()
  );

  if (error) {
    throw error;
  }

  if (!data) {
    return { draft: null, empresa: null };
  }

  const row = data as DraftRow;
  let empresaSnapshot = parseEmpresaSnapshot(row.empresa_snapshot);

  if (!empresaSnapshot && row.empresa_nit) {
    empresaSnapshot = await getEmpresaFromNit(row.empresa_nit);
  }

  return {
    draft: buildDraftMeta(row, empresaSnapshot),
    empresa: empresaSnapshot,
  };
}
