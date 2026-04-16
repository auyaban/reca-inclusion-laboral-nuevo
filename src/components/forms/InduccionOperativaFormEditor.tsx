"use client";

import { InduccionOperativaFormPresenter } from "@/components/forms/induccionOperativa/InduccionOperativaFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import { useInduccionOperativaFormState } from "@/hooks/useInduccionOperativaFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type Props = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function InduccionOperativaFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: Props) {
  const state = useInduccionOperativaFormState({ initialDraftResolution });

  if (state.mode === "loading") {
    return <LongFormLoadingState />;
  }

  if (state.mode === "draft_error") {
    return <LongFormDraftErrorState {...state.draftErrorState} />;
  }

  if (state.mode === "success") {
    return <LongFormSuccessState {...state.successState} />;
  }

  return <InduccionOperativaFormPresenter {...state.presenterProps} />;
}
