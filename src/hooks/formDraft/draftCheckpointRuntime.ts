import type {
  CheckpointDraftReason,
  EditingAuthorityState,
  RemoteSyncState,
} from "./shared";

export const AUTOMATIC_CHECKPOINT_INTERVAL_MS = 60_000;

export type DraftCheckpointBrowserLike = {
  setInterval: Window["setInterval"];
  clearInterval: Window["clearInterval"];
  addEventListener: Window["addEventListener"];
  removeEventListener: Window["removeEventListener"];
};

export type DraftCheckpointDocumentLike = {
  visibilityState: Document["visibilityState"];
  addEventListener: Document["addEventListener"];
  removeEventListener: Document["removeEventListener"];
};

type BooleanRef = {
  current: boolean;
};

type RegisterAutomaticCheckpointIntervalParams = {
  enabled: boolean;
  browser: Pick<DraftCheckpointBrowserLike, "setInterval" | "clearInterval">;
  intervalMs?: number;
  onInterval: () => void | Promise<void>;
};

type RegisterCheckpointExitHandlersParams = {
  browser: Pick<DraftCheckpointBrowserLike, "addEventListener" | "removeEventListener">;
  documentObject: DraftCheckpointDocumentLike;
  flushAutosave: () => void | Promise<unknown>;
  runAutomaticCheckpoint: (
    reason: Exclude<CheckpointDraftReason, "manual" | "interval">
  ) => void | Promise<void>;
  releaseDraftLock: () => void;
  flushAndFreezeDraft: () => void | Promise<void>;
  hasPendingAutosaveRef: BooleanRef;
  savingDraftRef: BooleanRef;
};

type RegisterPendingCheckpointRecoveryHandlersParams = {
  browser: Pick<DraftCheckpointBrowserLike, "addEventListener" | "removeEventListener">;
  documentObject: DraftCheckpointDocumentLike;
  flushPendingCheckpoint: () => void | Promise<unknown>;
};

type BeforeUnloadEventLike = Pick<
  BeforeUnloadEvent,
  "preventDefault" | "returnValue"
>;

type ResolvePendingCheckpointRemoteSyncStateParams = {
  hasPendingSnapshot: boolean;
  currentRemoteSyncState: RemoteSyncState;
};

type PendingCheckpointRemoteSyncState = {
  hasPendingRemoteSync: boolean;
  remoteSyncState: RemoteSyncState;
};

export function shouldSkipPendingCheckpointFlush(
  editingAuthorityState: EditingAuthorityState,
  activeDraftId: string | null
) {
  return editingAuthorityState !== "editor" && Boolean(activeDraftId);
}

export function normalizePendingCheckpointReason(
  reason: CheckpointDraftReason | "retry"
): CheckpointDraftReason {
  return reason === "retry" ? "interval" : reason;
}

export function resolvePendingCheckpointRemoteSyncState({
  hasPendingSnapshot,
  currentRemoteSyncState,
}: ResolvePendingCheckpointRemoteSyncStateParams): PendingCheckpointRemoteSyncState {
  if (hasPendingSnapshot) {
    return {
      hasPendingRemoteSync: true,
      remoteSyncState: "pending_remote_sync" as const,
    };
  }

  return {
    hasPendingRemoteSync: false,
    remoteSyncState:
      currentRemoteSyncState === "local_only_fallback"
        ? "local_only_fallback"
        : ("synced" as const),
  };
}

export function registerAutomaticCheckpointInterval({
  enabled,
  browser,
  intervalMs = AUTOMATIC_CHECKPOINT_INTERVAL_MS,
  onInterval,
}: RegisterAutomaticCheckpointIntervalParams) {
  if (!enabled) {
    return () => {};
  }

  const intervalId = browser.setInterval(() => {
    void onInterval();
  }, intervalMs);

  return () => {
    browser.clearInterval(intervalId);
  };
}

export function registerCheckpointExitHandlers({
  browser,
  documentObject,
  flushAutosave,
  runAutomaticCheckpoint,
  releaseDraftLock,
  flushAndFreezeDraft,
  hasPendingAutosaveRef,
  savingDraftRef,
}: RegisterCheckpointExitHandlersParams) {
  const handlePageHide = () => {
    void flushAutosave();
    void runAutomaticCheckpoint("pagehide");
    releaseDraftLock();
  };

  const handleVisibilityChange = () => {
    if (documentObject.visibilityState === "hidden") {
      void flushAutosave();
      void runAutomaticCheckpoint("visibilitychange");
    }
  };

  const handleBeforeUnload = (event: BeforeUnloadEventLike) => {
    if (!hasPendingAutosaveRef.current && !savingDraftRef.current) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  };

  browser.addEventListener("pagehide", handlePageHide);
  browser.addEventListener("beforeunload", handleBeforeUnload);
  documentObject.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    documentObject.removeEventListener(
      "visibilitychange",
      handleVisibilityChange
    );
    browser.removeEventListener("beforeunload", handleBeforeUnload);
    browser.removeEventListener("pagehide", handlePageHide);

    if (hasPendingAutosaveRef.current) {
      void flushAndFreezeDraft();
    }

    releaseDraftLock();
  };
}

export function registerPendingCheckpointRecoveryHandlers({
  browser,
  documentObject,
  flushPendingCheckpoint,
}: RegisterPendingCheckpointRecoveryHandlersParams) {
  const handleOnline = () => {
    void flushPendingCheckpoint();
  };

  const handleFocus = () => {
    void flushPendingCheckpoint();
  };

  const handleVisibilityChange = () => {
    if (documentObject.visibilityState === "visible") {
      void flushPendingCheckpoint();
    }
  };

  browser.addEventListener("online", handleOnline);
  browser.addEventListener("focus", handleFocus);
  documentObject.addEventListener("visibilitychange", handleVisibilityChange);

  void flushPendingCheckpoint();

  return () => {
    browser.removeEventListener("online", handleOnline);
    browser.removeEventListener("focus", handleFocus);
    documentObject.removeEventListener(
      "visibilitychange",
      handleVisibilityChange
    );
  };
}
