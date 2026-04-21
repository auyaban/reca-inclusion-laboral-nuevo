"use client";

import { SensibilizacionFormPresenter } from "@/components/forms/sensibilizacion/SensibilizacionFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import { useSensibilizacionFormState } from "@/hooks/useSensibilizacionFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type SensibilizacionFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function SensibilizacionFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: SensibilizacionFormEditorProps) {
  const state = useSensibilizacionFormState({ initialDraftResolution });

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
