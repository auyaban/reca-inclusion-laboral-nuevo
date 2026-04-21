"use client";

import { SensibilizacionFormPresenter } from "@/components/forms/sensibilizacion/SensibilizacionFormPresenter";
import { LongFormEditorBoundary } from "@/components/forms/shared/LongFormEditorBoundary";
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
  return <LongFormEditorBoundary state={state} Presenter={SensibilizacionFormPresenter} />;
}
