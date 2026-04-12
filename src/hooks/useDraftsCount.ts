"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { subscribeDraftsChanged } from "@/lib/draftEvents";
import {
  fetchRecoverableRemoteDraftIds,
  getCurrentUserId,
  reconcileLocalDraftIndex,
  type LocalDraftIndexEntry,
} from "@/lib/drafts";

const COUNT_REFRESH_STALE_MS = 120_000;

export function useDraftsCount() {
  const [localEntries, setLocalEntries] = useState<LocalDraftIndexEntry[]>([]);
  const [remoteDraftIds, setRemoteDraftIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchedAtRef = useRef(0);

  const refreshLocal = useCallback(async () => {
    const nextEntries = await reconcileLocalDraftIndex();
    setLocalEntries(nextEntries);
    return nextEntries;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await getCurrentUserId();
      const nextLocalEntries = await refreshLocal();
      if (!userId) {
        setRemoteDraftIds([]);
        lastFetchedAtRef.current = Date.now();
        return;
      }

      const nextRemoteIds = await fetchRecoverableRemoteDraftIds(userId);
      setRemoteDraftIds(nextRemoteIds);
      setLocalEntries(nextLocalEntries);
      lastFetchedAtRef.current = Date.now();
    } catch {
      setRemoteDraftIds([]);
      refreshLocal();
      lastFetchedAtRef.current = Date.now();
    } finally {
      setLoading(false);
    }
  }, [refreshLocal]);

  const refreshIfStale = useCallback(() => {
    if (Date.now() - lastFetchedAtRef.current < COUNT_REFRESH_STALE_MS) {
      return;
    }

    void refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => refreshIfStale();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshIfStale();
      }
    };

    const unsubscribe = subscribeDraftsChanged((detail) => {
      if (detail.localChanged) {
        void refreshLocal();
      }

      if (detail.remoteChanged) {
        void refresh();
      }
    });

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh, refreshIfStale, refreshLocal]);

  const draftsCount = useMemo(() => {
    const localDraftIds = new Set(
      localEntries
        .map((entry) => entry.draftId)
        .filter((draftId): draftId is string => !!draftId)
    );

    const remoteOnlyCount = remoteDraftIds.filter(
      (draftId) => !localDraftIds.has(draftId)
    ).length;

    return localEntries.length + remoteOnlyCount;
  }, [localEntries, remoteDraftIds]);

  return {
    draftsCount,
    loading,
    refresh,
  };
}
