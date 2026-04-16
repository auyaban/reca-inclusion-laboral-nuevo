"use client";

import { SeleccionFormPresenter } from "@/components/forms/seleccion/SeleccionFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import { useSeleccionFormState } from "@/hooks/useSeleccionFormState";

export default function SeleccionFormEditor() {
  const state = useSeleccionFormState();

  if (state.mode === "loading") {
    return <LongFormLoadingState />;
  }

  if (state.mode === "draft_error") {
    return <LongFormDraftErrorState {...state.draftErrorState} />;
  }

  if (state.mode === "success") {
    return <LongFormSuccessState {...state.successState} />;
  }

  return <SeleccionFormPresenter {...state.presenterProps} />;
}
