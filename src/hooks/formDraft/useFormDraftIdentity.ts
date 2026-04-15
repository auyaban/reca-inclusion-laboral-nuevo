"use client";

import { useCallback, useEffect } from "react";
import type { MutableRefObject } from "react";
import { createClient } from "@/lib/supabase/client";
import { emitDraftsChanged } from "@/lib/draftEvents";
import {
  moveDraftPayload,
  movePendingCheckpoint,
} from "@/lib/draftStorage";
import {
  buildDraftSnapshotHash as buildDraftSnapshotHashShared,
  buildDraftMeta as buildDraftMetaShared,
  findPersistedDraftIdForSession,
  getCheckpointColumnsMode as getCheckpointColumnsModeShared,
  getCurrentUserId,
  getDraftCheckpointWritePayload as getDraftCheckpointWritePayloadShared,
  getDraftSchemaMode as getDraftSchemaModeShared,
  getDraftStubWritePayload as getDraftStubWritePayloadShared,
  getDraftUpdatedAt as getDraftUpdatedAtShared,
  getDraftWritePayload as getDraftWritePayloadShared,
  getEmpresaFromNit as getEmpresaFromNitShared,
  getErrorMessage as getErrorMessageShared,
  getStorageKey as getStorageKeyShared,
  isMissingDraftSchemaError as isMissingDraftSchemaErrorShared,
  markCheckpointColumnsUnsupported as markCheckpointColumnsUnsupportedShared,
  markDraftSchemaExtended as markDraftSchemaExtendedShared,
  markDraftSchemaLegacy as markDraftSchemaLegacyShared,
  readLocalCopy as readLocalCopyShared,
  removeLocalCopy as removeLocalCopyShared,
  purgeDraftArtifacts as purgeDraftArtifactsShared,
  runDraftSelect as runDraftSelectShared,
  saveLocalCopy as saveLocalCopyShared,
  setDraftAlias,
} from "@/lib/drafts";
import { parseEmpresaSnapshot } from "@/lib/empresa";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  createSessionId,
  type ApplyLocalPersistenceStatus,
  type ClearPendingRemoteSync,
  type DebounceRef,
  type DuplicateDraftResult,
  type DraftRow,
  type DraftSummary,
  type EnsureDraftIdentityResult,
  type LoadDraftResult,
  type LocalDraft,
  type Options,
  type SetState,
  type SyncRemoteDraftState,
} from "./shared";
import {
  buildCreatedDraftSummary,
  getDraftIdentityInsertStrategies,
  resolveEnsureDraftIdentitySettledState,
  resolveIdentityLocalDraft,
} from "./draftIdentityRuntime";

type IdentityParams = Options & {
  activeDraftId: string | null;
  setActiveDraftId: SetState<string | null>;
  localDraftSessionId: string;
  setLocalDraftSessionId: SetState<string>;
  setLoadingDraft: SetState<boolean>;
  setDraftSavedAt: SetState<Date | null>;
  setLocalDraftSavedAt: SetState<Date | null>;
  setRemoteIdentityState: SetState<
    "idle" | "creating" | "ready" | "local_only_fallback"
  >;
  setRemoteSyncState: SetState<
    "synced" | "syncing" | "pending_remote_sync" | "local_only_fallback"
  >;
  setHasPendingRemoteSync: SetState<boolean>;
  setHasPendingAutosave: SetState<boolean>;
  setHasLocalDirtyChanges: SetState<boolean>;
  debounceRef: DebounceRef;
  latestLocalDraftRef: MutableRefObject<LocalDraft | null>;
  ensureDraftIdentityPromiseRef: MutableRefObject<
    Promise<EnsureDraftIdentityResult> | null
  >;
  lastCheckpointHashRef: MutableRefObject<string | null>;
  lastCheckpointAtRef: MutableRefObject<string | null>;
  remoteUpdatedAtRef: MutableRefObject<string | null>;
  refreshLocalDraftIndex: () => Promise<unknown>;
  releaseDraftLock: (draftId?: string | null) => void;
  flushAutosave: () => Promise<boolean>;
  syncRemoteDraftState: SyncRemoteDraftState;
  clearPendingRemoteSync: ClearPendingRemoteSync;
  applyLocalPersistenceStatus: ApplyLocalPersistenceStatus;
};

export function useFormDraftIdentity({
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
}: IdentityParams) {
  useEffect(() => {
    setActiveDraftId(initialDraftId ?? null);
  }, [initialDraftId, setActiveDraftId]);

  useEffect(() => {
    if (initialDraftId) {
      setRemoteIdentityState("ready");
    }
  }, [initialDraftId, setRemoteIdentityState]);

  useEffect(() => {
    if (!activeDraftId && initialLocalDraftSessionId?.trim()) {
      setLocalDraftSessionId(initialLocalDraftSessionId);
    }
  }, [activeDraftId, initialLocalDraftSessionId, setLocalDraftSessionId]);

  useEffect(() => {
    if (activeDraftId) {
      setRemoteIdentityState("ready");
      return;
    }

    setRemoteIdentityState((current) =>
      current === "local_only_fallback" ? current : "idle"
    );
  }, [activeDraftId, setRemoteIdentityState]);

  const getUserId = useCallback(() => getCurrentUserId(), []);

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

        const row = data as DraftRow;
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
        if (!draft.last_checkpoint_at) {
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
        setDraftAlias(row.form_slug, localDraftSessionId, draft.id);
        latestLocalDraftRef.current = {
          step: draft.step,
          data: draft.data,
          empresa: empresaSnapshot,
          updatedAt: getDraftUpdatedAtShared(draft),
        };
        const saveResult = await saveLocalCopyShared(
          getStorageKeyShared(row.form_slug, row.id, localDraftSessionId),
          draft.step,
          draft.data,
          empresaSnapshot,
          getDraftUpdatedAtShared(draft),
          {
            sessionIdOverride: localDraftSessionId,
          }
        );
        applyLocalPersistenceStatus(saveResult);
        await clearPendingRemoteSync(
          getStorageKeyShared(row.form_slug, row.id, localDraftSessionId)
        );
        void refreshLocalDraftIndex();
        const remoteSavedAt = getDraftUpdatedAtShared(draft);
        setLocalDraftSavedAt(
          saveResult.updatedAt ? new Date(saveResult.updatedAt) : null
        );
        setDraftSavedAt(remoteSavedAt ? new Date(remoteSavedAt) : null);
        setHasPendingAutosave(false);
        setHasLocalDirtyChanges(false);

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
      latestLocalDraftRef,
      localDraftSessionId,
      applyLocalPersistenceStatus,
      refreshLocalDraftIndex,
      setActiveDraftId,
      setHasPendingAutosave,
      setHasLocalDirtyChanges,
      setDraftSavedAt,
      setLoadingDraft,
      setLocalDraftSavedAt,
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

      const persistedDraftId = findPersistedDraftIdForSession(
        slug,
        localDraftSessionId
      );
      if (persistedDraftId) {
        setActiveDraftId(persistedDraftId);
        setRemoteIdentityState("ready");
        setRemoteSyncState("synced");
        return { ok: true, draftId: persistedDraftId };
      }

      if (ensureDraftIdentityPromiseRef.current) {
        return ensureDraftIdentityPromiseRef.current;
      }

      setRemoteIdentityState("creating");
      setRemoteSyncState("syncing");

      const promise = (async () => {
        const settleIdentityResult = (result: EnsureDraftIdentityResult) => {
          const settledState = resolveEnsureDraftIdentitySettledState(result);

          if (!result.ok || !result.draftId) {
            setRemoteIdentityState(settledState.remoteIdentityState);
            setRemoteSyncState(settledState.remoteSyncState);
          }

          return result;
        };

        try {
          const userId = await getUserId();
          if (!userId) {
            return settleIdentityResult({ ok: false, error: "No autenticado" });
          }

          const supabase = createClient();
          const identityCreatedAt = new Date().toISOString();
          const insertStrategies = getDraftIdentityInsertStrategies({
            draftSchemaMode: getDraftSchemaModeShared(),
            checkpointColumnsMode: getCheckpointColumnsModeShared(),
          });
          let nextDraftId: string | null = null;
          let error: unknown = null;

          for (const strategy of insertStrategies) {
            const candidateDraftId = createSessionId();

            if (strategy === "checkpoint_unsupported") {
              markCheckpointColumnsUnsupportedShared();
            } else if (strategy === "legacy") {
              markDraftSchemaLegacyShared();
            }

            const insertPayload =
              strategy === "legacy"
                ? getDraftWritePayloadShared(slug, empresa, step, {})
                : getDraftStubWritePayloadShared(slug, empresa, step);

            ({ error } = await supabase.from("form_drafts").insert({
              id: candidateDraftId,
              user_id: userId,
              ...insertPayload,
            }));

            if (!error) {
              nextDraftId = candidateDraftId;

              if (
                strategy !== "legacy" &&
                getDraftSchemaModeShared() === "unknown"
              ) {
                markDraftSchemaExtendedShared();
              }
              break;
            }

            if (!isMissingDraftSchemaErrorShared(error)) {
              break;
            }
          }

          if (!nextDraftId || error) {
            throw error;
          }

          setDraftAlias(slug, localDraftSessionId, nextDraftId);

          const previousStorageKey = getStorageKeyShared(
            slug,
            null,
            localDraftSessionId
          );
          const nextStorageKey = getStorageKeyShared(
            slug,
            nextDraftId,
            localDraftSessionId
          );
          const storedLocalDraft = (await readLocalCopyShared(previousStorageKey)).draft;
          const existingLocalDraft = resolveIdentityLocalDraft({
            latestLocalDraft: latestLocalDraftRef.current,
            storedLocalDraft,
            step,
            data,
            empresa,
          });

          latestLocalDraftRef.current = existingLocalDraft;
          const localSaveResult = await saveLocalCopyShared(
            nextStorageKey,
            existingLocalDraft.step,
            existingLocalDraft.data,
            existingLocalDraft.empresa ?? empresa,
            existingLocalDraft.updatedAt,
            {
              sessionIdOverride: localDraftSessionId,
            }
          );
          applyLocalPersistenceStatus(localSaveResult);

          if (nextStorageKey !== previousStorageKey) {
            await moveDraftPayload(previousStorageKey, nextStorageKey);
            await removeLocalCopyShared(previousStorageKey);
            await movePendingCheckpoint(previousStorageKey, nextStorageKey);
          }

          setLocalDraftSavedAt(
            localSaveResult.updatedAt ? new Date(localSaveResult.updatedAt) : null
          );
          setHasPendingAutosave(false);
          void refreshLocalDraftIndex();

          const empresaSnapshot = existingLocalDraft.empresa ?? empresa;
          if (!empresaSnapshot) {
            return settleIdentityResult({
              ok: false,
              error: "No hay empresa seleccionada para preparar el borrador.",
            });
          }
          const empresaNit = empresaSnapshot.nit_empresa ?? empresa?.nit_empresa;
          if (!empresaNit) {
            return settleIdentityResult({
              ok: false,
              error: "No hay NIT de empresa para preparar el borrador.",
            });
          }
          const createdSummary: DraftSummary = {
            ...buildCreatedDraftSummary({
              draftId: nextDraftId,
              slug,
              step: existingLocalDraft.step,
              empresaSnapshot,
              createdAt: identityCreatedAt,
            }),
            empresa_nit: empresaNit,
          };
          setActiveDraftId(nextDraftId);
          syncRemoteDraftState(createdSummary, {
            checkpointHash: null,
            identityState: "ready",
          });
          emitDraftsChanged({ localChanged: true, remoteChanged: true });

          return { ok: true, draftId: nextDraftId };
        } catch (error) {
          return settleIdentityResult({
            ok: false,
            error: getErrorMessageShared(error, "No se pudo preparar el borrador remoto."),
          });
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
      ensureDraftIdentityPromiseRef,
      getUserId,
      latestLocalDraftRef,
      localDraftSessionId,
      applyLocalPersistenceStatus,
      refreshLocalDraftIndex,
      setActiveDraftId,
      setHasPendingAutosave,
      setLocalDraftSavedAt,
      setRemoteIdentityState,
      setRemoteSyncState,
      slug,
      syncRemoteDraftState,
    ]
  );

  const duplicateDraft = useCallback(
    async ({
      step,
      data,
      empresa: empresaOverride,
    }: {
      step: number;
      data: Record<string, unknown>;
      empresa?: Empresa | null;
    }): Promise<DuplicateDraftResult> => {
      const snapshotEmpresa = empresaOverride ?? empresa;

      if (!slug || !snapshotEmpresa?.nit_empresa) {
        return {
          ok: false,
          error: "No hay empresa seleccionada para duplicar el borrador.",
        };
      }

      try {
        const userId = await getUserId();
        if (!userId) {
          return { ok: false, error: "No autenticado" };
        }

        const supabase = createClient();
        const nextSessionId = createSessionId();
        const checkpointAt = new Date().toISOString();
        const checkpointHash = buildDraftSnapshotHashShared(step, data);
        const insertStrategies = getDraftIdentityInsertStrategies({
          draftSchemaMode: getDraftSchemaModeShared(),
          checkpointColumnsMode: getCheckpointColumnsModeShared(),
        });

        let nextDraftId: string | null = null;
        let insertError: unknown = null;

        for (const strategy of insertStrategies) {
          const candidateDraftId = createSessionId();

          if (strategy === "checkpoint_unsupported") {
            markCheckpointColumnsUnsupportedShared();
          } else if (strategy === "legacy") {
            markDraftSchemaLegacyShared();
          }

          const insertPayload =
            strategy === "legacy"
              ? getDraftWritePayloadShared(slug, snapshotEmpresa, step, data)
              : getDraftCheckpointWritePayloadShared(
                  slug,
                  snapshotEmpresa,
                  step,
                  data,
                  checkpointAt,
                  checkpointHash
                );

          ({ error: insertError } = await supabase.from("form_drafts").insert({
            id: candidateDraftId,
            user_id: userId,
            ...insertPayload,
          }));

          if (!insertError) {
            nextDraftId = candidateDraftId;

            if (
              strategy !== "legacy" &&
              getDraftSchemaModeShared() === "unknown"
            ) {
              markDraftSchemaExtendedShared();
            }
            break;
          }

          if (!isMissingDraftSchemaErrorShared(insertError)) {
            break;
          }
        }

        if (!nextDraftId || insertError) {
          throw insertError;
        }

        const nextStorageKey = getStorageKeyShared(
          slug,
          nextDraftId,
          nextSessionId
        );
        const saveResult = await saveLocalCopyShared(
          nextStorageKey,
          step,
          data,
          snapshotEmpresa,
          checkpointAt,
          {
            sessionIdOverride: nextSessionId,
          }
        );
        applyLocalPersistenceStatus(saveResult);
        setDraftAlias(slug, nextSessionId, nextDraftId);
        void refreshLocalDraftIndex();
        emitDraftsChanged({ localChanged: true, remoteChanged: true });

        return {
          ok: true,
          draftId: nextDraftId,
          sessionId: nextSessionId,
        };
      } catch (error) {
        return {
          ok: false,
          error: getErrorMessageShared(
            error,
            "No se pudo duplicar el borrador."
          ),
        };
      }
    },
    [
      applyLocalPersistenceStatus,
      empresa,
      getUserId,
      refreshLocalDraftIndex,
      slug,
    ]
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
      await purgeDraftArtifactsShared({
        slug: targetSlug,
        draftId: targetDraftId,
        sessionId: targetSessionId,
      });
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
        if (!userId) {
          return;
        }

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
          setHasLocalDirtyChanges(false);
        }

        emitDraftsChanged({ localChanged: true, remoteChanged: true });
      } catch {
        // best effort
      }
    },
    [
      activeDraftId,
      getUserId,
      lastCheckpointAtRef,
      lastCheckpointHashRef,
      latestLocalDraftRef,
      localDraftSessionId,
      releaseDraftLock,
      remoteUpdatedAtRef,
      removeLocalDraftArtifacts,
      setActiveDraftId,
      setDraftSavedAt,
      setHasPendingAutosave,
      setHasLocalDirtyChanges,
      setHasPendingRemoteSync,
      setLocalDraftSavedAt,
      setRemoteIdentityState,
      setRemoteSyncState,
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
      setHasLocalDirtyChanges(false);

      await removeLocalDraftArtifacts({
        targetSlug: options?.slug ?? slug ?? null,
        targetDraftId: null,
        targetSessionId: options?.sessionId ?? localDraftSessionId,
      });
      emitDraftsChanged({ localChanged: true, remoteChanged: false });
    },
    [
      activeDraftId,
      debounceRef,
      deleteDraft,
      lastCheckpointAtRef,
      lastCheckpointHashRef,
      latestLocalDraftRef,
      localDraftSessionId,
      remoteUpdatedAtRef,
      removeLocalDraftArtifacts,
      setDraftSavedAt,
      setHasPendingAutosave,
      setHasLocalDirtyChanges,
      setHasPendingRemoteSync,
      setLocalDraftSavedAt,
      setRemoteIdentityState,
      setRemoteSyncState,
      slug,
    ]
  );

  const startNewDraftSession = useCallback(
    (sessionId = createSessionId()) => {
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
      setHasLocalDirtyChanges(false);
      return sessionId;
    },
    [
      flushAutosave,
      lastCheckpointAtRef,
      lastCheckpointHashRef,
      latestLocalDraftRef,
      releaseDraftLock,
      remoteUpdatedAtRef,
      setActiveDraftId,
      setDraftSavedAt,
      setHasPendingAutosave,
      setHasLocalDirtyChanges,
      setHasPendingRemoteSync,
      setLocalDraftSavedAt,
      setLocalDraftSessionId,
      setRemoteIdentityState,
      setRemoteSyncState,
    ]
  );

  return {
    getUserId,
    loadDraft,
    ensureDraftIdentity,
    duplicateDraft,
    deleteDraft,
    clearDraft,
    startNewDraftSession,
  };
}
