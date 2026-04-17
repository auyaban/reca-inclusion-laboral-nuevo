import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { reportFinalizationUiLockSuppressedMock } = vi.hoisted(() => ({
  reportFinalizationUiLockSuppressedMock: vi.fn(),
}));

vi.mock("@/lib/observability/finalization", () => ({
  reportFinalizationUiLockSuppressed: reportFinalizationUiLockSuppressedMock,
}));

import {
  beginFinalizationUiLock,
  clearFinalizationUiLock,
  FINALIZATION_UI_LOCK_TTL_MS,
  isFinalizationUiLockActive,
  shouldSuppressDraftNavigationWhileFinalizing,
} from "@/lib/finalization/finalizationUiLock";

type MockStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
};

function createStorage(): MockStorage {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
}

describe("finalizationUiLock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T12:00:00.000Z"));
    vi.stubGlobal("window", {
      location: {
        pathname: "/formularios/presentacion",
        search: "?session=abc",
      },
      sessionStorage: createStorage(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("stores and clears a durable UI lock", () => {
    expect(isFinalizationUiLockActive("presentacion")).toBe(false);

    beginFinalizationUiLock("presentacion");
    expect(isFinalizationUiLockActive("presentacion")).toBe(true);

    clearFinalizationUiLock("presentacion");
    expect(isFinalizationUiLockActive("presentacion")).toBe(false);
  });

  it("expires stale locks and clears the stored payload", () => {
    beginFinalizationUiLock("presentacion");
    expect(isFinalizationUiLockActive("presentacion")).toBe(true);

    vi.advanceTimersByTime(FINALIZATION_UI_LOCK_TTL_MS + 1);

    expect(isFinalizationUiLockActive("presentacion")).toBe(false);
    expect(window.sessionStorage.getItem("reca:finalization-ui-lock:presentacion")).toBeNull();
  });

  it("suppresses draft navigation and reports observability while the lock is active", () => {
    beginFinalizationUiLock("presentacion");

    expect(
      shouldSuppressDraftNavigationWhileFinalizing(
        "presentacion",
        "session_to_draft_promotion"
      )
    ).toBe(true);
    expect(reportFinalizationUiLockSuppressedMock).toHaveBeenCalledWith({
      formSlug: "presentacion",
      reason: "session_to_draft_promotion",
      currentRoute: "/formularios/presentacion?session=abc",
    });
  });

  it("does not break when sessionStorage is unavailable", () => {
    vi.unstubAllGlobals();

    expect(() => beginFinalizationUiLock("presentacion")).not.toThrow();
    expect(isFinalizationUiLockActive("presentacion")).toBe(false);
    expect(
      shouldSuppressDraftNavigationWhileFinalizing(
        "presentacion",
        "save_draft_redirect"
      )
    ).toBe(false);
  });
});
