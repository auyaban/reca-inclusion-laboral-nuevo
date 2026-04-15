"use client";

import { CondicionesVacanteFormPresenter } from "@/components/forms/condicionesVacante/CondicionesVacanteFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import { useCondicionesVacanteFormState } from "@/hooks/useCondicionesVacanteFormState";

export default function CondicionesVacanteForm() {
  const state = useCondicionesVacanteFormState();

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
