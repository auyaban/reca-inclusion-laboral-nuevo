"use client";

import { SensibilizacionFormPresenter } from "@/components/forms/sensibilizacion/SensibilizacionFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import { useSensibilizacionFormState } from "@/hooks/useSensibilizacionFormState";

export default function SensibilizacionForm() {
  const state = useSensibilizacionFormState();

  if (state.mode === "loading") {
    return <LongFormLoadingState />;
  }

  if (state.mode === "draft_error") {
    return <LongFormDraftErrorState {...state.draftErrorState} />;
  }

  if (state.mode === "success") {
    return <LongFormSuccessState {...state.successState} />;
  }

  return <SensibilizacionFormPresenter {...state.presenterProps} />;
}
