"use client";

import { InduccionOrganizacionalFormPresenter } from "@/components/forms/induccionOrganizacional/InduccionOrganizacionalFormPresenter";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";
import { useInduccionOrganizacionalFormState } from "@/hooks/useInduccionOrganizacionalFormState";

type InduccionOrganizacionalFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function InduccionOrganizacionalFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: InduccionOrganizacionalFormEditorProps) {
  const state = useInduccionOrganizacionalFormState({
    initialDraftResolution,
  });

  if (state.mode === "loading") {
    return <LongFormLoadingState />;
  }

  if (state.mode === "draft_error") {
    return <LongFormDraftErrorState {...state.draftErrorState} />;
  }

  if (state.mode === "success") {
    return <LongFormSuccessState {...state.successState} />;
  }

  return <InduccionOrganizacionalFormPresenter {...state.presenterProps} />;
}
