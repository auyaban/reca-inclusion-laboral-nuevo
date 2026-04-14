"use client";

import { useCallback, useEffect } from "react";
import type { MutableRefObject } from "react";
import {
  DRAFT_LOCK_CHANNEL_NAME,
  DRAFT_LOCK_HEARTBEAT_MS,
  DRAFT_LOCK_RECONCILE_MS,
  type DraftLock,
  getDraftLockKey,
  readDraftLock,
  removeDraftLock,
  writeDraftLock,
} from "@/lib/draftLocks";
import {
  createSessionId,
  isRecord,
  type DraftLockConflict,
  type EditingAuthorityState,
  type IntervalRef,
  type SetState,
} from "./shared";
import {
  buildDraftLockConflict,
  confirmDraftLease as confirmOwnedDraftLease,
  planDraftLockClaim,
  resolveDraftLockAuthority,
} from "./draftLockRuntime";

type LockParams = {
  slug?: string | null;
  activeDraftId: string | null;
  editingAuthorityState: EditingAuthorityState;
  setEditingAuthorityState: SetState<EditingAuthorityState>;
  setLockConflict: SetState<DraftLockConflict | null>;
  tabIdRef: MutableRefObject<string>;
  lockLeaseIdRef: MutableRefObject<string | null>;
  lockChannelRef: MutableRefObject<BroadcastChannel | null>;
  lockHeartbeatIntervalRef: IntervalRef;
  lockReconcileIntervalRef: IntervalRef;
  flushAndFreezeDraft: () => Promise<void>;
};

export function useFormDraftLock({
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
}: LockParams) {
  const stopDraftLockIntervals = useCallback(() => {
    if (lockHeartbeatIntervalRef.current) {
      clearInterval(lockHeartbeatIntervalRef.current);
      lockHeartbeatIntervalRef.current = null;
    }

    if (lockReconcileIntervalRef.current) {
      clearInterval(lockReconcileIntervalRef.current);
      lockReconcileIntervalRef.current = null;
    }
  }, [lockHeartbeatIntervalRef, lockReconcileIntervalRef]);

  const broadcastDraftLockEvent = useCallback(
    (draftId: string, type: "changed" | "released") => {
      lockChannelRef.current?.postMessage({
        type,
        draftId,
        sourceTabId: tabIdRef.current,
      });
    },
    [lockChannelRef, tabIdRef]
  );

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
    [
      activeDraftId,
      broadcastDraftLockEvent,
      lockLeaseIdRef,
      stopDraftLockIntervals,
      tabIdRef,
    ]
  );

  const applyReadOnlyConflict = useCallback(
    async (draftId: string, conflict?: DraftLockConflict | null) => {
      await flushAndFreezeDraft();
      lockLeaseIdRef.current = null;
      setEditingAuthorityState("read_only");
      setLockConflict(
        conflict ??
          buildDraftLockConflict({
            draftId,
            lock: readDraftLock(draftId),
          })
      );
    },
    [
      flushAndFreezeDraft,
      lockLeaseIdRef,
      setEditingAuthorityState,
      setLockConflict,
    ]
  );

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
          if (!currentLock) {
            void applyReadOnlyConflict(draftId);
            if (lockHeartbeatIntervalRef.current) {
              clearInterval(lockHeartbeatIntervalRef.current);
              lockHeartbeatIntervalRef.current = null;
            }
            return;
          }

          if (
            !confirmOwnedDraftLease({
              currentLock,
              tabId: tabIdRef.current,
              leaseId: currentLeaseId,
            })
          ) {
            void applyReadOnlyConflict(draftId);
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
    [
      applyReadOnlyConflict,
      broadcastDraftLockEvent,
      lockHeartbeatIntervalRef,
      lockLeaseIdRef,
      setEditingAuthorityState,
      setLockConflict,
      tabIdRef,
    ]
  );

  const reconcileDraftAuthority = useCallback(
    (draftId: string, options?: { forceTakeOver?: boolean }) => {
      const currentLock = readDraftLock(draftId);
      const currentLeaseId = lockLeaseIdRef.current;
      const claimPlan = planDraftLockClaim({
        draftId,
        currentLock,
        currentLeaseId,
        tabId: tabIdRef.current,
        slug,
        forceTakeOver: options?.forceTakeOver,
        createLeaseId: createSessionId,
      });

      if (claimPlan.shouldWrite && claimPlan.nextLock) {
        writeDraftLock(claimPlan.nextLock);
        broadcastDraftLockEvent(draftId, "changed");
      }

      const resolvedLock = readDraftLock(draftId);
      const resolution = resolveDraftLockAuthority({
        draftId,
        resolvedLock,
        tabId: tabIdRef.current,
        currentLeaseId,
        expectedLeaseId: claimPlan.expectedLeaseId,
      });

      if (resolution.hasAuthority && resolvedLock) {
        claimEditorAuthority(draftId, resolvedLock);
        return true;
      }

      void applyReadOnlyConflict(draftId, resolution.conflict);
      return false;
    },
    [
      applyReadOnlyConflict,
      broadcastDraftLockEvent,
      claimEditorAuthority,
      lockLeaseIdRef,
      slug,
      tabIdRef,
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

      const confirmedLease = confirmOwnedDraftLease({
        currentLock: readDraftLock(draftId),
        tabId: tabIdRef.current,
        leaseId: lockLeaseIdRef.current,
      });

      if (!confirmedLease) {
        void applyReadOnlyConflict(draftId);
        return null;
      }

      return confirmedLease;
    },
    [applyReadOnlyConflict, lockLeaseIdRef, reconcileDraftAuthority, tabIdRef]
  );

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
  }, [lockChannelRef]);

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
      if (
        !isRecord(event.data) ||
        event.data.draftId !== activeDraftId ||
        event.data.sourceTabId === tabIdRef.current
      ) {
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
  }, [
    activeDraftId,
    lockChannelRef,
    lockLeaseIdRef,
    lockReconcileIntervalRef,
    reconcileDraftAuthority,
    releaseDraftLock,
    setEditingAuthorityState,
    setLockConflict,
    stopDraftLockIntervals,
    tabIdRef,
  ]);

  const isDraftEditable = !activeDraftId || editingAuthorityState === "editor";

  return {
    isDraftEditable,
    takeOverDraft,
    releaseDraftLock,
    confirmDraftLease,
    applyReadOnlyConflict,
  };
}
