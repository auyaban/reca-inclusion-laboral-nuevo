"use client";

import { EvaluacionFormPresenter } from "@/components/forms/evaluacion/EvaluacionFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import { useEvaluacionFormState } from "@/hooks/useEvaluacionFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type EvaluacionFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function EvaluacionFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: EvaluacionFormEditorProps) {
  const state = useEvaluacionFormState({ initialDraftResolution });

  if (state.mode === "loading") {
    return <LongFormLoadingState />;
  }

  if (state.mode === "draft_error") {
    return <LongFormDraftErrorState {...state.draftErrorState} />;
  }

  if (state.mode === "success") {
    return <LongFormSuccessState {...state.successState} />;
  }

  return <EvaluacionFormPresenter {...state.presenterProps} />;
}
