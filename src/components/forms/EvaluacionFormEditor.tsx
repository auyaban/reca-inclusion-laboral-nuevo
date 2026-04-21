"use client";

import { EvaluacionFormPresenter } from "@/components/forms/evaluacion/EvaluacionFormPresenter";
import { LongFormEditorBoundary } from "@/components/forms/shared/LongFormEditorBoundary";
import { useEvaluacionFormState } from "@/hooks/useEvaluacionFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type EvaluacionFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function EvaluacionFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: EvaluacionFormEditorProps) {
  const state = useEvaluacionFormState({ initialDraftResolution });
  return <LongFormEditorBoundary state={state} Presenter={EvaluacionFormPresenter} />;
}
