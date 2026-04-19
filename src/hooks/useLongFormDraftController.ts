"use client";

import type { ComponentProps } from "react";
import { useCallback } from "react";
import { DraftLockBanner } from "@/components/drafts/DraftLockBanner";
import { DraftPersistenceStatus } from "@/components/drafts/DraftPersistenceStatus";
import {
  useFormDraft,
  type CheckpointDraftReason,
  type CheckpointDraftResult,
  type LocalPersistenceState,
  type Options,
  type RemoteIdentityState,
  type RemoteSyncState,
} from "@/hooks/useFormDraft";
import { useFormDraftLifecycle } from "@/hooks/useFormDraftLifecycle";
import { startInvalidSubmissionCheckpoint } from "@/lib/invalidSubmissionDraft";

type UseLongFormDraftControllerOptions = Options & {
  initialRestoring?: boolean;
  takeOverErrorMessage?: string;
};

type DraftStatusOverrides = Pick<
  ComponentProps<typeof DraftPersistenceStatus>,
  "onSave" | "saveDisabled" | "tone" | "className"
>;

type DraftLockBannerOptions = Pick<
  ComponentProps<typeof DraftLockBanner>,
  "onBackToDrafts" | "className"
> & {
  setServerError: (value: string | null) => void;
};

type InvalidSubmissionCheckpointOptions = {
  checkpoint: () => Promise<CheckpointDraftResult>;
  currentDraftId?: string | null;
  fallbackErrorMessage?: string;
  onPromoteDraft?: (draftId: string) => void;
  onError?: (message: string) => void;
};

type DraftStatusState = {
  savingDraft: boolean;
  remoteIdentityState: RemoteIdentityState;
  remoteSyncState: RemoteSyncState;
  hasPendingAutosave: boolean;
  hasLocalDirtyChanges: boolean;
  hasPendingRemoteSync: boolean;
  localDraftSavedAt: Date | null;
  draftSavedAt: Date | null;
  localPersistenceState: LocalPersistenceState;
  localPersistenceMessage: string | null;
};

type DraftTakeOverHandler = (
  setServerError: (value: string | null) => void
) => boolean;

type BuildDraftLockBannerPropsOptions = Pick<
  ComponentProps<typeof DraftLockBanner>,
  "onBackToDrafts" | "className"
> & {
  setServerError: (value: string | null) => void;
  onTakeOverDraftWithFeedback: DraftTakeOverHandler;
};

type StartInvalidCheckpointOptions = InvalidSubmissionCheckpointOptions & {
  defaultDraftId?: string | null;
};

type ClearDraftAfterSuccessOptions = {
  getCurrentActiveDraftId: () => string | null;
  localDraftSessionId: string;
  suspendDraftLifecycle: () => void;
  clearDraft: ReturnType<typeof useFormDraft>["clearDraft"];
  markRouteHydrated: ReturnType<typeof useFormDraftLifecycle>["markRouteHydrated"];
};

export function buildLongFormDraftStatusProps(
  draft: DraftStatusState,
  overrides?: DraftStatusOverrides
): ComponentProps<typeof DraftPersistenceStatus> {
  return {
    savingDraft: draft.savingDraft,
    remoteIdentityState: draft.remoteIdentityState,
    remoteSyncState: draft.remoteSyncState,
    hasPendingAutosave: draft.hasPendingAutosave,
    hasLocalDirtyChanges: draft.hasLocalDirtyChanges,
    hasPendingRemoteSync: draft.hasPendingRemoteSync,
    localDraftSavedAt: draft.localDraftSavedAt,
    draftSavedAt: draft.draftSavedAt,
    localPersistenceState: draft.localPersistenceState,
    localPersistenceMessage: draft.localPersistenceMessage,
    onSave: overrides?.onSave,
    saveDisabled: overrides?.saveDisabled,
    tone: overrides?.tone,
    className: overrides?.className,
  };
}

export function buildLongFormDraftLockBannerProps({
  setServerError,
  onTakeOverDraftWithFeedback,
  onBackToDrafts,
  className,
}: BuildDraftLockBannerPropsOptions): ComponentProps<typeof DraftLockBanner> {
  return {
    onTakeOver: () => {
      onTakeOverDraftWithFeedback(setServerError);
    },
    onBackToDrafts,
    className,
  };
}

export function startLongFormInvalidSubmissionCheckpoint({
  currentDraftId,
  defaultDraftId,
  checkpoint,
  fallbackErrorMessage,
  onPromoteDraft,
  onError,
}: StartInvalidCheckpointOptions) {
  startInvalidSubmissionCheckpoint({
    currentDraftId: currentDraftId ?? defaultDraftId,
    checkpoint,
    fallbackErrorMessage,
    onPromoteDraft,
    onError,
  });
}

export async function clearLongFormDraftAfterSuccess({
  getCurrentActiveDraftId,
  localDraftSessionId,
  suspendDraftLifecycle,
  clearDraft,
  markRouteHydrated,
}: ClearDraftAfterSuccessOptions) {
  suspendDraftLifecycle();
  await clearDraft(getCurrentActiveDraftId() ?? undefined, {
    sessionId: localDraftSessionId,
  });
  markRouteHydrated(null);
}

export function useLongFormDraftController({
  initialRestoring,
  takeOverErrorMessage,
  ...draftOptions
}: UseLongFormDraftControllerOptions) {
  const lifecycle = useFormDraftLifecycle({
    initialRestoring,
    takeOverErrorMessage,
  });
  const draft = useFormDraft({
    ...draftOptions,
    draftLifecycleSuspended: lifecycle.draftLifecycleSuspended,
  });

  const isReadonlyDraft = draft.editingAuthorityState === "read_only";

  const buildDraftStatusProps = useCallback(
    (overrides?: DraftStatusOverrides): ComponentProps<typeof DraftPersistenceStatus> =>
      buildLongFormDraftStatusProps(draft, overrides),
    [draft]
  );

  const handleTakeOverDraftWithFeedback = useCallback(
    (setServerError: (value: string | null) => void) => {
      return lifecycle.takeOverDraftWithFeedback(draft.takeOverDraft, setServerError);
    },
    [draft.takeOverDraft, lifecycle]
  );

  const buildDraftLockBannerProps = useCallback(
    ({
      setServerError,
      ...options
    }: DraftLockBannerOptions): ComponentProps<typeof DraftLockBanner> =>
      buildLongFormDraftLockBannerProps({
        setServerError,
        onTakeOverDraftWithFeedback: handleTakeOverDraftWithFeedback,
        onBackToDrafts: options.onBackToDrafts,
        className: options.className,
      }),
    [handleTakeOverDraftWithFeedback]
  );

  const checkpointInvalidSubmission = useCallback(
    ({
      currentDraftId,
      ...options
    }: InvalidSubmissionCheckpointOptions) => {
      startLongFormInvalidSubmissionCheckpoint({
        currentDraftId,
        defaultDraftId: draft.activeDraftId,
        checkpoint: options.checkpoint,
        fallbackErrorMessage: options.fallbackErrorMessage,
        onPromoteDraft: options.onPromoteDraft,
        onError: options.onError,
      });
    },
    [draft.activeDraftId]
  );

  const clearDraftAfterSuccess = useCallback(
    async () =>
      clearLongFormDraftAfterSuccess({
        getCurrentActiveDraftId: draft.getCurrentActiveDraftId,
        localDraftSessionId: draft.localDraftSessionId,
        suspendDraftLifecycle: lifecycle.suspendDraftLifecycle,
        clearDraft: draft.clearDraft,
        markRouteHydrated: lifecycle.markRouteHydrated,
      }),
    [draft, lifecycle]
  );

  const checkpointDraft = useCallback(
    (
      step: number,
      data: Record<string, unknown>,
      reason: CheckpointDraftReason
    ) => {
      return draft.checkpointDraft(step, data, reason);
    },
    [draft]
  );

  return {
    ...draft,
    ...lifecycle,
    isReadonlyDraft,
    checkpointDraft,
    buildDraftStatusProps,
    buildDraftLockBannerProps,
    checkpointInvalidSubmission,
    clearDraftAfterSuccess,
    handleTakeOverDraftWithFeedback,
  };
}
