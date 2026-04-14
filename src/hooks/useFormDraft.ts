"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deletePendingCheckpoint,
  toLocalPersistenceStatus,
  writePendingCheckpoint,
} from "@/lib/draftStorage";
import { getStorageKey as getStorageKeyShared } from "@/lib/drafts";
import {
  type DraftMeta,
  type DraftLockConflict,
  type DraftSummary,
  type EditingAuthorityState,
  type EnsureDraftIdentityResult,
  type LocalPersistenceState,
  type LocalDraft,
  type Options,
  type PendingCheckpointEntry,
  type RemoteIdentityState,
  type RemoteSyncState,
  createSessionId,
} from "@/hooks/formDraft/shared";
import { useFormDraftCheckpoint } from "@/hooks/formDraft/useFormDraftCheckpoint";
import { useFormDraftIdentity } from "@/hooks/formDraft/useFormDraftIdentity";
import { useFormDraftLock } from "@/hooks/formDraft/useFormDraftLock";
import { useFormDraftStorage } from "@/hooks/formDraft/useFormDraftStorage";

export type {
  CheckpointDraftReason,
  CheckpointDraftResult,
  DraftLockConflict,
  DraftMeta,
  DraftSummary,
  EditingAuthorityState,
  HubDraft,
  HubDraftSyncStatus,
  LoadDraftResult,
  LocalPersistenceState,
  Options,
  RemoteIdentityState,
  RemoteSyncState,
  SaveDraftResult,
} from "@/hooks/formDraft/shared";

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
  const [remoteSyncState, setRemoteSyncState] =
    useState<RemoteSyncState>("synced");
  const [editingAuthorityState, setEditingAuthorityState] =
    useState<EditingAuthorityState>(initialDraftId ? "checking" : "editor");
  const [lockConflict, setLockConflict] = useState<DraftLockConflict | null>(null);
  const [hasPendingAutosave, setHasPendingAutosave] = useState(false);
  const [hasLocalDirtyChanges, setHasLocalDirtyChanges] = useState(false);
  const [hasPendingRemoteSync, setHasPendingRemoteSync] = useState(false);
  const [localPersistenceState, setLocalPersistenceState] =
    useState<LocalPersistenceState>("indexeddb");
  const [localPersistenceMessage, setLocalPersistenceMessage] = useState<string | null>(
    null
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKeyRef = useRef<string | null>(null);
  const savingDraftRef = useRef(false);
  const manualSaveInFlightRef = useRef(false);
  const hasPendingAutosaveRef = useRef(false);
  const hasLocalDirtyChangesRef = useRef(false);
  const hasPendingRemoteSyncRef = useRef(false);
  const remoteSyncStateRef = useRef<RemoteSyncState>("synced");
  const latestLocalDraftRef = useRef<LocalDraft | null>(null);
  const ensureDraftIdentityPromiseRef =
    useRef<Promise<EnsureDraftIdentityResult> | null>(null);
  const lastCheckpointHashRef = useRef<string | null>(null);
  const lastCheckpointAtRef = useRef<string | null>(null);
  const remoteUpdatedAtRef = useRef<string | null>(null);
  const tabIdRef = useRef(createSessionId());
  const lockLeaseIdRef = useRef<string | null>(null);
  const lockChannelRef = useRef<BroadcastChannel | null>(null);
  const lockHeartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const lockReconcileIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  useEffect(() => {
    savingDraftRef.current = savingDraft;
  }, [savingDraft]);

  useEffect(() => {
    hasPendingAutosaveRef.current = hasPendingAutosave;
  }, [hasPendingAutosave]);

  useEffect(() => {
    hasLocalDirtyChangesRef.current = hasLocalDirtyChanges;
  }, [hasLocalDirtyChanges]);

  useEffect(() => {
    hasPendingRemoteSyncRef.current = hasPendingRemoteSync;
  }, [hasPendingRemoteSync]);

  useEffect(() => {
    remoteSyncStateRef.current = remoteSyncState;
  }, [remoteSyncState]);

  const applyLocalPersistenceStatus = useCallback(
    ({
      state,
      message,
    }: {
      state: LocalPersistenceState;
      message: string | null;
    }) => {
      setLocalPersistenceState(state);
      setLocalPersistenceMessage(message);
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
    async (entry: PendingCheckpointEntry, errorMessage?: string | null) => {
      const storage = getStorageKeyShared(
        entry.slug,
        entry.draftId,
        entry.sessionId ?? ""
      );
      if (!storage) {
        return;
      }

      const pendingWriteResult = await writePendingCheckpoint(storage, {
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
      applyLocalPersistenceStatus(toLocalPersistenceStatus(pendingWriteResult));

      setHasPendingRemoteSync(true);
      setRemoteSyncState("pending_remote_sync");
    },
    [applyLocalPersistenceStatus]
  );

  const clearPendingRemoteSync = useCallback(async (storageKey: string | null) => {
    await deletePendingCheckpoint(storageKey);
    setHasPendingRemoteSync(false);
    setRemoteSyncState("synced");
  }, []);

  const {
    refreshLocalDraftIndex,
    flushAutosave,
    flushAndFreezeDraft,
    autosave,
    loadLocal,
  } = useFormDraftStorage({
    slug,
    empresa,
    activeDraftId,
    localDraftSessionId,
    editingAuthorityState,
    debounceRef,
    storageKeyRef,
    hasPendingAutosaveRef,
    lastCheckpointHashRef,
    latestLocalDraftRef,
    setLocalDraftSavedAt,
    setHasPendingAutosave,
    setHasLocalDirtyChanges,
    applyLocalPersistenceStatus,
  });

  const {
    isDraftEditable,
    takeOverDraft,
    releaseDraftLock,
    confirmDraftLease,
    applyReadOnlyConflict,
  } = useFormDraftLock({
    slug,
    activeDraftId,
    editingAuthorityState,
    setEditingAuthorityState,
    setLockConflict,
    tabIdRef,
    lockLeaseIdRef,
    lockChannelRef,
    lockHeartbeatIntervalRef,
    lockReconcileIntervalRef,
    flushAndFreezeDraft,
  });

  const {
    getUserId,
    loadDraft,
    ensureDraftIdentity,
    deleteDraft,
    clearDraft,
    startNewDraftSession,
  } = useFormDraftIdentity({
    slug,
    empresa,
    initialDraftId,
    initialLocalDraftSessionId,
    activeDraftId,
    setActiveDraftId,
    localDraftSessionId,
    setLocalDraftSessionId,
    setLoadingDraft,
    setDraftSavedAt,
    setLocalDraftSavedAt,
    setRemoteIdentityState,
    setRemoteSyncState,
    setHasPendingRemoteSync,
    setHasPendingAutosave,
    setHasLocalDirtyChanges,
    debounceRef,
    latestLocalDraftRef,
    ensureDraftIdentityPromiseRef,
    lastCheckpointHashRef,
    lastCheckpointAtRef,
    remoteUpdatedAtRef,
    refreshLocalDraftIndex,
    releaseDraftLock,
    flushAutosave,
    syncRemoteDraftState,
    clearPendingRemoteSync,
    applyLocalPersistenceStatus,
  });

  const { checkpointDraft, saveDraft } = useFormDraftCheckpoint({
    slug,
    empresa,
    activeDraftId,
    localDraftSessionId,
    editingAuthorityState,
    latestLocalDraftRef,
    lastCheckpointHashRef,
    lastCheckpointAtRef,
    remoteUpdatedAtRef,
    storageKeyRef,
    hasPendingAutosaveRef,
    hasLocalDirtyChangesRef,
    hasPendingRemoteSyncRef,
    remoteSyncStateRef,
    savingDraftRef,
    manualSaveInFlightRef,
    setSavingDraft,
    setDraftSavedAt,
    setLocalDraftSavedAt,
    setRemoteIdentityState,
    setRemoteSyncState,
    setHasPendingAutosave,
    setHasLocalDirtyChanges,
    setHasPendingRemoteSync,
    flushAutosave,
    flushAndFreezeDraft,
    refreshLocalDraftIndex,
    getUserId,
    ensureDraftIdentity,
    confirmDraftLease,
    applyReadOnlyConflict,
    syncRemoteDraftState,
    markPendingRemoteSync,
    clearPendingRemoteSync,
    releaseDraftLock,
    applyLocalPersistenceStatus,
  });

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
    hasLocalDirtyChanges,
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
    localPersistenceState,
    localPersistenceMessage,
  };
}
