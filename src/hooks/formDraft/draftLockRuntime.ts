import { isDraftLockExpired, type DraftLock } from "@/lib/draftLocks";
import type { DraftLockConflict } from "./shared";

type BuildDraftLockConflictParams = {
  draftId: string;
  lock: DraftLock | null;
  now?: string;
};

type PlanDraftLockClaimParams = {
  draftId: string;
  currentLock: DraftLock | null;
  currentLeaseId: string | null;
  tabId: string;
  slug?: string | null;
  forceTakeOver?: boolean;
  now?: string;
  createLeaseId: () => string;
};

type ResolveDraftLockAuthorityParams = {
  draftId: string;
  resolvedLock: DraftLock | null;
  tabId: string;
  currentLeaseId: string | null;
  expectedLeaseId: string | null;
  now?: string;
};

type ConfirmDraftLeaseParams = {
  currentLock: DraftLock | null;
  tabId: string;
  leaseId: string | null;
};

export type DraftLockClaimPlan = {
  shouldWrite: boolean;
  nextLock: DraftLock | null;
  expectedLeaseId: string | null;
};

export type DraftLockAuthorityResolution = {
  hasAuthority: boolean;
  leaseId: string | null;
  conflict: DraftLockConflict | null;
};

export function buildDraftLockConflict({
  draftId,
  lock,
  now = new Date().toISOString(),
}: BuildDraftLockConflictParams): DraftLockConflict {
  return {
    draftId,
    ownerTabId: lock?.ownerTabId ?? "",
    ownerSeenAt: lock?.heartbeatAt ?? now,
    canTakeOver: true,
  };
}

export function doesDraftLockBelongToTab(
  lock: DraftLock | null,
  tabId: string,
  leaseId: string | null
) {
  return Boolean(
    lock && leaseId && lock.ownerTabId === tabId && lock.leaseId === leaseId
  );
}

export function planDraftLockClaim({
  draftId,
  currentLock,
  currentLeaseId,
  tabId,
  slug,
  forceTakeOver = false,
  now = new Date().toISOString(),
  createLeaseId,
}: PlanDraftLockClaimParams): DraftLockClaimPlan {
  const shouldTryAcquire =
    forceTakeOver ||
    !currentLock ||
    isDraftLockExpired(currentLock) ||
    doesDraftLockBelongToTab(currentLock, tabId, currentLeaseId);

  if (!shouldTryAcquire) {
    return {
      shouldWrite: false,
      nextLock: null,
      expectedLeaseId: currentLeaseId,
    };
  }

  const expectedLeaseId =
    forceTakeOver || !currentLeaseId ? createLeaseId() : currentLeaseId;

  return {
    shouldWrite: true,
    expectedLeaseId,
    nextLock: {
      draftId,
      ownerTabId: tabId,
      leaseId: expectedLeaseId,
      acquiredAt:
        doesDraftLockBelongToTab(currentLock, tabId, currentLeaseId) &&
        !forceTakeOver
          ? currentLock?.acquiredAt ?? now
          : now,
      heartbeatAt: now,
      formSlug: slug ?? "",
    },
  };
}

export function resolveDraftLockAuthority({
  draftId,
  resolvedLock,
  tabId,
  currentLeaseId,
  expectedLeaseId,
  now,
}: ResolveDraftLockAuthorityParams): DraftLockAuthorityResolution {
  const leaseId = expectedLeaseId ?? currentLeaseId;

  if (doesDraftLockBelongToTab(resolvedLock, tabId, leaseId)) {
    return {
      hasAuthority: true,
      leaseId,
      conflict: null,
    };
  }

  return {
    hasAuthority: false,
    leaseId: null,
    conflict: buildDraftLockConflict({
      draftId,
      lock: resolvedLock,
      now,
    }),
  };
}

export function confirmDraftLease({
  currentLock,
  tabId,
  leaseId,
}: ConfirmDraftLeaseParams) {
  return doesDraftLockBelongToTab(currentLock, tabId, leaseId) ? leaseId : null;
}
