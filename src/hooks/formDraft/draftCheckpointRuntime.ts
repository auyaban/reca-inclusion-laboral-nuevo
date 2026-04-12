import type {
  CheckpointDraftReason,
  EditingAuthorityState,
  RemoteSyncState,
} from "./shared";

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
