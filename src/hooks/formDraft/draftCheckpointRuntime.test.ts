import { describe, expect, it, vi } from "vitest";
import {
  AUTOMATIC_CHECKPOINT_INTERVAL_MS,
  normalizePendingCheckpointReason,
  registerAutomaticCheckpointInterval,
  registerCheckpointExitHandlers,
  registerPendingCheckpointRecoveryHandlers,
  resolvePendingCheckpointRemoteSyncState,
  shouldBlockBeforeUnload,
  shouldSkipPendingCheckpointFlush,
} from "./draftCheckpointRuntime";

describe("draftCheckpointRuntime", () => {
  it("skips pending flush when the active draft is read only", () => {
    expect(shouldSkipPendingCheckpointFlush("read_only", "draft-1")).toBe(true);
    expect(shouldSkipPendingCheckpointFlush("editor", "draft-1")).toBe(false);
    expect(shouldSkipPendingCheckpointFlush("read_only", null)).toBe(false);
  });

  it("normalizes retry pending reasons to interval", () => {
    expect(normalizePendingCheckpointReason("retry")).toBe("interval");
    expect(normalizePendingCheckpointReason("manual")).toBe("manual");
  });

  it("returns synced when there is no pending snapshot unless fallback must be preserved", () => {
    expect(
      resolvePendingCheckpointRemoteSyncState({
        hasPendingSnapshot: false,
        currentRemoteSyncState: "synced",
      })
    ).toEqual({
      hasPendingRemoteSync: false,
      remoteSyncState: "synced",
    });

    expect(
      resolvePendingCheckpointRemoteSyncState({
        hasPendingSnapshot: false,
        currentRemoteSyncState: "local_only_fallback",
      })
    ).toEqual({
      hasPendingRemoteSync: false,
      remoteSyncState: "local_only_fallback",
    });
  });

  it("forces pending_remote_sync when a pending snapshot exists", () => {
    expect(
      resolvePendingCheckpointRemoteSyncState({
        hasPendingSnapshot: true,
        currentRemoteSyncState: "synced",
      })
    ).toEqual({
      hasPendingRemoteSync: true,
      remoteSyncState: "pending_remote_sync",
    });
  });

  it("blocks beforeunload for every unsynchronized draft state", () => {
    expect(
      shouldBlockBeforeUnload({
        hasPendingAutosave: true,
        hasLocalDirtyChanges: false,
        savingDraft: false,
        hasPendingRemoteSync: false,
        remoteSyncState: "synced",
      })
    ).toBe(true);

    expect(
      shouldBlockBeforeUnload({
        hasPendingAutosave: false,
        hasLocalDirtyChanges: true,
        savingDraft: false,
        hasPendingRemoteSync: false,
        remoteSyncState: "synced",
      })
    ).toBe(true);

    expect(
      shouldBlockBeforeUnload({
        hasPendingAutosave: false,
        hasLocalDirtyChanges: false,
        savingDraft: false,
        hasPendingRemoteSync: true,
        remoteSyncState: "synced",
      })
    ).toBe(true);

    expect(
      shouldBlockBeforeUnload({
        hasPendingAutosave: false,
        hasLocalDirtyChanges: false,
        savingDraft: false,
        hasPendingRemoteSync: false,
        remoteSyncState: "pending_remote_sync",
      })
    ).toBe(true);

    expect(
      shouldBlockBeforeUnload({
        hasPendingAutosave: false,
        hasLocalDirtyChanges: false,
        savingDraft: false,
        hasPendingRemoteSync: false,
        remoteSyncState: "local_only_fallback",
      })
    ).toBe(true);
  });

  it("does not block beforeunload when the draft is fully synchronized", () => {
    expect(
      shouldBlockBeforeUnload({
        hasPendingAutosave: false,
        hasLocalDirtyChanges: false,
        savingDraft: false,
        hasPendingRemoteSync: false,
        remoteSyncState: "synced",
      })
    ).toBe(false);
  });

  it("registers the automatic checkpoint interval and clears it on cleanup", () => {
    const setInterval = vi.fn().mockReturnValue(42);
    const clearInterval = vi.fn();
    const onInterval = vi.fn();

    const cleanup = registerAutomaticCheckpointInterval({
      enabled: true,
      browser: { setInterval, clearInterval },
      onInterval,
    });

    expect(setInterval).toHaveBeenCalledWith(
      expect.any(Function),
      AUTOMATIC_CHECKPOINT_INTERVAL_MS
    );

    const intervalHandler = setInterval.mock.calls[0]?.[0] as (() => void) | undefined;
    intervalHandler?.();
    expect(onInterval).toHaveBeenCalledOnce();

    cleanup();
    expect(clearInterval).toHaveBeenCalledWith(42);
  });

  it("wires exit handlers for pagehide, hidden visibility and beforeunload", () => {
    const windowListeners = new Map<string, EventListener>();
    const documentListeners = new Map<string, EventListener>();
    const browser = {
      addEventListener: ((type: string, listener: EventListener) => {
        windowListeners.set(type, listener);
      }) as Window["addEventListener"],
      removeEventListener: ((type: string) => {
        windowListeners.delete(type);
      }) as Window["removeEventListener"],
    };
    const documentObject = {
      visibilityState: "visible" as Document["visibilityState"],
      addEventListener: ((type: string, listener: EventListener) => {
        documentListeners.set(type, listener);
      }) as Document["addEventListener"],
      removeEventListener: ((type: string) => {
        documentListeners.delete(type);
      }) as Document["removeEventListener"],
    };
    const flushAutosave = vi.fn();
    const runAutomaticCheckpoint = vi.fn();
    const releaseDraftLock = vi.fn();
    const flushAndFreezeDraft = vi.fn();
    const hasPendingAutosaveRef = { current: true };
    const savingDraftRef = { current: false };

    const cleanup = registerCheckpointExitHandlers({
      browser,
      documentObject,
      flushAutosave,
      runAutomaticCheckpoint,
      releaseDraftLock,
      flushAndFreezeDraft,
      hasPendingAutosaveRef,
      hasLocalDirtyChangesRef: { current: false },
      savingDraftRef,
      hasPendingRemoteSyncRef: { current: false },
      remoteSyncStateRef: { current: "synced" },
      draftLifecycleSuspendedRef: { current: false },
    });

    (windowListeners.get("pagehide") as (() => void) | undefined)?.();
    expect(flushAutosave).toHaveBeenCalledOnce();
    expect(runAutomaticCheckpoint).toHaveBeenCalledWith("pagehide");
    expect(releaseDraftLock).toHaveBeenCalledOnce();

    documentObject.visibilityState = "hidden";
    (documentListeners.get("visibilitychange") as (() => void) | undefined)?.();
    expect(flushAutosave).toHaveBeenCalledTimes(2);
    expect(runAutomaticCheckpoint).toHaveBeenCalledWith("visibilitychange");

    const beforeUnloadEvent = {
      preventDefault: vi.fn(),
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent;
    (
      windowListeners.get("beforeunload") as
        | ((event: BeforeUnloadEvent) => void)
        | undefined
    )?.(beforeUnloadEvent);
    expect(beforeUnloadEvent.preventDefault).toHaveBeenCalledOnce();
    expect(beforeUnloadEvent.returnValue).toBe("");

    cleanup();
    expect(flushAndFreezeDraft).toHaveBeenCalledOnce();
    expect(releaseDraftLock).toHaveBeenCalledTimes(2);
    expect(windowListeners.size).toBe(0);
    expect(documentListeners.size).toBe(0);
  });

  it("skips beforeunload blocking and freeze cleanup when there is no pending work", () => {
    const windowListeners = new Map<string, EventListener>();
    const documentListeners = new Map<string, EventListener>();
    const cleanup = registerCheckpointExitHandlers({
      browser: {
        addEventListener: ((type: string, listener: EventListener) => {
          windowListeners.set(type, listener);
        }) as Window["addEventListener"],
        removeEventListener: ((type: string) => {
          windowListeners.delete(type);
        }) as Window["removeEventListener"],
      },
      documentObject: {
        visibilityState: "visible",
        addEventListener: ((type: string, listener: EventListener) => {
          documentListeners.set(type, listener);
        }) as Document["addEventListener"],
        removeEventListener: ((type: string) => {
          documentListeners.delete(type);
        }) as Document["removeEventListener"],
      },
      flushAutosave: vi.fn(),
      runAutomaticCheckpoint: vi.fn(),
      releaseDraftLock: vi.fn(),
      flushAndFreezeDraft: vi.fn(),
      hasPendingAutosaveRef: { current: false },
      hasLocalDirtyChangesRef: { current: false },
      savingDraftRef: { current: false },
      hasPendingRemoteSyncRef: { current: false },
      remoteSyncStateRef: { current: "synced" },
      draftLifecycleSuspendedRef: { current: false },
    });

    const beforeUnloadEvent = {
      preventDefault: vi.fn(),
      returnValue: undefined,
    } as unknown as BeforeUnloadEvent;
    (
      windowListeners.get("beforeunload") as
        | ((event: BeforeUnloadEvent) => void)
        | undefined
    )?.(beforeUnloadEvent);

    expect(beforeUnloadEvent.preventDefault).not.toHaveBeenCalled();
    cleanup();
  });

  it("flushes pending checkpoints on setup, online, focus and visible visibility changes", () => {
    const windowListeners = new Map<string, EventListener>();
    const documentListeners = new Map<string, EventListener>();
    const flushPendingCheckpoint = vi.fn();
    const documentObject = {
      visibilityState: "hidden" as Document["visibilityState"],
      addEventListener: ((type: string, listener: EventListener) => {
        documentListeners.set(type, listener);
      }) as Document["addEventListener"],
      removeEventListener: ((type: string) => {
        documentListeners.delete(type);
      }) as Document["removeEventListener"],
    };

    const cleanup = registerPendingCheckpointRecoveryHandlers({
      browser: {
        addEventListener: ((type: string, listener: EventListener) => {
          windowListeners.set(type, listener);
        }) as Window["addEventListener"],
        removeEventListener: ((type: string) => {
          windowListeners.delete(type);
        }) as Window["removeEventListener"],
      },
      documentObject,
      flushPendingCheckpoint,
      draftLifecycleSuspendedRef: { current: false },
    });

    expect(flushPendingCheckpoint).toHaveBeenCalledOnce();

    (windowListeners.get("online") as (() => void) | undefined)?.();
    (windowListeners.get("focus") as (() => void) | undefined)?.();
    documentObject.visibilityState = "visible";
    (documentListeners.get("visibilitychange") as (() => void) | undefined)?.();

    expect(flushPendingCheckpoint).toHaveBeenCalledTimes(4);

    cleanup();
    expect(windowListeners.size).toBe(0);
    expect(documentListeners.size).toBe(0);
  });

  it("skips exit autosave and automatic checkpoints while the draft lifecycle is suspended", () => {
    const windowListeners = new Map<string, EventListener>();
    const documentListeners = new Map<string, EventListener>();
    const flushAutosave = vi.fn();
    const runAutomaticCheckpoint = vi.fn();
    const releaseDraftLock = vi.fn();
    const flushAndFreezeDraft = vi.fn();

    const cleanup = registerCheckpointExitHandlers({
      browser: {
        addEventListener: ((type: string, listener: EventListener) => {
          windowListeners.set(type, listener);
        }) as Window["addEventListener"],
        removeEventListener: ((type: string) => {
          windowListeners.delete(type);
        }) as Window["removeEventListener"],
      },
      documentObject: {
        visibilityState: "visible",
        addEventListener: ((type: string, listener: EventListener) => {
          documentListeners.set(type, listener);
        }) as Document["addEventListener"],
        removeEventListener: ((type: string) => {
          documentListeners.delete(type);
        }) as Document["removeEventListener"],
      },
      flushAutosave,
      runAutomaticCheckpoint,
      releaseDraftLock,
      flushAndFreezeDraft,
      hasPendingAutosaveRef: { current: true },
      hasLocalDirtyChangesRef: { current: true },
      savingDraftRef: { current: false },
      hasPendingRemoteSyncRef: { current: false },
      remoteSyncStateRef: { current: "synced" },
      draftLifecycleSuspendedRef: { current: true },
    });

    (windowListeners.get("pagehide") as (() => void) | undefined)?.();
    expect(flushAutosave).not.toHaveBeenCalled();
    expect(runAutomaticCheckpoint).not.toHaveBeenCalled();
    expect(releaseDraftLock).toHaveBeenCalledOnce();

    cleanup();
    expect(flushAndFreezeDraft).not.toHaveBeenCalled();
  });

  it("skips pending checkpoint recovery while the draft lifecycle is suspended", () => {
    const windowListeners = new Map<string, EventListener>();
    const documentListeners = new Map<string, EventListener>();
    const flushPendingCheckpoint = vi.fn();

    const cleanup = registerPendingCheckpointRecoveryHandlers({
      browser: {
        addEventListener: ((type: string, listener: EventListener) => {
          windowListeners.set(type, listener);
        }) as Window["addEventListener"],
        removeEventListener: ((type: string) => {
          windowListeners.delete(type);
        }) as Window["removeEventListener"],
      },
      documentObject: {
        visibilityState: "visible",
        addEventListener: ((type: string, listener: EventListener) => {
          documentListeners.set(type, listener);
        }) as Document["addEventListener"],
        removeEventListener: ((type: string) => {
          documentListeners.delete(type);
        }) as Document["removeEventListener"],
      },
      flushPendingCheckpoint,
      draftLifecycleSuspendedRef: { current: true },
    });

    (windowListeners.get("online") as (() => void) | undefined)?.();
    (windowListeners.get("focus") as (() => void) | undefined)?.();
    (documentListeners.get("visibilitychange") as (() => void) | undefined)?.();

    expect(flushPendingCheckpoint).not.toHaveBeenCalled();
    cleanup();
  });
});
