"use client";

import { InterpreteLscFormPresenter } from "@/components/forms/interpreteLsc/InterpreteLscFormPresenter";
import { LongFormEditorBoundary } from "@/components/forms/shared/LongFormEditorBoundary";
import { useInterpreteLscFormState } from "@/hooks/useInterpreteLscFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type InterpreteLscFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function InterpreteLscFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: InterpreteLscFormEditorProps) {
  const state = useInterpreteLscFormState({ initialDraftResolution });
  return (
    <LongFormEditorBoundary
      state={state}
      Presenter={InterpreteLscFormPresenter}
    />
  );
}
