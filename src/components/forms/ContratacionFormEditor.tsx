"use client";

import { ContratacionFormPresenter } from "@/components/forms/contratacion/ContratacionFormPresenter";
import { LongFormEditorBoundary } from "@/components/forms/shared/LongFormEditorBoundary";
import { useContratacionFormState } from "@/hooks/useContratacionFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type ContratacionFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function ContratacionFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: ContratacionFormEditorProps) {
  const state = useContratacionFormState({ initialDraftResolution });
  return <LongFormEditorBoundary state={state} Presenter={ContratacionFormPresenter} />;
}
