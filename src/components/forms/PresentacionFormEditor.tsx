"use client";

import { PresentacionFormPresenter } from "@/components/forms/presentacion/PresentacionFormPresenter";
import { LongFormEditorBoundary } from "@/components/forms/shared/LongFormEditorBoundary";
import { usePresentacionFormState } from "@/hooks/usePresentacionFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type PresentacionFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function PresentacionFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: PresentacionFormEditorProps) {
  const state = usePresentacionFormState({ initialDraftResolution });
  return <LongFormEditorBoundary state={state} Presenter={PresentacionFormPresenter} />;
}
