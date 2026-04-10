"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EMPRESA_SELECT_FIELDS, parseEmpresaSnapshot } from "@/lib/empresa";
import type { Empresa } from "@/lib/store/empresaStore";

export type DraftSummary = {
  id: string;
  form_slug: string;
  step: number;
  empresa_nit: string;
  empresa_nombre?: string;
  empresa_snapshot: Empresa | null;
  updated_at?: string;
  created_at?: string;
  last_checkpoint_at?: string | null;
};

export type DraftMeta = DraftSummary & {
  data: Record<string, unknown>;
  last_checkpoint_hash?: string | null;
};

type Options = {
  slug?: string | null;
  empresa?: Empresa | null;
  initialDraftId?: string | null;
  initialLocalDraftSessionId?: string | null;
  loadMatchingDrafts?: boolean;
  loadAllDrafts?: boolean;
};

type SaveDraftResult = {
  ok: boolean;
  draftId?: string;
  error?: string;
};

type EnsureDraftIdentityResult = {
  ok: boolean;
  draftId?: string;
  error?: string;
};

type CheckpointDraftReason =
  | "manual"
  | "interval"
  | "pagehide"
  | "visibilitychange";

type CheckpointDraftResult = SaveDraftResult;

export type RemoteIdentityState =
  | "idle"
  | "creating"
  | "ready"
  | "local_only_fallback";

type LoadDraftResult = {
  draft: DraftMeta | null;
  empresa: Empresa | null;
  error?: string;
};

type LocalDraft = {
  step: number;
  data: Record<string, unknown>;
  empresa: Empresa | null;
  updatedAt: string | null;
};

type LocalDraftEnvelopeV2 = {
  version: 2;
  step: number;
  data: Record<string, unknown>;
  empresaSnapshot: Empresa | null;
  updatedAt: string;
};

type LocalDraftIndexEntry = {
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
  empresa_snapshot: Empresa | null;
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

const LOCAL_DRAFT_INDEX_KEY = "draft_index__v1";
const LOCAL_DRAFT_PREFIX = "draft__";
const REMOTE_CHECKPOINT_INTERVAL_MS = 15 * 60 * 1000;

const EXTENDED_DRAFT_BASE_FIELDS = [
  "id",
  "form_slug",
  "empresa_nit",
  "empresa_nombre",
  "empresa_snapshot",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeDraftData(value: unknown) {
  return isRecord(value) ? value : {};
}

function isMissingDraftSchemaError(error: unknown) {
  return isRecord(error) && error.code === "42703";
}

function getDraftFields(
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

async function runDraftSelect(
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

function createSessionId() {
  return crypto.randomUUID();
}

function buildDraftSummary(
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

function buildDraftMeta(row: DraftRow, empresaSnapshot: Empresa | null): DraftMeta {
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

function getDraftWritePayload(
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

function getDraftStubWritePayload(slug: string, empresa: Empresa, step: number) {
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

function getDraftCheckpointWritePayload(
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

async function getEmpresaFromNit(nit: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("empresas")
    .select(EMPRESA_SELECT_FIELDS)
    .eq("nit_empresa", nit)
    .limit(1)
    .maybeSingle();

  return (data as Empresa | null) ?? null;
}

function getStorageKey(
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

function getDraftUpdatedAt(draft: DraftSummary | DraftMeta) {
  return draft.updated_at ?? draft.created_at ?? null;
}

function getDraftLastCheckpointAt(draft: DraftSummary | DraftMeta) {
  return draft.last_checkpoint_at ?? null;
}

function hasRemoteCheckpoint(draft: DraftSummary | DraftMeta) {
  return Boolean(getDraftLastCheckpointAt(draft));
}

function shouldRunAutomaticCheckpoint(referenceTimestamp?: string | null) {
  if (!referenceTimestamp) {
    return true;
  }

  return Date.now() - getTimestampValue(referenceTimestamp) >= REMOTE_CHECKPOINT_INTERVAL_MS;
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

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashSnapshot(step: number, data: Record<string, unknown>) {
  const source = stableSerialize({ step, data });
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
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
    // localStorage no disponible
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

function reconcileLocalDraftIndex() {
  const reconciled = new Map<string, LocalDraftIndexEntry>();
  const indexedEntries = readLocalDraftIndex();

  for (const entry of indexedEntries) {
    const storageKey = getStorageKey(entry.slug, entry.draftId, entry.sessionId);
    const localDraft = readLocalCopy(storageKey);
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
      reconciled.set(refreshedEntry.id, refreshedEntry);
    }
  }

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const storageKey = localStorage.key(index);
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

      const localDraft = readLocalCopy(storageKey);
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
        reconciled.set(discoveredEntry.id, discoveredEntry);
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
}

function buildHubDrafts(
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

function saveLocalCopy(
  storageKey: string | null,
  step: number,
  data: Record<string, unknown>,
  empresaSnapshot: Empresa | null,
  updatedAtOverride?: string | null
) {
  if (!storageKey) return;

  try {
    const updatedAt =
      typeof updatedAtOverride === "string" && updatedAtOverride.trim()
        ? updatedAtOverride
        : new Date().toISOString();
    const payload: LocalDraftEnvelopeV2 = {
      version: 2,
      step,
      data,
      empresaSnapshot,
      updatedAt,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
    return updatedAt;
  } catch {
    // localStorage no disponible
    return null;
  }
}

function removeLocalCopy(storageKey: string | null) {
  if (!storageKey) return;

  try {
    localStorage.removeItem(storageKey);
  } catch {
    // localStorage no disponible
  }
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

function readLocalCopy(storageKey: string | null): LocalDraft | null {
  if (!storageKey) {
    return null;
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
      return {
        step: typeof parsed.step === "number" ? parsed.step : 0,
        data: normalizeDraftData(parsed.data),
        empresa: parseEmpresaSnapshot(parsed.empresaSnapshot),
        updatedAt:
          typeof parsed.updatedAt === "string" && parsed.updatedAt.trim()
            ? parsed.updatedAt
            : null,
      };
    }

    return {
      step: typeof parsed.step === "number" ? parsed.step : 0,
      data: normalizeDraftData(parsed.data),
      empresa: null,
      updatedAt: parseLegacyUpdatedAt(parsed.ts),
    };
  } catch {
    return null;
  }
}

export function useFormDraft({
  slug,
  empresa,
  initialDraftId,
  initialLocalDraftSessionId,
  loadMatchingDrafts = true,
  loadAllDrafts = false,
}: Options) {
  const [activeDraftId, setActiveDraftId] = useState<string | null>(
    initialDraftId ?? null
  );
  const [localDraftSessionId, setLocalDraftSessionId] = useState(
    initialLocalDraftSessionId?.trim() || createSessionId()
  );
  const [activeDraft, setActiveDraft] = useState<DraftMeta | null>(null);
  const [matchingDrafts, setMatchingDrafts] = useState<DraftSummary[]>([]);
  const [allDrafts, setAllDrafts] = useState<DraftSummary[]>([]);
  const [localDraftIndex, setLocalDraftIndex] = useState<LocalDraftIndexEntry[]>(
    []
  );
  const [loadingMatchingDrafts, setLoadingMatchingDrafts] = useState(false);
  const [loadingAllDrafts, setLoadingAllDrafts] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<Date | null>(null);
  const [lastCheckpointAt, setLastCheckpointAt] = useState<Date | null>(null);
  const [remoteIdentityState, setRemoteIdentityState] =
    useState<RemoteIdentityState>(initialDraftId ? "ready" : "idle");
  const [hasPendingAutosave, setHasPendingAutosave] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKeyRef = useRef<string | null>(null);
  const savingDraftRef = useRef(false);
  const hasPendingAutosaveRef = useRef(false);
  const latestLocalDraftRef = useRef<LocalDraft | null>(null);
  const ensureDraftIdentityPromiseRef =
    useRef<Promise<EnsureDraftIdentityResult> | null>(null);
  const lastCheckpointHashRef = useRef<string | null>(null);
  const lastCheckpointAtRef = useRef<string | null>(null);
  const remoteUpdatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveDraftId(initialDraftId ?? null);
  }, [initialDraftId]);

  useEffect(() => {
    if (initialDraftId) {
      setRemoteIdentityState("ready");
    }
  }, [initialDraftId]);

  useEffect(() => {
    if (!activeDraftId && initialLocalDraftSessionId?.trim()) {
      setLocalDraftSessionId(initialLocalDraftSessionId);
    }
  }, [activeDraftId, initialLocalDraftSessionId]);

  const storageKey = useMemo(
    () => getStorageKey(slug, activeDraftId, localDraftSessionId),
    [slug, activeDraftId, localDraftSessionId]
  );

  useEffect(() => {
    storageKeyRef.current = storageKey;
  }, [storageKey]);

  useEffect(() => {
    savingDraftRef.current = savingDraft;
  }, [savingDraft]);

  useEffect(() => {
    hasPendingAutosaveRef.current = hasPendingAutosave;
  }, [hasPendingAutosave]);

  useEffect(() => {
    if (activeDraftId) {
      setRemoteIdentityState("ready");
      return;
    }

    setRemoteIdentityState((current) =>
      current === "local_only_fallback" ? current : "idle"
    );
  }, [activeDraftId]);

  const getUserId = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user.id ?? null;
  }, []);

  const refreshLocalDraftIndex = useCallback(
    ({ updateState = true }: { updateState?: boolean } = {}) => {
      const nextEntries = reconcileLocalDraftIndex();
      if (updateState) {
        setLocalDraftIndex(nextEntries);
      }
      return nextEntries;
    },
    []
  );

  const syncRemoteDraftState = useCallback(
    (
      draft: Pick<
        DraftSummary | DraftMeta,
        "updated_at" | "created_at" | "last_checkpoint_at"
      > | null,
      options?: { checkpointHash?: string | null; identityState?: RemoteIdentityState }
    ) => {
      const updatedAt = draft?.updated_at ?? draft?.created_at ?? null;
      const checkpointAt = draft?.last_checkpoint_at ?? null;

      remoteUpdatedAtRef.current = updatedAt;
      lastCheckpointHashRef.current = options?.checkpointHash ?? null;
      lastCheckpointAtRef.current = checkpointAt;
      setLastCheckpointAt(checkpointAt ? new Date(checkpointAt) : null);

      if (options?.identityState) {
        setRemoteIdentityState(options.identityState);
      } else if (updatedAt) {
        setRemoteIdentityState("ready");
      }
    },
    []
  );

  useEffect(() => {
    refreshLocalDraftIndex();
  }, [refreshLocalDraftIndex]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === LOCAL_DRAFT_INDEX_KEY ||
        (event.key?.startsWith(LOCAL_DRAFT_PREFIX) ?? false)
      ) {
        refreshLocalDraftIndex();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshLocalDraftIndex]);

  const refreshMatchingDrafts = useCallback(async () => {
    if (!loadMatchingDrafts || !slug || !empresa?.nit_empresa) {
      setMatchingDrafts([]);
      return;
    }

    setLoadingMatchingDrafts(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        setMatchingDrafts([]);
        return;
      }

      const supabase = createClient();
      const { data, error } = await runDraftSelect("summary", (fields) =>
        supabase
          .from("form_drafts")
          .select(fields)
          .eq("user_id", userId)
          .eq("form_slug", slug)
          .eq("empresa_nit", empresa.nit_empresa)
          .order("updated_at", { ascending: false })
      );

      if (error) {
        throw error;
      }

      const drafts = (((data ?? []) as unknown) as DraftRow[]).map((row) =>
        buildDraftSummary(row, parseEmpresaSnapshot(row.empresa_snapshot))
      );

      setMatchingDrafts(drafts);
    } catch {
      setMatchingDrafts([]);
    } finally {
      setLoadingMatchingDrafts(false);
    }
  }, [empresa?.nit_empresa, getUserId, loadMatchingDrafts, slug]);

  const refreshAllDrafts = useCallback(async () => {
    if (!loadAllDrafts) {
      return;
    }

    setLoadingAllDrafts(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        setAllDrafts([]);
        return;
      }

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

      const drafts = (((data ?? []) as unknown) as DraftRow[]).map((row) =>
        buildDraftSummary(row, parseEmpresaSnapshot(row.empresa_snapshot))
      );

      setAllDrafts(drafts);
    } catch {
      setAllDrafts([]);
    } finally {
      setLoadingAllDrafts(false);
    }
  }, [getUserId, loadAllDrafts]);

  useEffect(() => {
    refreshMatchingDrafts();
  }, [refreshMatchingDrafts]);

  useEffect(() => {
    refreshAllDrafts();
  }, [refreshAllDrafts]);

  const hubDrafts = useMemo(
    () => buildHubDrafts(allDrafts, localDraftIndex),
    [allDrafts, localDraftIndex]
  );
  const draftsCount = hubDrafts.length;

  const commitLocalCopy = useCallback(
    ({
      payload = latestLocalDraftRef.current,
      storage = storageKeyRef.current,
      updateState = true,
    }: {
      payload?: LocalDraft | null;
      storage?: string | null;
      updateState?: boolean;
    } = {}) => {
      if (!storage || !payload) {
        return null;
      }

      const updatedAt = saveLocalCopy(
        storage,
        payload.step,
        payload.data,
        payload.empresa
      );

      if (!updatedAt) {
        refreshLocalDraftIndex({ updateState });
        return null;
      }

      refreshLocalDraftIndex({ updateState });

      if (updateState) {
        setLocalDraftSavedAt(new Date(updatedAt));
        setHasPendingAutosave(false);
      }

      return updatedAt;
    },
    [refreshLocalDraftIndex]
  );

  const flushAutosave = useCallback(() => {
    if (!hasPendingAutosaveRef.current) {
      return false;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const updatedAt = commitLocalCopy();
    if (!updatedAt) {
      setHasPendingAutosave(false);
      return false;
    }

    return true;
  }, [commitLocalCopy]);

  const autosave = useCallback(
    (step: number, data: Record<string, unknown>) => {
      if (!storageKey) return;

      latestLocalDraftRef.current = {
        step,
        data,
        empresa: empresa ?? null,
        updatedAt: null,
      };
      setHasPendingAutosave(true);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        commitLocalCopy();
      }, 800);
    },
    [commitLocalCopy, empresa, storageKey]
  );

  const loadLocal = useCallback(() => {
    const localDraft = readLocalCopy(storageKey);
    latestLocalDraftRef.current = localDraft;
    setLocalDraftSavedAt(
      localDraft?.updatedAt ? new Date(localDraft.updatedAt) : null
    );
    setHasPendingAutosave(false);
    if (!localDraft) {
      refreshLocalDraftIndex();
    }
    return localDraft;
  }, [refreshLocalDraftIndex, storageKey]);

  const loadDraft = useCallback(
    async (draftId: string): Promise<LoadDraftResult> => {
      setLoadingDraft(true);
      try {
        const userId = await getUserId();
        if (!userId) {
          return { draft: null, empresa: null, error: "No autenticado" };
        }

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
          return { draft: null, empresa: null, error: "Borrador no encontrado" };
        }

        const row = (data as unknown) as DraftRow;
        let empresaSnapshot = parseEmpresaSnapshot(row.empresa_snapshot);

        if (!empresaSnapshot && row.empresa_nit) {
          empresaSnapshot = await getEmpresaFromNit(row.empresa_nit);
        }

        if (!empresaSnapshot) {
          return {
            draft: null,
            empresa: null,
            error: "No se pudo reconstruir la empresa de este borrador.",
          };
        }

        const draft = buildDraftMeta(row, empresaSnapshot);
        if (!hasRemoteCheckpoint(draft)) {
          return {
            draft: null,
            empresa: null,
            error:
              "Este borrador aun no tiene un checkpoint remoto completo. Reanudalo desde el dispositivo donde fue creado o guarda un borrador completo primero.",
          };
        }

        setActiveDraftId(draft.id);
        setActiveDraft(draft);
        syncRemoteDraftState(draft, {
          checkpointHash: draft.last_checkpoint_hash ?? null,
          identityState: "ready",
        });
        latestLocalDraftRef.current = {
          step: draft.step,
          data: draft.data,
          empresa: empresaSnapshot,
          updatedAt: getDraftUpdatedAt(draft),
        };
        const updatedAt = saveLocalCopy(
          getStorageKey(row.form_slug, row.id, localDraftSessionId),
          draft.step,
          draft.data,
          empresaSnapshot,
          getDraftUpdatedAt(draft)
        );
        refreshLocalDraftIndex();
        setLocalDraftSavedAt(updatedAt ? new Date(updatedAt) : null);
        setHasPendingAutosave(false);

        return {
          draft,
          empresa: empresaSnapshot,
        };
      } catch (error) {
        return {
          draft: null,
          empresa: null,
          error:
            error instanceof Error ? error.message : "No se pudo cargar el borrador.",
        };
      } finally {
        setLoadingDraft(false);
      }
    },
    [getUserId, localDraftSessionId, refreshLocalDraftIndex, syncRemoteDraftState]
  );

  const ensureDraftIdentity = useCallback(
    async (
      step: number,
      data: Record<string, unknown>
    ): Promise<EnsureDraftIdentityResult> => {
      if (!slug || !empresa?.nit_empresa) {
        return {
          ok: false,
          error: "No hay empresa seleccionada para preparar el borrador.",
        };
      }

      if (activeDraftId) {
        return { ok: true, draftId: activeDraftId };
      }

      if (ensureDraftIdentityPromiseRef.current) {
        return ensureDraftIdentityPromiseRef.current;
      }

      setRemoteIdentityState("creating");

      const promise = (async () => {
        try {
          const userId = await getUserId();
          if (!userId) {
            return { ok: false, error: "No autenticado" };
          }

          const supabase = createClient();
          let createdDraft: unknown;
          let error: unknown;

          if (draftSchemaMode === "legacy") {
            ({ data: createdDraft, error } = await supabase
              .from("form_drafts")
              .insert({
                user_id: userId,
                ...getDraftWritePayload(slug, empresa, step, {}),
              })
              .select(getDraftFields("return"))
              .single());
          } else {
            ({ data: createdDraft, error } = await supabase
              .from("form_drafts")
              .insert({
                user_id: userId,
                ...getDraftStubWritePayload(slug, empresa, step),
              })
              .select(getDraftFields("return"))
              .single());

            if (isMissingDraftSchemaError(error) && checkpointColumnsMode !== "unsupported") {
              checkpointColumnsMode = "unsupported";
              ({ data: createdDraft, error } = await supabase
                .from("form_drafts")
                .insert({
                  user_id: userId,
                  ...getDraftStubWritePayload(slug, empresa, step),
                })
                .select(getDraftFields("return", { includeCheckpointColumns: false }))
                .single());
            }

            if (isMissingDraftSchemaError(error)) {
              draftSchemaMode = "legacy";
              ({ data: createdDraft, error } = await supabase
                .from("form_drafts")
                .insert({
                  user_id: userId,
                  ...getDraftWritePayload(slug, empresa, step, {}),
                })
                .select(getDraftFields("return"))
                .single());
            } else if (!error && draftSchemaMode === "unknown") {
              draftSchemaMode = "extended";
            }
          }

          if (error) {
            throw error;
          }

          const createdRow = (createdDraft as DraftRow | null) ?? null;
          const nextDraftId = createdRow?.id ?? null;
          if (!nextDraftId) {
            return { ok: false, error: "No se pudo crear la identidad del borrador." };
          }

          const createdDraftRow = createdRow as DraftRow;

          const previousStorageKey = getStorageKey(slug, null, localDraftSessionId);
          const nextStorageKey = getStorageKey(slug, nextDraftId, localDraftSessionId);
          const existingLocalDraft =
            latestLocalDraftRef.current ??
            readLocalCopy(previousStorageKey) ?? {
              step,
              data,
              empresa,
              updatedAt: null,
            };

          latestLocalDraftRef.current = existingLocalDraft;
          const localUpdatedAt = saveLocalCopy(
            nextStorageKey,
            existingLocalDraft.step,
            existingLocalDraft.data,
            existingLocalDraft.empresa ?? empresa,
            existingLocalDraft.updatedAt
          );

          if (nextStorageKey !== previousStorageKey) {
            removeLocalCopy(previousStorageKey);
          }

          setLocalDraftSavedAt(localUpdatedAt ? new Date(localUpdatedAt) : null);
          setHasPendingAutosave(false);
          refreshLocalDraftIndex();

          const createdSummary = buildDraftSummary(
            createdDraftRow,
            parseEmpresaSnapshot(createdDraftRow.empresa_snapshot) ?? empresa
          );
          const nextDraft: DraftMeta = {
            ...createdSummary,
            data: existingLocalDraft.data,
            last_checkpoint_hash: createdDraftRow.last_checkpoint_hash ?? null,
          };

          setActiveDraftId(nextDraftId);
          setActiveDraft(nextDraft);
          syncRemoteDraftState(createdSummary, {
            checkpointHash: createdDraftRow.last_checkpoint_hash ?? null,
            identityState: "ready",
          });
          await Promise.all([refreshMatchingDrafts(), refreshAllDrafts()]);

          return { ok: true, draftId: nextDraftId };
        } catch (error) {
          setRemoteIdentityState("local_only_fallback");
          return {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "No se pudo preparar el borrador remoto.",
          };
        } finally {
          ensureDraftIdentityPromiseRef.current = null;
        }
      })();

      ensureDraftIdentityPromiseRef.current = promise;
      return promise;
    },
    [
      activeDraftId,
      empresa,
      getUserId,
      localDraftSessionId,
      refreshAllDrafts,
      refreshMatchingDrafts,
      refreshLocalDraftIndex,
      slug,
      syncRemoteDraftState,
    ]
  );

  const checkpointDraft = useCallback(
    async (
      step: number,
      data: Record<string, unknown>,
      reason: CheckpointDraftReason
    ): Promise<CheckpointDraftResult> => {
      if (!slug || !empresa?.nit_empresa) {
        return {
          ok: false,
          error: "No hay empresa seleccionada para guardar el borrador.",
        };
      }

      if (reason === "manual") {
        setSavingDraft(true);
      }

      flushAutosave();
      latestLocalDraftRef.current = {
        step,
        data,
        empresa,
        updatedAt: latestLocalDraftRef.current?.updatedAt ?? null,
      };

      try {
        const identityResult = await ensureDraftIdentity(step, data);
        if (!identityResult.ok || !identityResult.draftId) {
          return {
            ok: false,
            error:
              identityResult.error ??
              "No se pudo preparar el borrador remoto.",
          };
        }

        const checkpointHash = hashSnapshot(step, data);
        if (reason !== "manual" && lastCheckpointHashRef.current === checkpointHash) {
          return {
            ok: true,
            draftId: identityResult.draftId,
          };
        }

        const userId = await getUserId();
        if (!userId) {
          return { ok: false, error: "No autenticado" };
        }

        const checkpointAt = new Date().toISOString();
        const supabase = createClient();
        let updatedDraft: unknown;
        let error: unknown;

        if (draftSchemaMode === "legacy") {
          ({ data: updatedDraft, error } = await supabase
            .from("form_drafts")
            .update(getDraftWritePayload(slug, empresa, step, data))
            .eq("id", identityResult.draftId)
            .eq("user_id", userId)
            .select(getDraftFields("return"))
            .single());
        } else {
          ({ data: updatedDraft, error } = await supabase
            .from("form_drafts")
            .update(
              getDraftCheckpointWritePayload(
                slug,
                empresa,
                step,
                data,
                checkpointAt,
                checkpointHash
              )
            )
            .eq("id", identityResult.draftId)
            .eq("user_id", userId)
            .select(getDraftFields("return"))
            .single());

          if (isMissingDraftSchemaError(error) && checkpointColumnsMode !== "unsupported") {
            checkpointColumnsMode = "unsupported";
            ({ data: updatedDraft, error } = await supabase
              .from("form_drafts")
              .update(
                getDraftCheckpointWritePayload(
                  slug,
                  empresa,
                  step,
                  data,
                  checkpointAt,
                  checkpointHash
                )
              )
              .eq("id", identityResult.draftId)
              .eq("user_id", userId)
              .select(getDraftFields("return", { includeCheckpointColumns: false }))
              .single());
          }

          if (isMissingDraftSchemaError(error)) {
            draftSchemaMode = "legacy";
            ({ data: updatedDraft, error } = await supabase
              .from("form_drafts")
              .update(getDraftWritePayload(slug, empresa, step, data))
              .eq("id", identityResult.draftId)
              .eq("user_id", userId)
              .select(getDraftFields("return"))
              .single());
          } else if (!error && draftSchemaMode === "unknown") {
            draftSchemaMode = "extended";
          }
        }

        if (error) {
          throw error;
        }

        const savedDraftRow = (updatedDraft as DraftRow | null) ?? null;
        const remoteUpdatedAt =
          savedDraftRow?.updated_at ??
          savedDraftRow?.created_at ??
          checkpointAt;
        const nextStorageKey = getStorageKey(
          slug,
          identityResult.draftId,
          localDraftSessionId
        );
        const updatedAt = saveLocalCopy(
          nextStorageKey,
          step,
          data,
          empresa,
          remoteUpdatedAt
        );

        latestLocalDraftRef.current = {
          step,
          data,
          empresa,
          updatedAt: remoteUpdatedAt,
        };
        setLocalDraftSavedAt(updatedAt ? new Date(updatedAt) : null);
        setHasPendingAutosave(false);
        refreshLocalDraftIndex();

        const nextDraft: DraftMeta = {
          ...(savedDraftRow
            ? buildDraftSummary(
                savedDraftRow,
                parseEmpresaSnapshot(savedDraftRow.empresa_snapshot) ?? empresa
              )
            : {
                id: identityResult.draftId,
                form_slug: slug,
                step,
                empresa_nit: empresa.nit_empresa,
                empresa_nombre: empresa.nombre_empresa,
                empresa_snapshot: empresa,
                updated_at: remoteUpdatedAt,
                created_at: remoteUpdatedAt,
                last_checkpoint_at: checkpointAt,
              }),
          data,
          last_checkpoint_hash:
            savedDraftRow?.last_checkpoint_hash ?? checkpointHash,
        };

        setActiveDraft(nextDraft);
        syncRemoteDraftState(nextDraft, {
          checkpointHash: nextDraft.last_checkpoint_hash ?? checkpointHash,
          identityState: "ready",
        });
        if (reason === "manual") {
          setDraftSavedAt(new Date(remoteUpdatedAt));
        }
        await Promise.all([refreshMatchingDrafts(), refreshAllDrafts()]);

        return {
          ok: true,
          draftId: identityResult.draftId,
        };
      } catch (error) {
        if (!activeDraftId) {
          setRemoteIdentityState("local_only_fallback");
        }

        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "No se pudo guardar el borrador.",
        };
      } finally {
        if (reason === "manual") {
          setSavingDraft(false);
        }
      }
    },
    [
      activeDraftId,
      empresa,
      ensureDraftIdentity,
      flushAutosave,
      getUserId,
      localDraftSessionId,
      refreshAllDrafts,
      refreshMatchingDrafts,
      refreshLocalDraftIndex,
      slug,
      syncRemoteDraftState,
    ]
  );

  const saveDraft = useCallback(
    (step: number, data: Record<string, unknown>) =>
      checkpointDraft(step, data, "manual"),
    [checkpointDraft]
  );

  const removeLocalDraftArtifacts = useCallback(
    ({
      targetSlug = slug ?? null,
      targetDraftId = null,
      targetSessionId = localDraftSessionId,
      updateState = true,
    }: {
      targetSlug?: string | null;
      targetDraftId?: string | null;
      targetSessionId?: string;
      updateState?: boolean;
    } = {}) => {
      removeLocalCopy(
        getStorageKey(targetSlug, targetDraftId, targetSessionId)
      );
      refreshLocalDraftIndex({ updateState });
    },
    [localDraftSessionId, refreshLocalDraftIndex, slug]
  );

  const deleteDraft = useCallback(
    async (
      draftId: string,
      options?: { slug?: string | null; sessionId?: string | null }
    ) => {
      try {
        const userId = await getUserId();
        if (!userId) return;

        const supabase = createClient();
        await supabase
          .from("form_drafts")
          .delete()
          .eq("id", draftId)
          .eq("user_id", userId);

        removeLocalDraftArtifacts({
          targetSlug: options?.slug ?? slug ?? null,
          targetDraftId: draftId,
          targetSessionId: options?.sessionId ?? localDraftSessionId,
        });

        if (draftId === activeDraftId) {
          latestLocalDraftRef.current = null;
          lastCheckpointHashRef.current = null;
          lastCheckpointAtRef.current = null;
          remoteUpdatedAtRef.current = null;
          setActiveDraftId(null);
          setActiveDraft(null);
          setDraftSavedAt(null);
          setLocalDraftSavedAt(null);
          setLastCheckpointAt(null);
          setRemoteIdentityState("idle");
          setHasPendingAutosave(false);
        }

        await Promise.all([refreshMatchingDrafts(), refreshAllDrafts()]);
      } catch {
        // el borrado es best effort
      }
    },
    [
      activeDraftId,
      getUserId,
      localDraftSessionId,
      refreshAllDrafts,
      refreshMatchingDrafts,
      removeLocalDraftArtifacts,
      slug,
    ]
  );

  const clearDraft = useCallback(
    async (
      draftId = activeDraftId,
      options?: { slug?: string | null; sessionId?: string | null }
    ) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      latestLocalDraftRef.current = null;
      lastCheckpointHashRef.current = null;
      lastCheckpointAtRef.current = null;
      remoteUpdatedAtRef.current = null;
      setHasPendingAutosave(false);
      setLocalDraftSavedAt(null);
      setDraftSavedAt(null);
      setLastCheckpointAt(null);
      setRemoteIdentityState("idle");

      removeLocalDraftArtifacts({
        targetSlug: options?.slug ?? slug ?? null,
        targetDraftId: draftId ?? null,
        targetSessionId: options?.sessionId ?? localDraftSessionId,
      });

      if (!draftId) {
        return;
      }

      await deleteDraft(draftId, options);
    },
    [
      activeDraftId,
      deleteDraft,
      localDraftSessionId,
      removeLocalDraftArtifacts,
      slug,
    ]
  );

  const deleteHubDraft = useCallback(
    async (draft: HubDraft) => {
      if (draft.draftId) {
        await deleteDraft(draft.draftId, {
          slug: draft.form_slug,
          sessionId: draft.sessionId,
        });
        return;
      }

      if (!draft.sessionId) {
        return;
      }

      removeLocalDraftArtifacts({
        targetSlug: draft.form_slug,
        targetSessionId: draft.sessionId,
      });
    },
    [deleteDraft, removeLocalDraftArtifacts]
  );

  const startNewDraftSession = useCallback((sessionId = createSessionId()) => {
    flushAutosave();
    latestLocalDraftRef.current = null;
    lastCheckpointHashRef.current = null;
    lastCheckpointAtRef.current = null;
    remoteUpdatedAtRef.current = null;
    setActiveDraftId(null);
    setActiveDraft(null);
    setLocalDraftSessionId(sessionId);
    setDraftSavedAt(null);
    setLocalDraftSavedAt(null);
    setLastCheckpointAt(null);
    setRemoteIdentityState("idle");
    setHasPendingAutosave(false);
    return sessionId;
  }, [flushAutosave]);

  const maybeAutomaticCheckpoint = useCallback(
    (reason: Exclude<CheckpointDraftReason, "manual">) => {
      if (!slug || !empresa?.nit_empresa) {
        return;
      }

      const payload =
        latestLocalDraftRef.current ?? readLocalCopy(storageKeyRef.current);
      if (!payload) {
        return;
      }

      const nextHash = hashSnapshot(payload.step, payload.data);
      if (lastCheckpointHashRef.current === nextHash) {
        return;
      }

      const checkpointReference =
        lastCheckpointAtRef.current ?? remoteUpdatedAtRef.current;
      if (!shouldRunAutomaticCheckpoint(checkpointReference)) {
        return;
      }

      void checkpointDraft(payload.step, payload.data, reason);
    },
    [checkpointDraft, empresa, slug]
  );

  useEffect(() => {
    if (!slug || !empresa?.nit_empresa) {
      return;
    }

    const intervalId = window.setInterval(() => {
      maybeAutomaticCheckpoint("interval");
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [empresa?.nit_empresa, maybeAutomaticCheckpoint, slug]);

  useEffect(() => {
    const handlePageHide = () => {
      flushAutosave();
      maybeAutomaticCheckpoint("pagehide");
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushAutosave();
        maybeAutomaticCheckpoint("visibilitychange");
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingAutosaveRef.current && !savingDraftRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      if (hasPendingAutosaveRef.current) {
        commitLocalCopy({ updateState: false });
      }
    };
  }, [commitLocalCopy, flushAutosave, maybeAutomaticCheckpoint]);

  return {
    activeDraftId,
    activeDraft,
    localDraftSessionId,
    matchingDrafts,
    allDrafts,
    hubDrafts,
    draftsCount,
    loadingDraft,
    loadingMatchingDrafts,
    loadingAllDrafts,
    savingDraft,
    draftSavedAt,
    localDraftSavedAt,
    lastCheckpointAt,
    remoteIdentityState,
    hasPendingAutosave,
    autosave,
    loadLocal,
    flushAutosave,
    loadDraft,
    ensureDraftIdentity,
    checkpointDraft,
    saveDraft,
    clearDraft,
    deleteDraft,
    deleteHubDraft,
    refreshMatchingDrafts,
    refreshAllDrafts,
    refreshLocalDraftIndex,
    startNewDraftSession,
  };
}
