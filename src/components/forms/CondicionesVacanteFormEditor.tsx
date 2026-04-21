"use client";

import { CondicionesVacanteFormPresenter } from "@/components/forms/condicionesVacante/CondicionesVacanteFormPresenter";
import { LongFormEditorBoundary } from "@/components/forms/shared/LongFormEditorBoundary";
import { useCondicionesVacanteFormState } from "@/hooks/useCondicionesVacanteFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type CondicionesVacanteFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function CondicionesVacanteFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: CondicionesVacanteFormEditorProps) {
  const state = useCondicionesVacanteFormState({ initialDraftResolution });
  return (
    <LongFormEditorBoundary state={state} Presenter={CondicionesVacanteFormPresenter} />
  );
}
