"use client";

import { PresentacionFormPresenter } from "@/components/forms/presentacion/PresentacionFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import { usePresentacionFormState } from "@/hooks/usePresentacionFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type PresentacionFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function PresentacionFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: PresentacionFormEditorProps) {
  const state = usePresentacionFormState({ initialDraftResolution });

  if (state.mode === "loading") {
    return <LongFormLoadingState />;
  }

  if (state.mode === "draft_error") {
    return <LongFormDraftErrorState {...state.draftErrorState} />;
  }

  if (state.mode === "success") {
    return <LongFormSuccessState {...state.successState} />;
  }

  return <PresentacionFormPresenter {...state.presenterProps} />;
}
