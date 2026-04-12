"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import {
  getStorageKey as getStorageKeyShared,
  readLocalCopy as readLocalCopyShared,
  reconcileLocalDraftIndex as reconcileLocalDraftIndexShared,
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
  latestLocalDraftRef: MutableRefObject<LocalDraft | null>;
  setLocalDraftSavedAt: SetState<Date | null>;
  setHasPendingAutosave: SetState<boolean>;
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
  latestLocalDraftRef,
  setLocalDraftSavedAt,
  setHasPendingAutosave,
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
        setHasPendingAutosave(false);
      }

      return saveResult.updatedAt;
    },
    [
      applyLocalPersistenceStatus,
      latestLocalDraftRef,
      refreshLocalDraftIndex,
      setHasPendingAutosave,
      setLocalDraftSavedAt,
      storageKeyRef,
    ]
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
  }, [commitLocalCopy, debounceRef, hasPendingAutosaveRef, setHasPendingAutosave]);

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

    setHasPendingAutosave(false);
  }, [
    applyLocalPersistenceStatus,
    debounceRef,
    latestLocalDraftRef,
    refreshLocalDraftIndex,
    setHasPendingAutosave,
    setLocalDraftSavedAt,
    storageKeyRef,
  ]);

  const autosave = useCallback(
    (step: number, data: Record<string, unknown>) => {
      if (activeDraftId && editingAuthorityState === "read_only") {
        return;
      }

      if (!storageKey) {
        return;
      }

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
    [
      activeDraftId,
      commitLocalCopy,
      debounceRef,
      editingAuthorityState,
      empresa,
      latestLocalDraftRef,
      setHasPendingAutosave,
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
    setHasPendingAutosave(false);
    if (!localDraftResult.draft) {
      void refreshLocalDraftIndex();
    }
    return localDraftResult.draft;
  }, [
    applyLocalPersistenceStatus,
    latestLocalDraftRef,
    refreshLocalDraftIndex,
    setHasPendingAutosave,
    setLocalDraftSavedAt,
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
