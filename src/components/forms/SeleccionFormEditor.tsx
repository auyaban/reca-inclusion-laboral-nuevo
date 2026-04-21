"use client";

import { SeleccionFormPresenter } from "@/components/forms/seleccion/SeleccionFormPresenter";
import { LongFormEditorBoundary } from "@/components/forms/shared/LongFormEditorBoundary";
import { useSeleccionFormState } from "@/hooks/useSeleccionFormState";
import {
  NO_INITIAL_DRAFT_RESOLUTION,
  type InitialDraftResolution,
} from "@/lib/drafts/initialDraftResolution";

type SeleccionFormEditorProps = {
  initialDraftResolution?: InitialDraftResolution;
};

export default function SeleccionFormEditor({
  initialDraftResolution = NO_INITIAL_DRAFT_RESOLUTION,
}: SeleccionFormEditorProps) {
  const state = useSeleccionFormState({ initialDraftResolution });
  return <LongFormEditorBoundary state={state} Presenter={SeleccionFormPresenter} />;
}
