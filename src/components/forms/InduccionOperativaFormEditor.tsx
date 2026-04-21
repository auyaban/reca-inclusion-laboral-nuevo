"use client";

import { InduccionOperativaFormPresenter } from "@/components/forms/induccionOperativa/InduccionOperativaFormPresenter";
import { LongFormEditorBoundary } from "@/components/forms/shared/LongFormEditorBoundary";
import { useInduccionOperativaFormState } from "@/hooks/useInduccionOperativaFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type Props = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function InduccionOperativaFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: Props) {
  const state = useInduccionOperativaFormState({ initialDraftResolution });
  return (
    <LongFormEditorBoundary state={state} Presenter={InduccionOperativaFormPresenter} />
  );
}
