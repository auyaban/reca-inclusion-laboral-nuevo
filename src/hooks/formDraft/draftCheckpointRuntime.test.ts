import { describe, expect, it } from "vitest";
import {
  normalizePendingCheckpointReason,
  resolvePendingCheckpointRemoteSyncState,
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
});
