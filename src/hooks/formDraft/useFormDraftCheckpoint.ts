"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { toLocalPersistenceStatus } from "@/lib/draftStorage";
import {
  resolveHasLocalDirtyChanges,
  shouldPersistSnapshot,
} from "@/lib/draftSnapshot";
import { createClient } from "@/lib/supabase/client";
import { emitDraftsChanged } from "@/lib/draftEvents";
import { readPendingCheckpoint } from "@/lib/draftStorage";
import {
  buildDraftSnapshotHash as buildDraftSnapshotHashShared,
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
  registerAutomaticCheckpointInterval,
  registerCheckpointExitHandlers,
  registerPendingCheckpointRecoveryHandlers,
  normalizePendingCheckpointReason,
  resolvePendingCheckpointRemoteSyncState,
  shouldSkipPendingCheckpointFlush,
} from "./draftCheckpointRuntime";

const MANUAL_SAVE_TIMEOUT_MS = 15_000;

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
  hasLocalDirtyChangesRef: MutableRefObject<boolean>;
  hasPendingRemoteSyncRef: MutableRefObject<boolean>;
  remoteSyncStateRef: MutableRefObject<
    "synced" | "syncing" | "pending_remote_sync" | "local_only_fallback"
  >;
  savingDraftRef: MutableRefObject<boolean>;
  manualSaveInFlightRef: MutableRefObject<boolean>;
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
  setHasLocalDirtyChanges: SetState<boolean>;
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
  const flushAutosaveForExitRef = useRef(flushAutosave);
  const flushAndFreezeDraftForExitRef = useRef(flushAndFreezeDraft);
  const releaseDraftLockForExitRef = useRef(releaseDraftLock);

  const checkpointDraft = useCallback(
    async (
      step: number,
      data: Record<string, unknown>,
      reason: CheckpointDraftReason
    ): Promise<CheckpointDraftResult> => {
      if (reason === "manual" && manualSaveInFlightRef.current) {
        return {
          ok: false,
          error:
            "Ya hay un guardado en curso. Espera un momento antes de intentar de nuevo.",
        };
      }

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

      if (reason !== "manual") {
        const canPersistWithoutCheckpoint =
          Boolean(activeDraftId) ||
          Boolean(lastCheckpointHashRef.current) ||
          shouldPersistSnapshot({
            slug,
            data,
            empresa,
          });

        if (!canPersistWithoutCheckpoint) {
          setRemoteSyncState("synced");
          setHasLocalDirtyChanges(false);
          return { ok: true, draftId: activeDraftId ?? undefined };
        }
      }

      if (reason === "manual") {
        manualSaveInFlightRef.current = true;
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

      const preflightStorageKey = storageKeyRef.current;
      if (preflightStorageKey) {
        const preflightLocalSave = await saveLocalCopyShared(
          preflightStorageKey,
          step,
          data,
          empresa,
          latestLocalDraftRef.current.updatedAt,
          {
            sessionIdOverride: localDraftSessionId,
          }
        );
        applyLocalPersistenceStatus(preflightLocalSave);

        if (preflightLocalSave.updatedAt) {
          latestLocalDraftRef.current = {
            step,
            data,
            empresa,
            updatedAt: preflightLocalSave.updatedAt,
          };
          setLocalDraftSavedAt(new Date(preflightLocalSave.updatedAt));
          void refreshLocalDraftIndex();
        }
      }

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
              checkpointHash: buildDraftSnapshotHashShared(step, data),
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
        const checkpointHash = buildDraftSnapshotHashShared(step, data);
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
          remoteUpdatedAt,
          {
            sessionIdOverride: localDraftSessionId,
          }
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
        setHasLocalDirtyChanges(false);
        setDraftSavedAt(new Date(remoteUpdatedAt));
        emitDraftsChanged({ localChanged: true, remoteChanged: true });

        return {
          ok: true,
          draftId: identityResult.draftId,
        };
      } catch (error) {
        const checkpointHash = buildDraftSnapshotHashShared(step, data);
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

        setHasLocalDirtyChanges(
          resolveHasLocalDirtyChanges({
            slug,
            step,
            data,
            empresa,
            lastCheckpointHash: lastCheckpointHashRef.current,
          })
        );

        return {
          ok: false,
          error: getErrorMessageShared(error, "No se pudo guardar el borrador."),
        };
      } finally {
        if (reason === "manual") {
          manualSaveInFlightRef.current = false;
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
      lastCheckpointHashRef,
      localDraftSessionId,
      latestLocalDraftRef,
      markPendingRemoteSync,
      manualSaveInFlightRef,
      applyLocalPersistenceStatus,
      refreshLocalDraftIndex,
      setDraftSavedAt,
      setHasPendingAutosave,
      setHasLocalDirtyChanges,
      setLocalDraftSavedAt,
      setRemoteIdentityState,
      setRemoteSyncState,
      setSavingDraft,
      slug,
      storageKeyRef,
      syncRemoteDraftState,
    ]
  );

  const saveDraft = useCallback(
    async (step: number, data: Record<string, unknown>) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let timedOut = false;

      const timeoutPromise = new Promise<CheckpointDraftResult>((resolve) => {
        timeoutId = globalThis.setTimeout(() => {
          timedOut = true;
          setSavingDraft(false);
          setHasPendingRemoteSync(true);
          setRemoteSyncState("pending_remote_sync");
          setHasLocalDirtyChanges(
            resolveHasLocalDirtyChanges({
              slug,
              step,
              data,
              empresa,
              lastCheckpointHash: lastCheckpointHashRef.current,
            })
          );
          resolve({
            ok: true,
            draftId: activeDraftId ?? undefined,
          });
        }, MANUAL_SAVE_TIMEOUT_MS);
      });

      const savePromise = checkpointDraft(step, data, "manual");
      const result = await Promise.race([savePromise, timeoutPromise]);

      if (timeoutId) {
        globalThis.clearTimeout(timeoutId);
      }

      if (timedOut) {
        void savePromise.catch(() => {
          // El guardado real puede completarse despuÃ©s del timeout visible.
        });
      }

      return result;
    },
    [
      activeDraftId,
      checkpointDraft,
      empresa,
      lastCheckpointHashRef,
      setHasLocalDirtyChanges,
      setHasPendingRemoteSync,
      setRemoteSyncState,
      setSavingDraft,
      slug,
    ]
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

      const canPersistWithoutCheckpoint =
        Boolean(activeDraftId) ||
        Boolean(lastCheckpointHashRef.current) ||
        shouldPersistSnapshot({
          slug,
          data: payload.data,
          empresa: payload.empresa,
        });
      if (!canPersistWithoutCheckpoint) {
        return;
      }

      const nextHash = buildDraftSnapshotHashShared(payload.step, payload.data);
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

  const maybeAutomaticCheckpointForExitRef = useRef(maybeAutomaticCheckpoint);

  useEffect(() => {
    flushAutosaveForExitRef.current = flushAutosave;
  }, [flushAutosave]);

  useEffect(() => {
    flushAndFreezeDraftForExitRef.current = flushAndFreezeDraft;
  }, [flushAndFreezeDraft]);

  useEffect(() => {
    releaseDraftLockForExitRef.current = releaseDraftLock;
  }, [releaseDraftLock]);

  useEffect(() => {
    maybeAutomaticCheckpointForExitRef.current = maybeAutomaticCheckpoint;
  }, [maybeAutomaticCheckpoint]);

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
    return registerAutomaticCheckpointInterval({
      enabled: Boolean(slug && empresa?.nit_empresa),
      browser: window,
      onInterval: () => maybeAutomaticCheckpoint("interval"),
    });
  }, [empresa?.nit_empresa, maybeAutomaticCheckpoint, slug]);

  useEffect(() => {
    return registerCheckpointExitHandlers({
      browser: window,
      documentObject: document,
      flushAutosave: () => flushAutosaveForExitRef.current(),
      runAutomaticCheckpoint: (reason) =>
        maybeAutomaticCheckpointForExitRef.current(reason),
      releaseDraftLock: () => releaseDraftLockForExitRef.current(),
      flushAndFreezeDraft: () => flushAndFreezeDraftForExitRef.current(),
      hasPendingAutosaveRef,
      hasLocalDirtyChangesRef,
      hasPendingRemoteSyncRef,
      remoteSyncStateRef,
      savingDraftRef,
    });
  }, [
    hasPendingAutosaveRef,
    hasLocalDirtyChangesRef,
    hasPendingRemoteSyncRef,
    remoteSyncStateRef,
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
      setHasLocalDirtyChanges(Boolean(pending));
    })();
  }, [
    applyLocalPersistenceStatus,
    setHasLocalDirtyChanges,
    setHasPendingRemoteSync,
    setRemoteSyncState,
    slug,
    storageKeyRef,
  ]);

  useEffect(() => {
    return registerPendingCheckpointRecoveryHandlers({
      browser: window,
      documentObject: document,
      flushPendingCheckpoint,
    });
  }, [flushPendingCheckpoint]);

  return {
    checkpointDraft,
    saveDraft,
  };
}
