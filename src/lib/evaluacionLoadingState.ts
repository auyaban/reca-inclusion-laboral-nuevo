export function shouldShowEvaluacionLoadingState({
  draftParam,
  restoringDraft,
  loadingDraft,
  hasEmpresa,
  currentRouteHydrated,
}: {
  draftParam: string | null;
  restoringDraft: boolean;
  loadingDraft: boolean;
  hasEmpresa: boolean;
  currentRouteHydrated: boolean;
}) {
  if (draftParam) {
    return !currentRouteHydrated && (restoringDraft || loadingDraft);
  }

  return !hasEmpresa && restoringDraft;
}
