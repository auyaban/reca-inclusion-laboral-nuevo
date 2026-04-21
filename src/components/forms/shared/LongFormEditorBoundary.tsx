"use client";

import { createElement, type ComponentProps, type ComponentType } from "react";
import {
  LongFormDraftErrorState,
  LongFormLoadingState,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";

type LongFormDraftErrorStateProps = ComponentProps<typeof LongFormDraftErrorState>;
type LongFormSuccessStateProps = ComponentProps<typeof LongFormSuccessState>;

export type LongFormEditorBoundaryState<TPresenterProps extends object> =
  | { mode: "loading" }
  | { mode: "draft_error"; draftErrorState: LongFormDraftErrorStateProps }
  | { mode: "success"; successState: LongFormSuccessStateProps }
  | { mode: "editing"; presenterProps: TPresenterProps };

type LongFormEditorBoundaryProps<TPresenterProps extends object> = {
  state: LongFormEditorBoundaryState<TPresenterProps>;
  Presenter: ComponentType<TPresenterProps>;
};

export function LongFormEditorBoundary<TPresenterProps extends object>({
  state,
  Presenter,
}: LongFormEditorBoundaryProps<TPresenterProps>) {
  if (state.mode === "loading") {
    return <LongFormLoadingState />;
  }

  if (state.mode === "draft_error") {
    return <LongFormDraftErrorState {...state.draftErrorState} />;
  }

  if (state.mode === "success") {
    return <LongFormSuccessState {...state.successState} />;
  }

  return createElement(Presenter, state.presenterProps);
}
