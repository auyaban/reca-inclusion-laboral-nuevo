"use client";

import { PresentacionFormPresenter } from "@/components/forms/presentacion/PresentacionFormPresenter";
import { LongFormEditorBoundary } from "@/components/forms/shared/LongFormEditorBoundary";
import { usePresentacionFormState } from "@/hooks/usePresentacionFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";
import type { PresentacionInitialPrewarmSeed } from "@/lib/presentacion";

type PresentacionFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
  initialPrewarmSeed?: PresentacionInitialPrewarmSeed | null;
};

export default function PresentacionFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
  initialPrewarmSeed = null,
}: PresentacionFormEditorProps) {
  const state = usePresentacionFormState({
    initialDraftResolution,
    initialPrewarmSeed,
  });
  return <LongFormEditorBoundary state={state} Presenter={PresentacionFormPresenter} />;
}
