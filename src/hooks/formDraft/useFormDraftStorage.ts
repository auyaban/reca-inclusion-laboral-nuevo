"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import { deletePendingCheckpoint } from "@/lib/draftStorage";
import { resolveHasLocalDirtyChanges, shouldPersistSnapshot } from "@/lib/draftSnapshot";
import {
  getStorageKey as getStorageKeyShared,
  readLocalCopy as readLocalCopyShared,
  reconcileLocalDraftIndex as reconcileLocalDraftIndexShared,
  removeLocalCopy as removeLocalCopyShared,
  saveLocalCopy as saveLocalCopyShared,
} from "@/lib/drafts";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  LOCAL_DRAFT_INDEX_KEY,
  LOCAL_DRAFT_PREFIX,
  type ApplyLocalPersistenceStatus,
  type DebounceRef,
  type EditingAuthorityState,
  type LocalDraft,
  type SetState,
} from "./shared";

type StorageParams = {
  slug?: string | null;
  empresa?: Empresa | null;
  activeDraftId: string | null;
  localDraftSessionId: string;
  editingAuthorityState: EditingAuthorityState;
  debounceRef: DebounceRef;
  storageKeyRef: MutableRefObject<string | null>;
  hasPendingAutosaveRef: MutableRefObject<boolean>;
  hasLocalDirtyChangesRef: MutableRefObject<boolean>;
  forcePersistLocalCopyRef: MutableRefObject<boolean>;
  lastCheckpointHashRef: MutableRefObject<string | null>;
  latestLocalDraftRef: MutableRefObject<LocalDraft | null>;
  setLocalDraftSavedAt: SetState<Date | null>;
  setHasPendingAutosave: SetState<boolean>;
  setHasLocalDirtyChanges: SetState<boolean>;
  applyLocalPersistenceStatus: ApplyLocalPersistenceStatus;
};

export function useFormDraftStorage({
  slug,
  empresa,
  activeDraftId,
  localDraftSessionId,
  editingAuthorityState,
  debounceRef,
  storageKeyRef,
  hasPendingAutosaveRef,
  hasLocalDirtyChangesRef,
  forcePersistLocalCopyRef,
  lastCheckpointHashRef,
  latestLocalDraftRef,
  setLocalDraftSavedAt,
  setHasPendingAutosave,
  setHasLocalDirtyChanges,
  applyLocalPersistenceStatus,
}: StorageParams) {
  const storageKey = useMemo(
    () => getStorageKeyShared(slug, activeDraftId, localDraftSessionId),
    [slug, activeDraftId, localDraftSessionId]
  );

  useEffect(() => {
    storageKeyRef.current = storageKey;
  }, [storageKey, storageKeyRef]);

  const refreshLocalDraftIndex = useCallback(
    () => reconcileLocalDraftIndexShared(),
    []
  );

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

      const hasRemoteCheckpoint = Boolean(lastCheckpointHashRef.current);
      const shouldForcePersist = forcePersistLocalCopyRef.current;
      if (
        !hasRemoteCheckpoint &&
        !shouldForcePersist &&
        !shouldPersistSnapshot({
          slug,
          data: payload.data,
          empresa: payload.empresa,
        })
      ) {
        latestLocalDraftRef.current = null;
        hasPendingAutosaveRef.current = false;
        hasLocalDirtyChangesRef.current = false;
        forcePersistLocalCopyRef.current = false;
        setHasPendingAutosave(false);
        setHasLocalDirtyChanges(false);
        setLocalDraftSavedAt(null);
        await deletePendingCheckpoint(storage);
        await removeLocalCopyShared(storage);
        void refreshLocalDraftIndex();
        return null;
      }

      const saveResult = await saveLocalCopyShared(
        storage,
        payload.step,
        payload.data,
        payload.empresa,
        payload.updatedAt
      );
      applyLocalPersistenceStatus(saveResult);

      if (!saveResult.updatedAt) {
        void refreshLocalDraftIndex();
        return null;
      }

      void refreshLocalDraftIndex();
      latestLocalDraftRef.current = {
        ...payload,
        updatedAt: saveResult.updatedAt,
      };

      if (updateState) {
        setLocalDraftSavedAt(new Date(saveResult.updatedAt));
        hasPendingAutosaveRef.current = false;
        setHasPendingAutosave(false);
      }

      const nextHasLocalDirtyChanges = resolveHasLocalDirtyChanges({
        slug,
        step: payload.step,
        data: payload.data,
        empresa: payload.empresa,
        lastCheckpointHash: lastCheckpointHashRef.current,
      });
      hasLocalDirtyChangesRef.current = nextHasLocalDirtyChanges;
      forcePersistLocalCopyRef.current = false;
      setHasLocalDirtyChanges(nextHasLocalDirtyChanges);

      return saveResult.updatedAt;
    },
    [
      applyLocalPersistenceStatus,
      forcePersistLocalCopyRef,
      hasLocalDirtyChangesRef,
      hasPendingAutosaveRef,
      lastCheckpointHashRef,
      latestLocalDraftRef,
      refreshLocalDraftIndex,
      setHasPendingAutosave,
      setHasLocalDirtyChanges,
      setLocalDraftSavedAt,
      slug,
      storageKeyRef,
    ]
  );

  const flushAutosave = useCallback(async () => {
    if (
      !hasPendingAutosaveRef.current &&
      !debounceRef.current &&
      !forcePersistLocalCopyRef.current
    ) {
      return false;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const updatedAt = await commitLocalCopy();
    if (!updatedAt) {
      hasPendingAutosaveRef.current = false;
      setHasPendingAutosave(false);
      return false;
    }

    return true;
  }, [
    commitLocalCopy,
    debounceRef,
    forcePersistLocalCopyRef,
    hasPendingAutosaveRef,
    setHasPendingAutosave,
  ]);

  const flushAndFreezeDraft = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const payload = latestLocalDraftRef.current;
    const storage = storageKeyRef.current;

    if (payload && storage) {
      const saveResult = await saveLocalCopyShared(
        storage,
        payload.step,
        payload.data,
        payload.empresa,
        payload.updatedAt
      );
      applyLocalPersistenceStatus(saveResult);

      void refreshLocalDraftIndex();
      if (saveResult.updatedAt) {
        latestLocalDraftRef.current = {
          ...payload,
          updatedAt: saveResult.updatedAt,
        };
        setLocalDraftSavedAt(new Date(saveResult.updatedAt));
      }
    }

    const nextHasLocalDirtyChanges = payload
      ? resolveHasLocalDirtyChanges({
          slug,
          step: payload.step,
          data: payload.data,
          empresa: payload.empresa,
          lastCheckpointHash: lastCheckpointHashRef.current,
        })
      : false;
    hasLocalDirtyChangesRef.current = nextHasLocalDirtyChanges;
    hasPendingAutosaveRef.current = false;
    forcePersistLocalCopyRef.current = false;
    setHasLocalDirtyChanges(nextHasLocalDirtyChanges);
    setHasPendingAutosave(false);
  }, [
    applyLocalPersistenceStatus,
    debounceRef,
    forcePersistLocalCopyRef,
    hasLocalDirtyChangesRef,
    hasPendingAutosaveRef,
    lastCheckpointHashRef,
    latestLocalDraftRef,
    refreshLocalDraftIndex,
    setHasLocalDirtyChanges,
    setHasPendingAutosave,
    setLocalDraftSavedAt,
    slug,
    storageKeyRef,
  ]);

  const autosave = useCallback(
    (
      step: number,
      data: Record<string, unknown>,
      options?: { forcePersist?: boolean }
    ) => {
      if (activeDraftId && editingAuthorityState === "read_only") {
        return;
      }

      if (!storageKey) {
        return;
      }

      const hasRemoteCheckpoint = Boolean(lastCheckpointHashRef.current);
      if (
        !hasRemoteCheckpoint &&
        !options?.forcePersist &&
        !shouldPersistSnapshot({
          slug,
          data,
          empresa: empresa ?? null,
        })
      ) {
        latestLocalDraftRef.current = null;
        hasPendingAutosaveRef.current = false;
        hasLocalDirtyChangesRef.current = false;
        forcePersistLocalCopyRef.current = false;
        setHasPendingAutosave(false);
        setHasLocalDirtyChanges(false);
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        void deletePendingCheckpoint(storageKey);
        void removeLocalCopyShared(storageKey);
        return;
      }

      if (options?.forcePersist) {
        forcePersistLocalCopyRef.current = true;
      }

      latestLocalDraftRef.current = {
        step,
        data,
        empresa: empresa ?? null,
        updatedAt: null,
      };
      const nextHasLocalDirtyChanges = resolveHasLocalDirtyChanges({
        slug,
        step,
        data,
        empresa: empresa ?? null,
        lastCheckpointHash: lastCheckpointHashRef.current,
      });
      hasLocalDirtyChangesRef.current = nextHasLocalDirtyChanges;
      hasPendingAutosaveRef.current = true;
      setHasLocalDirtyChanges(nextHasLocalDirtyChanges);
      setHasPendingAutosave(true);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void commitLocalCopy();
      }, 800);
    },
    [
      activeDraftId,
      commitLocalCopy,
      debounceRef,
      editingAuthorityState,
      empresa,
      forcePersistLocalCopyRef,
      hasLocalDirtyChangesRef,
      hasPendingAutosaveRef,
      lastCheckpointHashRef,
      latestLocalDraftRef,
      setHasLocalDirtyChanges,
      setHasPendingAutosave,
      slug,
      storageKey,
    ]
  );

  const loadLocal = useCallback(async () => {
    const localDraftResult = await readLocalCopyShared(storageKey);
    applyLocalPersistenceStatus(localDraftResult);
    latestLocalDraftRef.current = localDraftResult.draft;
    setLocalDraftSavedAt(
      localDraftResult.draft?.updatedAt ? new Date(localDraftResult.draft.updatedAt) : null
    );
    const nextHasLocalDirtyChanges = localDraftResult.draft
      ? resolveHasLocalDirtyChanges({
          slug,
          step: localDraftResult.draft.step,
          data: localDraftResult.draft.data,
          empresa: localDraftResult.draft.empresa,
          lastCheckpointHash: lastCheckpointHashRef.current,
        })
      : false;
    hasLocalDirtyChangesRef.current = nextHasLocalDirtyChanges;
    hasPendingAutosaveRef.current = false;
    forcePersistLocalCopyRef.current = false;
    setHasLocalDirtyChanges(nextHasLocalDirtyChanges);
    setHasPendingAutosave(false);
    if (!localDraftResult.draft) {
      void refreshLocalDraftIndex();
    }
    return localDraftResult.draft;
  }, [
    applyLocalPersistenceStatus,
    forcePersistLocalCopyRef,
    hasLocalDirtyChangesRef,
    hasPendingAutosaveRef,
    latestLocalDraftRef,
    refreshLocalDraftIndex,
    lastCheckpointHashRef,
    setHasLocalDirtyChanges,
    setHasPendingAutosave,
    setLocalDraftSavedAt,
    slug,
    storageKey,
  ]);

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

  return {
    storageKey,
    refreshLocalDraftIndex,
    commitLocalCopy,
    flushAutosave,
    flushAndFreezeDraft,
    autosave,
    loadLocal,
  };
}
