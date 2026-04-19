import { beforeEach, describe, expect, it, vi } from "vitest";

const { startInvalidSubmissionCheckpointMock } = vi.hoisted(() => ({
  startInvalidSubmissionCheckpointMock: vi.fn(),
}));

vi.mock("@/lib/invalidSubmissionDraft", () => ({
  startInvalidSubmissionCheckpoint: startInvalidSubmissionCheckpointMock,
}));

import {
  buildLongFormDraftLockBannerProps,
  buildLongFormDraftStatusProps,
  clearLongFormDraftAfterSuccess,
  startLongFormInvalidSubmissionCheckpoint,
} from "@/hooks/useLongFormDraftController";

describe("useLongFormDraftController helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds draft status props from draft state", () => {
    const onSave = vi.fn();

    const draftStatusProps = buildLongFormDraftStatusProps(
      {
        savingDraft: false,
        remoteIdentityState: "ready",
        remoteSyncState: "synced",
        hasPendingAutosave: false,
        hasLocalDirtyChanges: false,
        hasPendingRemoteSync: false,
        localDraftSavedAt: new Date("2026-04-15T00:00:00.000Z"),
        draftSavedAt: new Date("2026-04-15T00:01:00.000Z"),
        localPersistenceState: "indexeddb",
        localPersistenceMessage: null,
      },
      {
        onSave,
        saveDisabled: true,
      }
    );

    expect(draftStatusProps).toEqual(
      expect.objectContaining({
        remoteIdentityState: "ready",
        remoteSyncState: "synced",
        localPersistenceState: "indexeddb",
        onSave,
        saveDisabled: true,
      })
    );
  });

  it("builds draft lock banner props that delegate takeover feedback", () => {
    const setServerError = vi.fn();
    const onBackToDrafts = vi.fn();
    const onTakeOverDraftWithFeedback = vi.fn().mockReturnValue(true);

    const bannerProps = buildLongFormDraftLockBannerProps({
      setServerError,
      onTakeOverDraftWithFeedback,
      onBackToDrafts,
    });

    bannerProps.onTakeOver();

    expect(onTakeOverDraftWithFeedback).toHaveBeenCalledWith(setServerError);
    expect(bannerProps.onBackToDrafts).toBe(onBackToDrafts);
  });

  it("delegates invalid submission checkpoint with current or default draft id", () => {
    const checkpoint = vi.fn();
    const onPromoteDraft = vi.fn();
    const onError = vi.fn();

    startLongFormInvalidSubmissionCheckpoint({
      defaultDraftId: "draft-1",
      checkpoint,
      onPromoteDraft,
      onError,
    });

    expect(startInvalidSubmissionCheckpointMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentDraftId: "draft-1",
        checkpoint,
        onPromoteDraft,
        onError,
      })
    );
  });

  it("clears the active draft after a successful finalize flow", async () => {
    const suspendDraftLifecycle = vi.fn();
    const clearDraft = vi.fn().mockResolvedValue(undefined);
    const markRouteHydrated = vi.fn();
    const getCurrentActiveDraftId = vi.fn().mockReturnValue("draft-1");

    await clearLongFormDraftAfterSuccess({
      getCurrentActiveDraftId,
      localDraftSessionId: "session-1",
      suspendDraftLifecycle,
      clearDraft,
      markRouteHydrated,
    });

    expect(suspendDraftLifecycle).toHaveBeenCalledOnce();
    expect(getCurrentActiveDraftId).toHaveBeenCalledOnce();
    expect(clearDraft).toHaveBeenCalledWith("draft-1", {
      sessionId: "session-1",
    });
    expect(markRouteHydrated).toHaveBeenCalledWith(null);
  });

  it("resolves the current active draft id at cleanup time instead of using a stale closure", async () => {
    const suspendDraftLifecycle = vi.fn();
    const clearDraft = vi.fn().mockResolvedValue(undefined);
    const markRouteHydrated = vi.fn();
    let currentDraftId: string | null = null;

    await clearLongFormDraftAfterSuccess({
      getCurrentActiveDraftId: () => currentDraftId,
      localDraftSessionId: "session-1",
      suspendDraftLifecycle,
      clearDraft,
      markRouteHydrated,
    });

    expect(clearDraft).toHaveBeenCalledWith(undefined, {
      sessionId: "session-1",
    });

    clearDraft.mockClear();
    currentDraftId = "draft-created-during-finalize";

    await clearLongFormDraftAfterSuccess({
      getCurrentActiveDraftId: () => currentDraftId,
      localDraftSessionId: "session-1",
      suspendDraftLifecycle,
      clearDraft,
      markRouteHydrated,
    });

    expect(clearDraft).toHaveBeenCalledWith("draft-created-during-finalize", {
      sessionId: "session-1",
    });
  });
});
