"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { emitDraftsChanged, subscribeDraftsChanged } from "@/lib/draftEvents";
import {
  projectRecoverableDrafts,
  fetchDraftPayload,
  fetchDraftSummaries,
  getCurrentUserId,
  purgeDraftArtifacts,
  reconcileLocalDraftIndex,
  type DraftMeta,
  type DraftSummary,
  type HubDraft,
  type LocalDraftIndexEntry,
} from "@/lib/drafts";
import type { Empresa } from "@/lib/store/empresaStore";

type LoadDraftResult = {
  draft: DraftMeta | null;
  empresa: Empresa | null;
  error?: string;
};

const HUB_REFRESH_STALE_MS = 120_000;

export function useDraftsHub() {
  const [remoteDrafts, setRemoteDrafts] = useState<DraftSummary[]>([]);
  const [localEntries, setLocalEntries] = useState<LocalDraftIndexEntry[]>([]);
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
        setRemoteDrafts([]);
        lastFetchedAtRef.current = Date.now();
        return;
      }

      const nextRemoteDrafts = await fetchDraftSummaries(userId);
      setRemoteDrafts(nextRemoteDrafts);
      setLocalEntries(nextLocalEntries);
      lastFetchedAtRef.current = Date.now();
    } catch {
      setRemoteDrafts([]);
      refreshLocal();
      lastFetchedAtRef.current = Date.now();
    } finally {
      setLoading(false);
    }
  }, [refreshLocal]);

  const refreshIfStale = useCallback(() => {
    if (Date.now() - lastFetchedAtRef.current < HUB_REFRESH_STALE_MS) {
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

  const loadDraft = useCallback(
    async (draftId: string): Promise<LoadDraftResult> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          return { draft: null, empresa: null, error: "No autenticado" };
        }

        const result = await fetchDraftPayload(userId, draftId);
        if (!result.draft) {
          return { draft: null, empresa: null, error: "Borrador no encontrado" };
        }

        return result;
      } catch (error) {
        return {
          draft: null,
          empresa: null,
          error:
            error instanceof Error
              ? error.message
              : "No se pudo cargar el borrador.",
        };
      }
    },
    []
  );

  const deleteHubDraft = useCallback(async (draft: HubDraft) => {
    if (!draft.draftId) {
      await purgeDraftArtifacts({
        slug: draft.form_slug,
        sessionId: draft.sessionId,
      });
      setLocalEntries(await reconcileLocalDraftIndex());
      emitDraftsChanged({ localChanged: true, remoteChanged: false });
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("form_drafts")
      .delete()
      .eq("id", draft.draftId)
      .eq("user_id", userId);

    if (error) {
      return;
    }

    await purgeDraftArtifacts({
      slug: draft.form_slug,
      draftId: draft.draftId,
      sessionId: draft.sessionId,
    });

    setRemoteDrafts((current) =>
      current.filter((item) => item.id !== draft.draftId)
    );
    setLocalEntries(await reconcileLocalDraftIndex());
    emitDraftsChanged({ localChanged: true, remoteChanged: true });
  }, []);

  const { hubDrafts, draftsCount } = useMemo(
    () => projectRecoverableDrafts(remoteDrafts, localEntries),
    [localEntries, remoteDrafts]
  );

  return {
    hubDrafts,
    draftsCount,
    loading,
    refresh,
    loadDraft,
    deleteHubDraft,
  };
}
