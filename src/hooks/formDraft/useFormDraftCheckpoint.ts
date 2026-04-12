"use client";

import { useCallback, useEffect } from "react";
import type { MutableRefObject } from "react";
import { toLocalPersistenceStatus } from "@/lib/draftStorage";
import { createClient } from "@/lib/supabase/client";
import { emitDraftsChanged } from "@/lib/draftEvents";
import { readPendingCheckpoint } from "@/lib/draftStorage";
import {
  buildDraftSummary as buildDraftSummaryShared,
  getCheckpointColumnsMode as getCheckpointColumnsModeShared,
  getDraftCheckpointWritePayload as getDraftCheckpointWritePayloadShared,
  getDraftFields as getDraftFieldsShared,
  getDraftSchemaMode as getDraftSchemaModeShared,
  getDraftWritePayload as getDraftWritePayloadShared,
  getErrorMessage as getErrorMessageShared,
  getStorageKey as getStorageKeyShared,
  isMissingDraftSchemaError as isMissingDraftSchemaErrorShared,
  markCheckpointColumnsUnsupported as markCheckpointColumnsUnsupportedShared,
  markDraftSchemaExtended as markDraftSchemaExtendedShared,
  markDraftSchemaLegacy as markDraftSchemaLegacyShared,
  readLocalCopy as readLocalCopyShared,
  saveLocalCopy as saveLocalCopyShared,
} from "@/lib/drafts";
import { parseEmpresaSnapshot } from "@/lib/empresa";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  hashSnapshot,
  shouldRunAutomaticCheckpoint,
  type ApplyLocalPersistenceStatus,
  type CheckpointDraftReason,
  type CheckpointDraftResult,
  type ClearPendingRemoteSync,
  type DraftMeta,
  type DraftRow,
  type EditingAuthorityState,
  type EnsureDraftIdentity,
  type LocalDraft,
  type MarkPendingRemoteSync,
  type SetState,
  type SyncRemoteDraftState,
} from "./shared";
import {
  normalizePendingCheckpointReason,
  resolvePendingCheckpointRemoteSyncState,
  shouldSkipPendingCheckpointFlush,
} from "./draftCheckpointRuntime";

type CheckpointParams = {
  slug?: string | null;
  empresa?: Empresa | null;
  activeDraftId: string | null;
  localDraftSessionId: string;
  editingAuthorityState: EditingAuthorityState;
  latestLocalDraftRef: MutableRefObject<LocalDraft | null>;
  lastCheckpointHashRef: MutableRefObject<string | null>;
  lastCheckpointAtRef: MutableRefObject<string | null>;
  remoteUpdatedAtRef: MutableRefObject<string | null>;
  storageKeyRef: MutableRefObject<string | null>;
  hasPendingAutosaveRef: MutableRefObject<boolean>;
  savingDraftRef: MutableRefObject<boolean>;
  setSavingDraft: SetState<boolean>;
  setDraftSavedAt: SetState<Date | null>;
  setLocalDraftSavedAt: SetState<Date | null>;
  setRemoteIdentityState: SetState<
    "idle" | "creating" | "ready" | "local_only_fallback"
  >;
  setRemoteSyncState: SetState<
    "synced" | "syncing" | "pending_remote_sync" | "local_only_fallback"
  >;
  setHasPendingAutosave: SetState<boolean>;
  setHasPendingRemoteSync: SetState<boolean>;
  getUserId: () => Promise<string | null>;
  flushAutosave: () => Promise<boolean>;
  flushAndFreezeDraft: () => Promise<void>;
  refreshLocalDraftIndex: () => Promise<unknown>;
  ensureDraftIdentity: EnsureDraftIdentity;
  confirmDraftLease: (draftId: string) => string | null;
  applyReadOnlyConflict: (draftId: string) => Promise<void>;
  syncRemoteDraftState: SyncRemoteDraftState;
  markPendingRemoteSync: MarkPendingRemoteSync;
  clearPendingRemoteSync: ClearPendingRemoteSync;
  releaseDraftLock: (draftId?: string | null) => void;
  applyLocalPersistenceStatus: ApplyLocalPersistenceStatus;
};

export function useFormDraftCheckpoint({
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
  savingDraftRef,
  setSavingDraft,
  setDraftSavedAt,
  setLocalDraftSavedAt,
  setRemoteIdentityState,
  setRemoteSyncState,
  setHasPendingAutosave,
  setHasPendingRemoteSync,
  getUserId,
  flushAutosave,
  flushAndFreezeDraft,
  refreshLocalDraftIndex,
  ensureDraftIdentity,
  confirmDraftLease,
  applyReadOnlyConflict,
  syncRemoteDraftState,
  markPendingRemoteSync,
  clearPendingRemoteSync,
  releaseDraftLock,
  applyLocalPersistenceStatus,
}: CheckpointParams) {
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

      let effectiveDraftId = activeDraftId;

      try {
        const identityResult = await ensureDraftIdentity(step, data);
        effectiveDraftId = identityResult.draftId ?? effectiveDraftId;
        if (!identityResult.ok || !identityResult.draftId) {
          await markPendingRemoteSync(
            {
              slug,
              draftId: effectiveDraftId,
              sessionId: localDraftSessionId,
              step,
              data,
              empresaSnapshot: empresa,
              updatedAt:
                latestLocalDraftRef.current?.updatedAt ?? new Date().toISOString(),
              checkpointHash: hashSnapshot(step, data),
              reason,
            },
            identityResult.error ??
              "No se pudo preparar el borrador remoto antes del checkpoint."
          );

          return {
            ok: false,
            error: identityResult.error ?? "No se pudo preparar el borrador remoto.",
          };
        }

        const checkpointAt = new Date().toISOString();
        const checkpointHash = hashSnapshot(step, data);
        const userId = await getUserId();
        if (!userId) {
          return { ok: false, error: "No autenticado" };
        }
        const leaseId = confirmDraftLease(identityResult.draftId);
        if (!leaseId) {
          return {
            ok: false,
            error:
              "Este borrador cambió de pestaña activa antes de guardar. Vuelve a tomar el control si necesitas continuar.",
          };
        }

        const supabase = createClient();
        let updatedDraft: unknown;
        let error: unknown;

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

        const lockAfterWrite = confirmDraftLease(identityResult.draftId);
        if (!lockAfterWrite || lockAfterWrite !== leaseId) {
          await applyReadOnlyConflict(identityResult.draftId);
          return {
            ok: false,
            error:
              "Este borrador cambió de pestaña activa durante el guardado. Revisa la pestaña que tiene el control.",
          };
        }

        const savedDraftRow = (updatedDraft as DraftRow | null) ?? null;
        const remoteUpdatedAt =
          savedDraftRow?.updated_at ?? savedDraftRow?.created_at ?? checkpointAt;
        const nextStorageKey = getStorageKeyShared(
          slug,
          identityResult.draftId,
          localDraftSessionId
        );
        const saveResult = await saveLocalCopyShared(
          nextStorageKey,
          step,
          data,
          empresa,
          remoteUpdatedAt
        );
        applyLocalPersistenceStatus(saveResult);

        latestLocalDraftRef.current = {
          step,
          data,
          empresa,
          updatedAt: remoteUpdatedAt,
        };
        await clearPendingRemoteSync(nextStorageKey);
        setLocalDraftSavedAt(
          saveResult.updatedAt ? new Date(saveResult.updatedAt) : null
        );
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
            draftId: effectiveDraftId,
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

        if (!effectiveDraftId) {
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
      applyReadOnlyConflict,
      clearPendingRemoteSync,
      confirmDraftLease,
      editingAuthorityState,
      empresa,
      ensureDraftIdentity,
      flushAutosave,
      getUserId,
      localDraftSessionId,
      latestLocalDraftRef,
      markPendingRemoteSync,
      applyLocalPersistenceStatus,
      refreshLocalDraftIndex,
      setDraftSavedAt,
      setHasPendingAutosave,
      setLocalDraftSavedAt,
      setRemoteIdentityState,
      setRemoteSyncState,
      setSavingDraft,
      slug,
      syncRemoteDraftState,
    ]
  );

  const saveDraft = useCallback(
    (step: number, data: Record<string, unknown>) =>
      checkpointDraft(step, data, "manual"),
    [checkpointDraft]
  );

  const maybeAutomaticCheckpoint = useCallback(
    async (reason: Exclude<CheckpointDraftReason, "manual">) => {
      if (activeDraftId && editingAuthorityState === "read_only") {
        return;
      }

      if (!slug || !empresa?.nit_empresa) {
        return;
      }

      const localReadResult = await readLocalCopyShared(storageKeyRef.current);
      applyLocalPersistenceStatus(localReadResult);
      const payload = latestLocalDraftRef.current ?? localReadResult.draft;
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
    [
      activeDraftId,
      checkpointDraft,
      editingAuthorityState,
      empresa,
      lastCheckpointHashRef,
      lastCheckpointAtRef,
      latestLocalDraftRef,
      remoteUpdatedAtRef,
      slug,
      storageKeyRef,
      applyLocalPersistenceStatus,
    ]
  );

  const flushPendingCheckpoint = useCallback(async () => {
    if (shouldSkipPendingCheckpointFlush(editingAuthorityState, activeDraftId)) {
      return false;
    }

    const pendingResult = await readPendingCheckpoint(storageKeyRef.current);
    applyLocalPersistenceStatus(toLocalPersistenceStatus(pendingResult));
    const pending = pendingResult.value;
    const nextPendingSyncState = resolvePendingCheckpointRemoteSyncState({
      hasPendingSnapshot: Boolean(pending),
      currentRemoteSyncState: "synced",
    });

    if (!pending) {
      setHasPendingRemoteSync(nextPendingSyncState.hasPendingRemoteSync);
      setRemoteSyncState((current) =>
        resolvePendingCheckpointRemoteSyncState({
          hasPendingSnapshot: false,
          currentRemoteSyncState: current,
        }).remoteSyncState
      );
      return false;
    }

    setHasPendingRemoteSync(nextPendingSyncState.hasPendingRemoteSync);
    setRemoteSyncState(nextPendingSyncState.remoteSyncState);
    const result = await checkpointDraft(
      pending.step,
      pending.data,
      normalizePendingCheckpointReason(pending.reason)
    );

    return result.ok;
  }, [
    activeDraftId,
    checkpointDraft,
    editingAuthorityState,
    applyLocalPersistenceStatus,
    setHasPendingRemoteSync,
    setRemoteSyncState,
    storageKeyRef,
  ]);

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
    const hasPendingAutosaveSnapshot = hasPendingAutosaveRef;

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

      if (hasPendingAutosaveSnapshot.current) {
        void flushAndFreezeDraft();
      }

      releaseDraftLock();
    };
  }, [
    flushAndFreezeDraft,
    flushAutosave,
    hasPendingAutosaveRef,
    maybeAutomaticCheckpoint,
    releaseDraftLock,
    savingDraftRef,
  ]);

  useEffect(() => {
    if (!storageKeyRef.current || !slug) {
      return;
    }

    void (async () => {
      const pendingResult = await readPendingCheckpoint(storageKeyRef.current);
      applyLocalPersistenceStatus(toLocalPersistenceStatus(pendingResult));
      const pending = pendingResult.value;
      const nextPendingSyncState = resolvePendingCheckpointRemoteSyncState({
        hasPendingSnapshot: Boolean(pending),
        currentRemoteSyncState: "synced",
      });
      setHasPendingRemoteSync(nextPendingSyncState.hasPendingRemoteSync);
      setRemoteSyncState((current) =>
        resolvePendingCheckpointRemoteSyncState({
          hasPendingSnapshot: Boolean(pending),
          currentRemoteSyncState: current,
        }).remoteSyncState
      );
    })();
  }, [
    applyLocalPersistenceStatus,
    setHasPendingRemoteSync,
    setRemoteSyncState,
    slug,
    storageKeyRef,
  ]);

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
    checkpointDraft,
    saveDraft,
  };
}
