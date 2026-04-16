"use client";

import { ContratacionFormPresenter } from "@/components/forms/contratacion/ContratacionFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import { useContratacionFormState } from "@/hooks/useContratacionFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type ContratacionFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function ContratacionFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: ContratacionFormEditorProps) {
  const state = useContratacionFormState({ initialDraftResolution });

  if (state.mode === "loading") {
    return <LongFormLoadingState />;
  }

  if (state.mode === "draft_error") {
    return <LongFormDraftErrorState {...state.draftErrorState} />;
  }

  if (state.mode === "success") {
    return <LongFormSuccessState {...state.successState} />;
  }

  return <ContratacionFormPresenter {...state.presenterProps} />;
}
