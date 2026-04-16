"use client";

import { SeleccionFormPresenter } from "@/components/forms/seleccion/SeleccionFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import { useSeleccionFormState } from "@/hooks/useSeleccionFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type SeleccionFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function SeleccionFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: SeleccionFormEditorProps) {
  const state = useSeleccionFormState({ initialDraftResolution });

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
