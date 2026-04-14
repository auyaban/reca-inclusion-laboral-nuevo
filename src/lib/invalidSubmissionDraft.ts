type InvalidSubmissionCheckpointResult = {
  ok: boolean;
  draftId?: string;
  error?: string;
};

type StartInvalidSubmissionCheckpointOptions = {
  checkpoint: () => Promise<InvalidSubmissionCheckpointResult>;
  currentDraftId?: string | null;
  fallbackErrorMessage?: string;
  onPromoteDraft?: (draftId: string) => void;
  onError?: (message: string) => void;
};

function resolveCheckpointErrorMessage(
  error: unknown,
  fallbackErrorMessage: string
) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallbackErrorMessage;
}

export function startInvalidSubmissionCheckpoint({
  checkpoint,
  currentDraftId = null,
  fallbackErrorMessage = "No se pudo guardar el borrador automáticamente.",
  onPromoteDraft,
  onError,
}: StartInvalidSubmissionCheckpointOptions) {
  void checkpoint()
    .then((result) => {
      if (!result.ok) {
        onError?.(result.error?.trim() || fallbackErrorMessage);
        return;
      }

      if (result.draftId && result.draftId !== currentDraftId) {
        onPromoteDraft?.(result.draftId);
      }
    })
    .catch((error) => {
      onError?.(resolveCheckpointErrorMessage(error, fallbackErrorMessage));
    });
}
