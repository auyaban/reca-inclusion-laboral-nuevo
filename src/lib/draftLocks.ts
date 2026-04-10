"use client";

export type DraftLock = {
  draftId: string;
  ownerTabId: string;
  leaseId: string;
  acquiredAt: string;
  heartbeatAt: string;
  formSlug: string;
};

export type DraftLockStatus = {
  draftId: string;
  lock: DraftLock | null;
  isExpired: boolean;
  isActive: boolean;
};

export const DRAFT_LOCK_PREFIX = "draft_lock__";
export const DRAFT_LOCK_CHANNEL_NAME = "draft-locks";
export const DRAFT_LOCK_HEARTBEAT_MS = 10_000;
export const DRAFT_LOCK_STALE_MS = 30_000;
export const DRAFT_LOCK_RECONCILE_MS = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getTimestampValue(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function getDraftLockKey(draftId: string) {
  return `${DRAFT_LOCK_PREFIX}${draftId}`;
}

export function parseDraftLock(value: unknown): DraftLock | null {
  if (!isRecord(value)) {
    return null;
  }

  const draftId =
    typeof value.draftId === "string" && value.draftId.trim()
      ? value.draftId
      : null;
  const ownerTabId =
    typeof value.ownerTabId === "string" && value.ownerTabId.trim()
      ? value.ownerTabId
      : null;
  const leaseId =
    typeof value.leaseId === "string" && value.leaseId.trim()
      ? value.leaseId
      : null;
  const acquiredAt =
    typeof value.acquiredAt === "string" && value.acquiredAt.trim()
      ? value.acquiredAt
      : null;
  const heartbeatAt =
    typeof value.heartbeatAt === "string" && value.heartbeatAt.trim()
      ? value.heartbeatAt
      : null;
  const formSlug =
    typeof value.formSlug === "string" && value.formSlug.trim()
      ? value.formSlug
      : null;

  if (!draftId || !ownerTabId || !leaseId || !acquiredAt || !heartbeatAt || !formSlug) {
    return null;
  }

  return {
    draftId,
    ownerTabId,
    leaseId,
    acquiredAt,
    heartbeatAt,
    formSlug,
  };
}

export function readDraftLock(draftId: string): DraftLock | null {
  try {
    const raw = localStorage.getItem(getDraftLockKey(draftId));
    if (!raw) {
      return null;
    }

    return parseDraftLock(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeDraftLock(lock: DraftLock) {
  try {
    localStorage.setItem(getDraftLockKey(lock.draftId), JSON.stringify(lock));
  } catch {
    // localStorage no disponible
  }
}

export function removeDraftLock(draftId: string) {
  try {
    localStorage.removeItem(getDraftLockKey(draftId));
  } catch {
    // localStorage no disponible
  }
}

export function isDraftLockExpired(lock: DraftLock | null) {
  if (!lock) {
    return true;
  }

  return Date.now() - getTimestampValue(lock.heartbeatAt) > DRAFT_LOCK_STALE_MS;
}

export function getDraftLockStatus(draftId: string): DraftLockStatus {
  const lock = readDraftLock(draftId);
  const isExpired = isDraftLockExpired(lock);

  return {
    draftId,
    lock,
    isExpired,
    isActive: Boolean(lock) && !isExpired,
  };
}
