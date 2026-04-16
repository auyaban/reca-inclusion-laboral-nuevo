"use client";

import { CondicionesVacanteFormPresenter } from "@/components/forms/condicionesVacante/CondicionesVacanteFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import { useCondicionesVacanteFormState } from "@/hooks/useCondicionesVacanteFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type CondicionesVacanteFormProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function CondicionesVacanteForm({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: CondicionesVacanteFormProps) {
  const state = useCondicionesVacanteFormState({ initialDraftResolution });

  if (state.mode === "loading") {
    return <LongFormLoadingState />;
  }

  if (state.mode === "draft_error") {
    return <LongFormDraftErrorState {...state.draftErrorState} />;
  }

  if (state.mode === "success") {
    return <LongFormSuccessState {...state.successState} />;
  }

  return <CondicionesVacanteFormPresenter {...state.presenterProps} />;
}
