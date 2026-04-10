"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EMPRESA_SELECT_FIELDS, parseEmpresaSnapshot } from "@/lib/empresa";
import type { Empresa } from "@/lib/store/empresaStore";

export type DraftMeta = {
  id: string;
  form_slug: string;
  step: number;
  data: Record<string, unknown>;
  empresa_nit: string;
  empresa_nombre?: string;
  empresa_snapshot: Empresa | null;
  updated_at?: string;
  created_at?: string;
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
};

type DraftSchemaMode = "unknown" | "legacy" | "extended";

const LOCAL_DRAFT_INDEX_KEY = "draft_index__v1";
const LOCAL_DRAFT_PREFIX = "draft__";

const EXTENDED_DRAFT_FIELDS = [
  "id",
  "form_slug",
  "empresa_nit",
  "empresa_nombre",
  "empresa_snapshot",
  "step",
  "data",
  "updated_at",
  "created_at",
].join(", ");

const LEGACY_DRAFT_FIELDS = [
  "id",
  "form_slug",
  "empresa_nit",
  "empresa_nombre",
  "step",
  "data",
  "updated_at",
].join(", ");

let draftSchemaMode: DraftSchemaMode = "unknown";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeDraftData(value: unknown) {
  return isRecord(value) ? value : {};
}

function isMissingDraftSchemaError(error: unknown) {
  return isRecord(error) && error.code === "42703";
}

function getDraftFields() {
  return draftSchemaMode === "legacy"
    ? LEGACY_DRAFT_FIELDS
    : EXTENDED_DRAFT_FIELDS;
}

async function runDraftSelect(
  queryFactory: (fields: string) => PromiseLike<DraftSelectResult>
): Promise<DraftSelectResult> {
  const fields = getDraftFields();
  let result = await queryFactory(fields);

  if (
    draftSchemaMode !== "legacy" &&
    isRecord(result) &&
    isMissingDraftSchemaError(result.error)
  ) {
    draftSchemaMode = "legacy";
    result = await queryFactory(LEGACY_DRAFT_FIELDS);
  } else if (
    draftSchemaMode === "unknown" &&
    isRecord(result) &&
    !result.error &&
    fields === EXTENDED_DRAFT_FIELDS
  ) {
    draftSchemaMode = "extended";
  }

  return result;
}

function createSessionId() {
  return crypto.randomUUID();
}

function buildDraftMeta(row: DraftRow, empresaSnapshot: Empresa | null): DraftMeta {
  return {
    id: row.id,
    form_slug: row.form_slug,
    step: row.step ?? 0,
    data: row.data ?? {},
    empresa_nit: row.empresa_nit,
    empresa_nombre: row.empresa_nombre ?? undefined,
    empresa_snapshot: empresaSnapshot,
    updated_at: row.updated_at ?? undefined,
    created_at: row.created_at ?? undefined,
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

function getDraftUpdatedAt(draft: DraftMeta) {
  return draft.updated_at ?? draft.created_at ?? null;
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
  remoteDrafts: DraftMeta[],
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

    if (!remoteDraft) {
      drafts.push({
        id: localEntry.id,
        form_slug: localEntry.slug,
        empresa_nit: localEntry.empresaNit,
        empresa_nombre: localEntry.empresaNombre,
        empresa_snapshot: localEntry.empresaSnapshot,
        step: localEntry.step,
        draftId: localEntry.draftId,
        sessionId: localEntry.sessionId,
        localUpdatedAt: localEntry.updatedAt,
        remoteUpdatedAt: null,
        effectiveUpdatedAt: localEntry.updatedAt,
        syncStatus: "local_only",
      });
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
  const [matchingDrafts, setMatchingDrafts] = useState<DraftMeta[]>([]);
  const [allDrafts, setAllDrafts] = useState<DraftMeta[]>([]);
  const [localDraftIndex, setLocalDraftIndex] = useState<LocalDraftIndexEntry[]>(
    []
  );
  const [loadingMatchingDrafts, setLoadingMatchingDrafts] = useState(false);
  const [loadingAllDrafts, setLoadingAllDrafts] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<Date | null>(null);
  const [hasPendingAutosave, setHasPendingAutosave] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKeyRef = useRef<string | null>(null);
  const savingDraftRef = useRef(false);
  const hasPendingAutosaveRef = useRef(false);
  const latestLocalDraftRef = useRef<LocalDraft | null>(null);

  useEffect(() => {
    setActiveDraftId(initialDraftId ?? null);
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
      const { data, error } = await runDraftSelect((fields) =>
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
        buildDraftMeta(row, parseEmpresaSnapshot(row.empresa_snapshot))
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
      const { data, error } = await runDraftSelect((fields) =>
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
        buildDraftMeta(row, parseEmpresaSnapshot(row.empresa_snapshot))
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
        const { data, error } = await runDraftSelect((fields) =>
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
        setActiveDraftId(draft.id);
        setActiveDraft(draft);
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
    [getUserId, localDraftSessionId, refreshLocalDraftIndex]
  );

  const saveDraft = useCallback(
    async (step: number, data: Record<string, unknown>): Promise<SaveDraftResult> => {
      if (!slug || !empresa?.nit_empresa) {
        return {
          ok: false,
          error: "No hay empresa seleccionada para guardar el borrador.",
        };
      }

      setSavingDraft(true);
      flushAutosave();

      const previousStorageKey = getStorageKey(slug, activeDraftId, localDraftSessionId);

      try {
        const userId = await getUserId();
        if (!userId) {
          return { ok: false, error: "No autenticado" };
        }

        const supabase = createClient();
        const payload = getDraftWritePayload(slug, empresa, step, data);

        let nextDraftId = activeDraftId;
        let savedDraftRow: DraftRow | null = null;

        if (activeDraftId) {
          let { data: updatedDraft, error } = await supabase
            .from("form_drafts")
            .update(payload)
            .eq("id", activeDraftId)
            .eq("user_id", userId)
            .select(getDraftFields())
            .single();

          if (isMissingDraftSchemaError(error)) {
            draftSchemaMode = "legacy";
            ({ data: updatedDraft, error } = await supabase
              .from("form_drafts")
              .update(getDraftWritePayload(slug, empresa, step, data))
              .eq("id", activeDraftId)
              .eq("user_id", userId)
              .select(LEGACY_DRAFT_FIELDS)
              .single());
          } else if (!error && draftSchemaMode === "unknown") {
            draftSchemaMode = "extended";
          }

          if (error) {
            throw error;
          }

          savedDraftRow = (updatedDraft as DraftRow | null) ?? null;
        } else {
          let createdDraft: unknown;
          let error: unknown;

          if (draftSchemaMode === "legacy") {
            ({ data: createdDraft, error } = await supabase
              .from("form_drafts")
              .upsert(
                {
                  user_id: userId,
                  ...getDraftWritePayload(slug, empresa, step, data),
                },
                { onConflict: "user_id,form_slug,empresa_nit" }
              )
              .select(LEGACY_DRAFT_FIELDS)
              .single());
          } else {
            ({ data: createdDraft, error } = await supabase
              .from("form_drafts")
              .insert({
                user_id: userId,
                ...payload,
              })
              .select(getDraftFields())
              .single());

            if (isMissingDraftSchemaError(error)) {
              draftSchemaMode = "legacy";
              ({ data: createdDraft, error } = await supabase
                .from("form_drafts")
                .upsert(
                  {
                    user_id: userId,
                    ...getDraftWritePayload(slug, empresa, step, data),
                  },
                  { onConflict: "user_id,form_slug,empresa_nit" }
                )
                .select(LEGACY_DRAFT_FIELDS)
                .single());
            } else if (!error && draftSchemaMode === "unknown") {
              draftSchemaMode = "extended";
            }
          }

          if (error) {
            throw error;
          }

          savedDraftRow = ((createdDraft as unknown) as DraftRow) ?? null;
          nextDraftId = savedDraftRow?.id ?? null;
          setActiveDraftId(nextDraftId);
        }

        const remoteUpdatedAt =
          savedDraftRow?.updated_at ??
          savedDraftRow?.created_at ??
          new Date().toISOString();
        const nextStorageKey = getStorageKey(slug, nextDraftId ?? null, localDraftSessionId);
        latestLocalDraftRef.current = {
          step,
          data,
          empresa,
          updatedAt: remoteUpdatedAt,
        };
        const updatedAt = saveLocalCopy(
          nextStorageKey,
          step,
          data,
          empresa,
          remoteUpdatedAt
        );
        setLocalDraftSavedAt(updatedAt ? new Date(updatedAt) : null);
        setHasPendingAutosave(false);

        if (nextStorageKey !== previousStorageKey) {
          removeLocalCopy(previousStorageKey);
        }

        refreshLocalDraftIndex();

        const nextMeta: DraftMeta = savedDraftRow
          ? buildDraftMeta(
              savedDraftRow,
              parseEmpresaSnapshot(savedDraftRow.empresa_snapshot) ?? empresa
            )
          : {
              id: nextDraftId!,
              form_slug: slug,
              step,
              data,
              empresa_nit: empresa.nit_empresa,
              empresa_nombre: empresa.nombre_empresa,
              empresa_snapshot: empresa,
              updated_at: remoteUpdatedAt,
            };

        setActiveDraft(nextMeta);
        setDraftSavedAt(new Date(remoteUpdatedAt));
        await Promise.all([refreshMatchingDrafts(), refreshAllDrafts()]);

        return {
          ok: true,
          draftId: nextDraftId ?? undefined,
        };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "No se pudo guardar el borrador.",
        };
      } finally {
        setSavingDraft(false);
      }
    },
    [
      activeDraftId,
      empresa,
      flushAutosave,
      getUserId,
      localDraftSessionId,
      refreshAllDrafts,
      refreshMatchingDrafts,
      refreshLocalDraftIndex,
      slug,
    ]
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
          setActiveDraftId(null);
          setActiveDraft(null);
          setDraftSavedAt(null);
          setLocalDraftSavedAt(null);
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
      setHasPendingAutosave(false);
      setLocalDraftSavedAt(null);
      setDraftSavedAt(null);

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
    setActiveDraftId(null);
    setActiveDraft(null);
    setLocalDraftSessionId(sessionId);
    setDraftSavedAt(null);
    setLocalDraftSavedAt(null);
    setHasPendingAutosave(false);
    return sessionId;
  }, [flushAutosave]);

  useEffect(() => {
    const handlePageHide = () => {
      flushAutosave();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushAutosave();
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
  }, [commitLocalCopy, flushAutosave]);

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
    hasPendingAutosave,
    autosave,
    loadLocal,
    flushAutosave,
    loadDraft,
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
