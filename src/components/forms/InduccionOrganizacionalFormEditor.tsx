"use client";

import { InduccionOrganizacionalFormPresenter } from "@/components/forms/induccionOrganizacional/InduccionOrganizacionalFormPresenter";
import { LongFormEditorBoundary } from "@/components/forms/shared/LongFormEditorBoundary";
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
  return (
    <LongFormEditorBoundary
      state={state}
      Presenter={InduccionOrganizacionalFormPresenter}
    />
  );
}
