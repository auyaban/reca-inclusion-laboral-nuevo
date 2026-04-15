"use client";

import { PresentacionFormPresenter } from "@/components/forms/presentacion/PresentacionFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import { usePresentacionFormState } from "@/hooks/usePresentacionFormState";

export default function PresentacionForm() {
  const state = usePresentacionFormState();

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
