"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { emitDraftsChanged } from "@/lib/draftEvents";
import {
  deletePendingCheckpoint,
  moveDraftPayload,
  movePendingCheckpoint,
  readPendingCheckpoint,
  writePendingCheckpoint,
} from "@/lib/draftStorage";
import {
  buildDraftMeta as buildDraftMetaShared,
  buildDraftSummary as buildDraftSummaryShared,
  getCheckpointColumnsMode as getCheckpointColumnsModeShared,
  getCurrentUserId,
  getDraftCheckpointWritePayload as getDraftCheckpointWritePayloadShared,
  getDraftFields as getDraftFieldsShared,
  getDraftSchemaMode as getDraftSchemaModeShared,
  getDraftStubWritePayload as getDraftStubWritePayloadShared,
  getDraftUpdatedAt as getDraftUpdatedAtShared,
  getDraftWritePayload as getDraftWritePayloadShared,
  getEmpresaFromNit as getEmpresaFromNitShared,
  getErrorMessage as getErrorMessageShared,
  getStorageKey as getStorageKeyShared,
  hasRemoteCheckpoint as hasRemoteCheckpointShared,
  isMissingDraftSchemaError as isMissingDraftSchemaErrorShared,
  markCheckpointColumnsUnsupported as markCheckpointColumnsUnsupportedShared,
  markDraftSchemaExtended as markDraftSchemaExtendedShared,
  markDraftSchemaLegacy as markDraftSchemaLegacyShared,
  readLocalCopy as readLocalCopyShared,
  reconcileLocalDraftIndex as reconcileLocalDraftIndexShared,
  removeLocalCopy as removeLocalCopyShared,
  runDraftSelect as runDraftSelectShared,
  saveLocalCopy as saveLocalCopyShared,
} from "@/lib/drafts";
import {
  DRAFT_LOCK_CHANNEL_NAME,
  DRAFT_LOCK_HEARTBEAT_MS,
  DRAFT_LOCK_RECONCILE_MS,
  type DraftLock,
  getDraftLockKey,
  isDraftLockExpired,
  readDraftLock,
  removeDraftLock,
  writeDraftLock,
} from "@/lib/draftLocks";
import { parseEmpresaSnapshot } from "@/lib/empresa";
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

type Options = {
  slug?: string | null;
  empresa?: Empresa | null;
  initialDraftId?: string | null;
  initialLocalDraftSessionId?: string | null;
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

export type RemoteSyncState =
  | "synced"
  | "syncing"
  | "pending_remote_sync"
  | "local_only_fallback";

export type EditingAuthorityState = "checking" | "editor" | "read_only";

export type DraftLockConflict = {
  draftId: string;
  ownerTabId: string;
  ownerSeenAt: string;
  canTakeOver: boolean;
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

type PendingCheckpointEntry = {
  slug: string;
  draftId: string | null;
  sessionId: string | null;
  step: number;
  data: Record<string, unknown>;
  empresaSnapshot: Empresa | null;
  updatedAt: string;
  checkpointHash: string;
  reason: CheckpointDraftReason | "retry";
  lastError?: string | null;
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

const LOCAL_DRAFT_INDEX_KEY = "draft_index__v1";
const LOCAL_DRAFT_PREFIX = "draft__";
const REMOTE_CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function createSessionId() {
  return crypto.randomUUID();
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

export function useFormDraft({
  slug,
  empresa,
  initialDraftId,
  initialLocalDraftSessionId,
}: Options) {
  const [activeDraftId, setActiveDraftId] = useState<string | null>(
    initialDraftId ?? null
  );
  const [localDraftSessionId, setLocalDraftSessionId] = useState(
    initialLocalDraftSessionId?.trim() || createSessionId()
  );
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<Date | null>(null);
  const [remoteIdentityState, setRemoteIdentityState] =
    useState<RemoteIdentityState>(initialDraftId ? "ready" : "idle");
  const [remoteSyncState, setRemoteSyncState] = useState<RemoteSyncState>("synced");
  const [editingAuthorityState, setEditingAuthorityState] =
    useState<EditingAuthorityState>(initialDraftId ? "checking" : "editor");
  const [lockConflict, setLockConflict] = useState<DraftLockConflict | null>(null);
  const [hasPendingAutosave, setHasPendingAutosave] = useState(false);
  const [hasPendingRemoteSync, setHasPendingRemoteSync] = useState(false);
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
  const tabIdRef = useRef(createSessionId());
  const lockLeaseIdRef = useRef<string | null>(null);
  const lockChannelRef = useRef<BroadcastChannel | null>(null);
  const lockHeartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockReconcileIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDraftEditable = !activeDraftId || editingAuthorityState === "editor";

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
    () => getStorageKeyShared(slug, activeDraftId, localDraftSessionId),
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

  const getUserId = useCallback(() => getCurrentUserId(), []);

  const refreshLocalDraftIndex = useCallback(
    () => reconcileLocalDraftIndexShared(),
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
      setHasPendingRemoteSync(false);
      setRemoteSyncState(
        options?.identityState === "local_only_fallback"
          ? "local_only_fallback"
          : "synced"
      );

      if (options?.identityState) {
        setRemoteIdentityState(options.identityState);
      } else if (updatedAt) {
        setRemoteIdentityState("ready");
      }
    },
    []
  );

  const markPendingRemoteSync = useCallback(
    async (
      entry: PendingCheckpointEntry,
      errorMessage?: string | null
    ) => {
      const storage = getStorageKeyShared(entry.slug, entry.draftId, entry.sessionId ?? "");
      if (!storage) {
        return;
      }

      await writePendingCheckpoint(storage, {
        slug: entry.slug,
        draftId: entry.draftId,
        sessionId: entry.sessionId,
        step: entry.step,
        data: entry.data,
        empresaSnapshot: entry.empresaSnapshot,
        updatedAt: entry.updatedAt,
        checkpointHash: entry.checkpointHash,
        reason: entry.reason,
        lastError: errorMessage ?? null,
      });

      setHasPendingRemoteSync(true);
      setRemoteSyncState("pending_remote_sync");
    },
    []
  );

  const clearPendingRemoteSync = useCallback(async (storageKey: string | null) => {
    await deletePendingCheckpoint(storageKey);
    setHasPendingRemoteSync(false);
    setRemoteSyncState("synced");
  }, []);

  const broadcastDraftLockEvent = useCallback(
    (draftId: string, type: "changed" | "released") => {
      lockChannelRef.current?.postMessage({
        type,
        draftId,
      });
    },
    []
  );

  const stopDraftLockIntervals = useCallback(() => {
    if (lockHeartbeatIntervalRef.current) {
      clearInterval(lockHeartbeatIntervalRef.current);
      lockHeartbeatIntervalRef.current = null;
    }

    if (lockReconcileIntervalRef.current) {
      clearInterval(lockReconcileIntervalRef.current);
      lockReconcileIntervalRef.current = null;
    }
  }, []);

  const releaseDraftLock = useCallback(
    (draftId = activeDraftId) => {
      if (!draftId) {
        return;
      }

      const currentLock = readDraftLock(draftId);
      if (
        currentLock &&
        currentLock.ownerTabId === tabIdRef.current &&
        currentLock.leaseId === lockLeaseIdRef.current
      ) {
        removeDraftLock(draftId);
        broadcastDraftLockEvent(draftId, "released");
      }

      lockLeaseIdRef.current = null;
      stopDraftLockIntervals();
    },
    [activeDraftId, broadcastDraftLockEvent, stopDraftLockIntervals]
  );

  const flushAndFreezeDraft = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const payload = latestLocalDraftRef.current;
    const storage = storageKeyRef.current;

    if (payload && storage) {
      const updatedAt = await saveLocalCopyShared(
        storage,
        payload.step,
        payload.data,
        payload.empresa,
        payload.updatedAt
      );

      void refreshLocalDraftIndex();
      if (updatedAt) {
        latestLocalDraftRef.current = {
          ...payload,
          updatedAt,
        };
        setLocalDraftSavedAt(new Date(updatedAt));
      }
    }

    setHasPendingAutosave(false);
  }, [refreshLocalDraftIndex]);

  const getDraftLockConflict = useCallback((draftId: string) => {
    const currentLock = readDraftLock(draftId);

    return currentLock
      ? {
          draftId,
          ownerTabId: currentLock.ownerTabId,
          ownerSeenAt: currentLock.heartbeatAt,
          canTakeOver: true,
        }
      : {
          draftId,
          ownerTabId: "",
          ownerSeenAt: new Date().toISOString(),
          canTakeOver: true,
        };
  }, []);

  const claimEditorAuthority = useCallback(
    (draftId: string, lock: DraftLock) => {
      lockLeaseIdRef.current = lock.leaseId;
      setEditingAuthorityState("editor");
      setLockConflict(null);

      if (!lockHeartbeatIntervalRef.current) {
        lockHeartbeatIntervalRef.current = setInterval(() => {
          const currentLeaseId = lockLeaseIdRef.current;
          if (!currentLeaseId) {
            return;
          }

          const currentLock = readDraftLock(draftId);
          if (
            !currentLock ||
            currentLock.ownerTabId !== tabIdRef.current ||
            currentLock.leaseId !== currentLeaseId
          ) {
            void flushAndFreezeDraft();
            lockLeaseIdRef.current = null;
            setEditingAuthorityState("read_only");
            setLockConflict(getDraftLockConflict(draftId));
            if (lockHeartbeatIntervalRef.current) {
              clearInterval(lockHeartbeatIntervalRef.current);
              lockHeartbeatIntervalRef.current = null;
            }
            return;
          }

          const nextHeartbeatAt = new Date().toISOString();
          writeDraftLock({
            ...currentLock,
            heartbeatAt: nextHeartbeatAt,
          });
          broadcastDraftLockEvent(draftId, "changed");
        }, DRAFT_LOCK_HEARTBEAT_MS);
      }
    },
    [broadcastDraftLockEvent, flushAndFreezeDraft, getDraftLockConflict]
  );

  const reconcileDraftAuthority = useCallback(
    (draftId: string, options?: { forceTakeOver?: boolean }) => {
      const currentLock = readDraftLock(draftId);
      const currentLeaseId = lockLeaseIdRef.current;
      const lockExpired = isDraftLockExpired(currentLock);
      const shouldTryAcquire =
        options?.forceTakeOver ||
        !currentLock ||
        lockExpired ||
        (currentLock.ownerTabId === tabIdRef.current &&
          currentLock.leaseId === currentLeaseId);

      if (shouldTryAcquire) {
        const now = new Date().toISOString();
        const nextLeaseId =
          options?.forceTakeOver || !currentLeaseId
            ? createSessionId()
            : currentLeaseId;
        const nextLock: DraftLock = {
          draftId,
          ownerTabId: tabIdRef.current,
          leaseId: nextLeaseId,
          acquiredAt:
            currentLock &&
            currentLock.ownerTabId === tabIdRef.current &&
            currentLock.leaseId === currentLeaseId &&
            !options?.forceTakeOver
              ? currentLock.acquiredAt
              : now,
          heartbeatAt: now,
          formSlug: slug ?? "",
        };

        writeDraftLock(nextLock);
        broadcastDraftLockEvent(draftId, "changed");

        const confirmedLock = readDraftLock(draftId);
        if (
          confirmedLock &&
          confirmedLock.ownerTabId === tabIdRef.current &&
          confirmedLock.leaseId === nextLeaseId
        ) {
          claimEditorAuthority(draftId, confirmedLock);
          return true;
        }
      }

      const resolvedLock = readDraftLock(draftId);
      if (
        resolvedLock &&
        resolvedLock.ownerTabId === tabIdRef.current &&
        resolvedLock.leaseId === lockLeaseIdRef.current
      ) {
        claimEditorAuthority(draftId, resolvedLock);
        return true;
      }

      void flushAndFreezeDraft();
      lockLeaseIdRef.current = null;
      setEditingAuthorityState("read_only");
      setLockConflict(getDraftLockConflict(draftId));
      return false;
    },
    [
      broadcastDraftLockEvent,
      claimEditorAuthority,
      flushAndFreezeDraft,
      getDraftLockConflict,
      slug,
    ]
  );

  const takeOverDraft = useCallback(() => {
    if (!activeDraftId) {
      return false;
    }

    return reconcileDraftAuthority(activeDraftId, { forceTakeOver: true });
  }, [activeDraftId, reconcileDraftAuthority]);

  const confirmDraftLease = useCallback(
    (draftId: string) => {
      const hasAuthority = reconcileDraftAuthority(draftId);
      if (!hasAuthority) {
        return null;
      }

      const currentLeaseId = lockLeaseIdRef.current;
      const currentLock = readDraftLock(draftId);

      if (
        !currentLeaseId ||
        !currentLock ||
        currentLock.ownerTabId !== tabIdRef.current ||
        currentLock.leaseId !== currentLeaseId
      ) {
        void flushAndFreezeDraft();
        lockLeaseIdRef.current = null;
        setEditingAuthorityState("read_only");
        setLockConflict(getDraftLockConflict(draftId));
        return null;
      }

      return currentLeaseId;
    },
    [flushAndFreezeDraft, getDraftLockConflict, reconcileDraftAuthority]
  );

  useEffect(() => {
    void refreshLocalDraftIndex();
  }, [refreshLocalDraftIndex]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === LOCAL_DRAFT_INDEX_KEY ||
        (event.key?.startsWith(LOCAL_DRAFT_PREFIX) ?? false)
      ) {
        void refreshLocalDraftIndex();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshLocalDraftIndex]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(DRAFT_LOCK_CHANNEL_NAME);
    lockChannelRef.current = channel;

    return () => {
      lockChannelRef.current = null;
      channel.close();
    };
  }, []);

  useEffect(() => {
    if (!activeDraftId) {
      stopDraftLockIntervals();
      lockLeaseIdRef.current = null;
      setLockConflict(null);
      setEditingAuthorityState("editor");
      return;
    }

    setEditingAuthorityState("checking");
    reconcileDraftAuthority(activeDraftId);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== getDraftLockKey(activeDraftId)) {
        return;
      }

      reconcileDraftAuthority(activeDraftId);
    };

    const handleBroadcastMessage = (event: MessageEvent) => {
      if (!isRecord(event.data) || event.data.draftId !== activeDraftId) {
        return;
      }

      reconcileDraftAuthority(activeDraftId);
    };

    window.addEventListener("storage", handleStorage);
    lockChannelRef.current?.addEventListener("message", handleBroadcastMessage);
    lockReconcileIntervalRef.current = setInterval(() => {
      reconcileDraftAuthority(activeDraftId);
    }, DRAFT_LOCK_RECONCILE_MS);

    return () => {
      window.removeEventListener("storage", handleStorage);
      lockChannelRef.current?.removeEventListener("message", handleBroadcastMessage);
      releaseDraftLock(activeDraftId);
    };
  }, [activeDraftId, reconcileDraftAuthority, releaseDraftLock, stopDraftLockIntervals]);

  const commitLocalCopy = useCallback(
    async ({
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

      const updatedAt = await saveLocalCopyShared(
        storage,
        payload.step,
        payload.data,
        payload.empresa,
        payload.updatedAt
      );

      if (!updatedAt) {
        void refreshLocalDraftIndex();
        return null;
      }

      void refreshLocalDraftIndex();
      latestLocalDraftRef.current = {
        ...payload,
        updatedAt,
      };

      if (updateState) {
        setLocalDraftSavedAt(new Date(updatedAt));
        setHasPendingAutosave(false);
      }

      return updatedAt;
    },
    [refreshLocalDraftIndex]
  );

  const flushAutosave = useCallback(async () => {
    if (!hasPendingAutosaveRef.current) {
      return false;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const updatedAt = await commitLocalCopy();
    if (!updatedAt) {
      setHasPendingAutosave(false);
      return false;
    }

    return true;
  }, [commitLocalCopy]);

  const autosave = useCallback(
    (step: number, data: Record<string, unknown>) => {
      if (activeDraftId && editingAuthorityState === "read_only") {
        return;
      }

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
        void commitLocalCopy();
      }, 800);
    },
    [activeDraftId, commitLocalCopy, editingAuthorityState, empresa, storageKey]
  );

  const loadLocal = useCallback(async () => {
    const localDraft = await readLocalCopyShared(storageKey);
    latestLocalDraftRef.current = localDraft;
    setLocalDraftSavedAt(
      localDraft?.updatedAt ? new Date(localDraft.updatedAt) : null
    );
    setHasPendingAutosave(false);
    if (!localDraft) {
      void refreshLocalDraftIndex();
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
        const { data, error } = await runDraftSelectShared("payload", (fields) =>
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
          empresaSnapshot = await getEmpresaFromNitShared(row.empresa_nit);
        }

        if (!empresaSnapshot) {
          return {
            draft: null,
            empresa: null,
            error: "No se pudo reconstruir la empresa de este borrador.",
          };
        }

        const draft = buildDraftMetaShared(row, empresaSnapshot);
        if (!hasRemoteCheckpointShared(draft)) {
          return {
            draft: null,
            empresa: null,
            error:
              "Este borrador aun no tiene un checkpoint remoto completo. Reanudalo desde el dispositivo donde fue creado o guarda un borrador completo primero.",
          };
        }

        setActiveDraftId(draft.id);
        syncRemoteDraftState(draft, {
          checkpointHash: draft.last_checkpoint_hash ?? null,
          identityState: "ready",
        });
        latestLocalDraftRef.current = {
          step: draft.step,
          data: draft.data,
          empresa: empresaSnapshot,
          updatedAt: getDraftUpdatedAtShared(draft),
        };
        const updatedAt = await saveLocalCopyShared(
          getStorageKeyShared(row.form_slug, row.id, localDraftSessionId),
          draft.step,
          draft.data,
          empresaSnapshot,
          getDraftUpdatedAtShared(draft)
        );
        await clearPendingRemoteSync(
          getStorageKeyShared(row.form_slug, row.id, localDraftSessionId)
        );
        void refreshLocalDraftIndex();
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
    [
      clearPendingRemoteSync,
      getUserId,
      localDraftSessionId,
      refreshLocalDraftIndex,
      syncRemoteDraftState,
    ]
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
      setRemoteSyncState("syncing");

      const promise = (async () => {
        try {
          const userId = await getUserId();
          if (!userId) {
            return { ok: false, error: "No autenticado" };
          }

          const supabase = createClient();
          let nextDraftId = createSessionId();
          const identityCreatedAt = new Date().toISOString();
          let error: unknown;

          if (getDraftSchemaModeShared() === "legacy") {
            ({ error } = await supabase
              .from("form_drafts")
              .insert({
                id: nextDraftId,
                user_id: userId,
                ...getDraftWritePayloadShared(slug, empresa, step, {}),
              }));
          } else {
            ({ error } = await supabase
              .from("form_drafts")
              .insert({
                id: nextDraftId,
                user_id: userId,
                ...getDraftStubWritePayloadShared(slug, empresa, step),
              }));

            if (
              isMissingDraftSchemaErrorShared(error) &&
              getCheckpointColumnsModeShared() !== "unsupported"
            ) {
              markCheckpointColumnsUnsupportedShared();
              nextDraftId = createSessionId();
              ({ error } = await supabase
                .from("form_drafts")
                .insert({
                  id: nextDraftId,
                  user_id: userId,
                  ...getDraftStubWritePayloadShared(slug, empresa, step),
                }));
            }

            if (isMissingDraftSchemaErrorShared(error)) {
              markDraftSchemaLegacyShared();
              nextDraftId = createSessionId();
              ({ error } = await supabase
                .from("form_drafts")
                .insert({
                  id: nextDraftId,
                  user_id: userId,
                  ...getDraftWritePayloadShared(slug, empresa, step, {}),
                }));
            } else if (!error && getDraftSchemaModeShared() === "unknown") {
              markDraftSchemaExtendedShared();
            }
          }

          if (error) {
            throw error;
          }

          const previousStorageKey = getStorageKeyShared(slug, null, localDraftSessionId);
          const nextStorageKey = getStorageKeyShared(slug, nextDraftId, localDraftSessionId);
          const existingLocalDraft =
            latestLocalDraftRef.current ??
            (await readLocalCopyShared(previousStorageKey)) ?? {
              step,
              data,
              empresa,
              updatedAt: null,
            };

          latestLocalDraftRef.current = existingLocalDraft;
          const localUpdatedAt = await saveLocalCopyShared(
            nextStorageKey,
            existingLocalDraft.step,
            existingLocalDraft.data,
            existingLocalDraft.empresa ?? empresa,
            existingLocalDraft.updatedAt
          );

          if (nextStorageKey !== previousStorageKey) {
            await moveDraftPayload(previousStorageKey, nextStorageKey);
            await removeLocalCopyShared(previousStorageKey);
            await movePendingCheckpoint(previousStorageKey, nextStorageKey);
          }

          setLocalDraftSavedAt(localUpdatedAt ? new Date(localUpdatedAt) : null);
          setHasPendingAutosave(false);
          void refreshLocalDraftIndex();

          const empresaSnapshot = existingLocalDraft.empresa ?? empresa;
          if (!empresaSnapshot) {
            return {
              ok: false,
              error: "No hay empresa seleccionada para preparar el borrador.",
            };
          }
          const empresaNit = empresaSnapshot.nit_empresa ?? empresa?.nit_empresa;
          if (!empresaNit) {
            return {
              ok: false,
              error: "No hay NIT de empresa para preparar el borrador.",
            };
          }
          const createdSummary: DraftSummary = {
            id: nextDraftId,
            form_slug: slug,
            step: existingLocalDraft.step,
            empresa_nit: empresaNit,
            empresa_nombre: empresaSnapshot.nombre_empresa,
            empresa_snapshot: empresaSnapshot,
            updated_at: identityCreatedAt,
            created_at: identityCreatedAt,
            last_checkpoint_at: null,
          };
          setActiveDraftId(nextDraftId);
          syncRemoteDraftState(createdSummary, {
            checkpointHash: null,
            identityState: "ready",
          });
          emitDraftsChanged({ localChanged: true, remoteChanged: true });

          return { ok: true, draftId: nextDraftId };
        } catch (error) {
          setRemoteIdentityState("local_only_fallback");
          setRemoteSyncState("local_only_fallback");
          return {
            ok: false,
            error: getErrorMessageShared(error, "No se pudo preparar el borrador remoto."),
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
      if (activeDraftId && editingAuthorityState === "read_only") {
        return {
          ok: false,
          error:
            "Este borrador está abierto en otra pestaña. Toma el control desde esta pestaña para seguir editando.",
        };
      }

      if (!slug || !empresa?.nit_empresa) {
        return {
          ok: false,
          error: "No hay empresa seleccionada para guardar el borrador.",
        };
      }

      if (reason === "manual") {
        setSavingDraft(true);
      }
      setRemoteSyncState("syncing");

      await flushAutosave();
      latestLocalDraftRef.current = {
        step,
        data,
        empresa,
        updatedAt: latestLocalDraftRef.current?.updatedAt ?? null,
      };

      try {
        const identityResult = await ensureDraftIdentity(step, data);
        if (!identityResult.ok || !identityResult.draftId) {
          await markPendingRemoteSync(
            {
              slug,
              draftId: activeDraftId,
              sessionId: localDraftSessionId,
              step,
              data,
              empresaSnapshot: empresa,
              updatedAt:
                latestLocalDraftRef.current?.updatedAt ?? new Date().toISOString(),
              checkpointHash: hashSnapshot(step, data),
              reason,
            },
            identityResult.error ?? "No se pudo preparar el borrador remoto."
          );
          return {
            ok: false,
            error:
              identityResult.error ??
              "No se pudo preparar el borrador remoto.",
          };
        }

        const leaseId = confirmDraftLease(identityResult.draftId);
        if (!leaseId) {
          return {
            ok: false,
            error:
              "Este borrador está abierto en otra pestaña. Toma el control desde esta pestaña para seguir editando.",
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
          await markPendingRemoteSync(
            {
              slug,
              draftId: identityResult.draftId,
              sessionId: localDraftSessionId,
              step,
              data,
              empresaSnapshot: empresa,
              updatedAt:
                latestLocalDraftRef.current?.updatedAt ?? new Date().toISOString(),
              checkpointHash,
              reason,
            },
            "No autenticado"
          );
          return { ok: false, error: "No autenticado" };
        }

        const checkpointAt = new Date().toISOString();
        const supabase = createClient();
        let updatedDraft: unknown;
        let error: unknown;
        const lockBeforeWrite = readDraftLock(identityResult.draftId);

        if (
          lockBeforeWrite &&
          (lockBeforeWrite.ownerTabId !== tabIdRef.current ||
            lockBeforeWrite.leaseId !== leaseId)
        ) {
          await flushAndFreezeDraft();
          lockLeaseIdRef.current = null;
          setEditingAuthorityState("read_only");
          setLockConflict(getDraftLockConflict(identityResult.draftId));
          return {
            ok: false,
            error:
              "Este borrador cambió de pestaña activa antes de guardar. Vuelve a tomar el control si necesitas continuar.",
          };
        }

        if (getDraftSchemaModeShared() === "legacy") {
          ({ data: updatedDraft, error } = await supabase
            .from("form_drafts")
            .update(getDraftWritePayloadShared(slug, empresa, step, data))
            .eq("id", identityResult.draftId)
            .eq("user_id", userId)
            .select(getDraftFieldsShared("return"))
            .single());
        } else {
          ({ data: updatedDraft, error } = await supabase
            .from("form_drafts")
            .update(
              getDraftCheckpointWritePayloadShared(
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
            .select(getDraftFieldsShared("return"))
            .single());

          if (
            isMissingDraftSchemaErrorShared(error) &&
            getCheckpointColumnsModeShared() !== "unsupported"
          ) {
            markCheckpointColumnsUnsupportedShared();
            ({ data: updatedDraft, error } = await supabase
              .from("form_drafts")
              .update(
                getDraftCheckpointWritePayloadShared(
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
              .select(
                getDraftFieldsShared("return", { includeCheckpointColumns: false })
              )
              .single());
          }

          if (isMissingDraftSchemaErrorShared(error)) {
            markDraftSchemaLegacyShared();
            ({ data: updatedDraft, error } = await supabase
              .from("form_drafts")
              .update(getDraftWritePayloadShared(slug, empresa, step, data))
              .eq("id", identityResult.draftId)
              .eq("user_id", userId)
              .select(getDraftFieldsShared("return"))
              .single());
          } else if (!error && getDraftSchemaModeShared() === "unknown") {
            markDraftSchemaExtendedShared();
          }
        }

        if (error) {
          throw error;
        }

        const lockAfterWrite = readDraftLock(identityResult.draftId);
        if (
          lockAfterWrite &&
          (lockAfterWrite.ownerTabId !== tabIdRef.current ||
            lockAfterWrite.leaseId !== leaseId)
        ) {
          await flushAndFreezeDraft();
          lockLeaseIdRef.current = null;
          setEditingAuthorityState("read_only");
          setLockConflict(getDraftLockConflict(identityResult.draftId));
          return {
            ok: false,
            error:
              "Este borrador cambió de pestaña activa durante el guardado. Revisa la pestaña que tiene el control.",
          };
        }

        const savedDraftRow = (updatedDraft as DraftRow | null) ?? null;
        const remoteUpdatedAt =
          savedDraftRow?.updated_at ??
          savedDraftRow?.created_at ??
          checkpointAt;
        const nextStorageKey = getStorageKeyShared(
          slug,
          identityResult.draftId,
          localDraftSessionId
        );
        const updatedAt = await saveLocalCopyShared(
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
        await clearPendingRemoteSync(nextStorageKey);
        setLocalDraftSavedAt(updatedAt ? new Date(updatedAt) : null);
        setHasPendingAutosave(false);
        void refreshLocalDraftIndex();

        const nextDraft: DraftMeta = {
          ...(savedDraftRow
            ? buildDraftSummaryShared(
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

        syncRemoteDraftState(nextDraft, {
          checkpointHash: nextDraft.last_checkpoint_hash ?? checkpointHash,
          identityState: "ready",
        });
        if (reason === "manual") {
          setDraftSavedAt(new Date(remoteUpdatedAt));
        }
        emitDraftsChanged({ localChanged: true, remoteChanged: true });

        return {
          ok: true,
          draftId: identityResult.draftId,
        };
      } catch (error) {
        const checkpointHash = hashSnapshot(step, data);
        await markPendingRemoteSync(
          {
            slug,
            draftId: activeDraftId,
            sessionId: localDraftSessionId,
            step,
            data,
            empresaSnapshot: empresa,
            updatedAt:
              latestLocalDraftRef.current?.updatedAt ?? new Date().toISOString(),
            checkpointHash,
            reason,
          },
          getErrorMessageShared(error, "No se pudo guardar el borrador.")
        );

        if (!activeDraftId) {
          setRemoteIdentityState("local_only_fallback");
        }

        return {
          ok: false,
          error: getErrorMessageShared(error, "No se pudo guardar el borrador."),
        };
      } finally {
        if (reason === "manual") {
          setSavingDraft(false);
        }
      }
    },
    [
      activeDraftId,
      confirmDraftLease,
      editingAuthorityState,
      empresa,
      ensureDraftIdentity,
      flushAutosave,
      flushAndFreezeDraft,
      getUserId,
      getDraftLockConflict,
      localDraftSessionId,
      markPendingRemoteSync,
      clearPendingRemoteSync,
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
    async ({
      targetSlug = slug ?? null,
      targetDraftId = null,
      targetSessionId = localDraftSessionId,
    }: {
      targetSlug?: string | null;
      targetDraftId?: string | null;
      targetSessionId?: string;
    } = {}) => {
      const storage = getStorageKeyShared(targetSlug, targetDraftId, targetSessionId);
      await removeLocalCopyShared(
        storage
      );
      await deletePendingCheckpoint(storage);
      void refreshLocalDraftIndex();
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
        const { error } = await supabase
          .from("form_drafts")
          .delete()
          .eq("id", draftId)
          .eq("user_id", userId);

        if (error) {
          throw error;
        }

        await removeLocalDraftArtifacts({
          targetSlug: options?.slug ?? slug ?? null,
          targetDraftId: draftId,
          targetSessionId: options?.sessionId ?? localDraftSessionId,
        });

        if (draftId === activeDraftId) {
          releaseDraftLock(draftId);
          latestLocalDraftRef.current = null;
          lastCheckpointHashRef.current = null;
          lastCheckpointAtRef.current = null;
          remoteUpdatedAtRef.current = null;
          setActiveDraftId(null);
          setDraftSavedAt(null);
          setLocalDraftSavedAt(null);
          setRemoteIdentityState("idle");
          setRemoteSyncState("synced");
          setHasPendingRemoteSync(false);
          setHasPendingAutosave(false);
        }

        emitDraftsChanged({ localChanged: true, remoteChanged: true });
      } catch {
        // el borrado es best effort
      }
    },
    [
      activeDraftId,
      getUserId,
      localDraftSessionId,
      releaseDraftLock,
      removeLocalDraftArtifacts,
      slug,
    ]
  );

  const clearDraft = useCallback(
    async (
      draftId = activeDraftId,
      options?: { slug?: string | null; sessionId?: string | null }
    ) => {
      if (draftId) {
        await deleteDraft(draftId, options);
        return;
      }

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
      setRemoteIdentityState("idle");
      setRemoteSyncState("synced");
      setHasPendingRemoteSync(false);

      await removeLocalDraftArtifacts({
        targetSlug: options?.slug ?? slug ?? null,
        targetDraftId: null,
        targetSessionId: options?.sessionId ?? localDraftSessionId,
      });
      emitDraftsChanged({ localChanged: true, remoteChanged: false });
    },
    [
      activeDraftId,
      deleteDraft,
      localDraftSessionId,
      removeLocalDraftArtifacts,
      slug,
    ]
  );

  const startNewDraftSession = useCallback((sessionId = createSessionId()) => {
    void flushAutosave();
    releaseDraftLock();
    latestLocalDraftRef.current = null;
    lastCheckpointHashRef.current = null;
    lastCheckpointAtRef.current = null;
    remoteUpdatedAtRef.current = null;
    setActiveDraftId(null);
    setLocalDraftSessionId(sessionId);
    setDraftSavedAt(null);
    setLocalDraftSavedAt(null);
    setRemoteIdentityState("idle");
    setRemoteSyncState("synced");
    setHasPendingRemoteSync(false);
    setHasPendingAutosave(false);
    return sessionId;
  }, [flushAutosave, releaseDraftLock]);

  const maybeAutomaticCheckpoint = useCallback(
    async (reason: Exclude<CheckpointDraftReason, "manual">) => {
      if (activeDraftId && editingAuthorityState === "read_only") {
        return;
      }

      if (!slug || !empresa?.nit_empresa) {
        return;
      }

      const payload =
        latestLocalDraftRef.current ?? (await readLocalCopyShared(storageKeyRef.current));
      if (!payload) {
        return;
      }

      const nextHash = hashSnapshot(payload.step, payload.data);
      if (lastCheckpointHashRef.current === nextHash) {
        return;
      }

      const isExitEvent = reason === "pagehide" || reason === "visibilitychange";
      if (!isExitEvent) {
        const checkpointReference =
          lastCheckpointAtRef.current ?? remoteUpdatedAtRef.current;
        if (!shouldRunAutomaticCheckpoint(checkpointReference)) {
          return;
        }
      }

      void checkpointDraft(payload.step, payload.data, reason);
    },
    [activeDraftId, checkpointDraft, editingAuthorityState, empresa, slug]
  );

  const flushPendingCheckpoint = useCallback(async () => {
    if (!isDraftEditable) {
      return false;
    }

    const pending = await readPendingCheckpoint(storageKeyRef.current);
    if (!pending) {
      setHasPendingRemoteSync(false);
      if (remoteSyncState !== "local_only_fallback") {
        setRemoteSyncState("synced");
      }
      return false;
    }

    setHasPendingRemoteSync(true);
    setRemoteSyncState("pending_remote_sync");
    const result = await checkpointDraft(
      pending.step,
      pending.data,
      pending.reason === "retry" ? "interval" : pending.reason
    );

    return result.ok;
  }, [checkpointDraft, isDraftEditable, remoteSyncState]);

  useEffect(() => {
    if (!slug || !empresa?.nit_empresa) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void maybeAutomaticCheckpoint("interval");
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [empresa?.nit_empresa, maybeAutomaticCheckpoint, slug]);

  useEffect(() => {
    const handlePageHide = () => {
      void flushAutosave();
      void maybeAutomaticCheckpoint("pagehide");
      releaseDraftLock();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushAutosave();
        void maybeAutomaticCheckpoint("visibilitychange");
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
        void commitLocalCopy({ updateState: false });
      }

      releaseDraftLock();
    };
  }, [commitLocalCopy, flushAutosave, maybeAutomaticCheckpoint, releaseDraftLock]);

  useEffect(() => {
    if (!storageKey || !slug) {
      return;
    }

    void (async () => {
      const pending = await readPendingCheckpoint(storageKey);
      setHasPendingRemoteSync(Boolean(pending));
      if (pending) {
        setRemoteSyncState("pending_remote_sync");
      }
    })();
  }, [slug, storageKey]);

  useEffect(() => {
    const handleOnline = () => {
      void flushPendingCheckpoint();
    };

    const handleFocus = () => {
      void flushPendingCheckpoint();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void flushPendingCheckpoint();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void flushPendingCheckpoint();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushPendingCheckpoint]);

  return {
    activeDraftId,
    localDraftSessionId,
    loadingDraft,
    savingDraft,
    draftSavedAt,
    localDraftSavedAt,
    remoteIdentityState,
    remoteSyncState,
    editingAuthorityState,
    lockConflict,
    isDraftEditable,
    hasPendingAutosave,
    hasPendingRemoteSync,
    autosave,
    loadLocal,
    flushAutosave,
    loadDraft,
    ensureDraftIdentity,
    checkpointDraft,
    saveDraft,
    takeOverDraft,
    releaseDraftLock,
    clearDraft,
    deleteDraft,
    startNewDraftSession,
  };
}
