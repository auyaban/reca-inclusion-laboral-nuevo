"use client";

import { ContratacionFormPresenter } from "@/components/forms/contratacion/ContratacionFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import { useContratacionFormState } from "@/hooks/useContratacionFormState";

export default function ContratacionForm() {
  const state = useContratacionFormState();

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
