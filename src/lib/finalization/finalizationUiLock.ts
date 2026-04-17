"use client";

import {
  reportFinalizationUiLockSuppressed,
  type FinalizationUiLockSuppressionReason,
} from "@/lib/observability/finalization";

const FINALIZATION_UI_LOCK_STORAGE_PREFIX = "reca:finalization-ui-lock:";
const FINALIZATION_UI_LOCK_VERSION = 1;

export const FINALIZATION_UI_LOCK_TTL_MS = 10 * 60 * 1000;

type FinalizationUiLockPayload = {
  version: number;
  formSlug: string;
  startedAt: number;
};

function getLockKey(formSlug: string) {
  return `${FINALIZATION_UI_LOCK_STORAGE_PREFIX}${formSlug}`;
}

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function clearStoredLock(formSlug: string) {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(getLockKey(formSlug));
  } catch {
    // Ignore storage cleanup failures and treat the lock as cleared for UX purposes.
  }
}

function readFinalizationUiLock(
  formSlug: string
): FinalizationUiLockPayload | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  let rawValue: string | null = null;

  try {
    rawValue = storage.getItem(getLockKey(formSlug));
  } catch {
    return null;
  }

  if (!rawValue) {
    return null;
  }

  try {
    const payload = JSON.parse(rawValue) as Partial<FinalizationUiLockPayload>;
    const startedAt =
      typeof payload.startedAt === "number" && Number.isFinite(payload.startedAt)
        ? payload.startedAt
        : null;
    const version =
      typeof payload.version === "number" && Number.isFinite(payload.version)
        ? payload.version
        : null;

    if (
      payload.formSlug !== formSlug ||
      startedAt === null ||
      version !== FINALIZATION_UI_LOCK_VERSION
    ) {
      clearStoredLock(formSlug);
      return null;
    }

    if (Date.now() - startedAt > FINALIZATION_UI_LOCK_TTL_MS) {
      clearStoredLock(formSlug);
      return null;
    }

    return {
      version,
      formSlug,
      startedAt,
    };
  } catch {
    clearStoredLock(formSlug);
    return null;
  }
}

export function beginFinalizationUiLock(formSlug: string) {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      getLockKey(formSlug),
      JSON.stringify({
        version: FINALIZATION_UI_LOCK_VERSION,
        formSlug,
        startedAt: Date.now(),
      } satisfies FinalizationUiLockPayload)
    );
  } catch {
    // Ignore storage write failures. The lifecycle guard will still rely on local state.
  }
}

export function isFinalizationUiLockActive(formSlug: string) {
  return readFinalizationUiLock(formSlug) !== null;
}

export function clearFinalizationUiLock(formSlug: string) {
  clearStoredLock(formSlug);
}

export function shouldSuppressDraftNavigationWhileFinalizing(
  formSlug: string,
  reason: FinalizationUiLockSuppressionReason
) {
  if (!isFinalizationUiLockActive(formSlug)) {
    return false;
  }

  const currentRoute =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : null;

  reportFinalizationUiLockSuppressed({
    formSlug,
    reason,
    currentRoute,
  });

  return true;
}
