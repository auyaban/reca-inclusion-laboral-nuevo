export type LongFormDraftHydrationAction =
  | "skip"
  | "restore_local"
  | "load_remote";

export type LongFormSessionHydrationAction =
  | "show_company"
  | "redirect_to_draft"
  | "restore_local"
  | "skip"
  | "bootstrap_defaults";

export function buildLongFormSessionRouteKey(
  sessionId: string,
  explicitNewDraft: boolean
) {
  return `session:${sessionId}:${explicitNewDraft ? "new" : "default"}`;
}

export function resolveLongFormDraftHydration(params: {
  isRouteHydrated: boolean;
  hasRestorableLocalDraft: boolean;
}): LongFormDraftHydrationAction {
  if (params.isRouteHydrated) {
    return "skip";
  }

  if (params.hasRestorableLocalDraft) {
    return "restore_local";
  }

  return "load_remote";
}

export function resolveLongFormSessionHydration(params: {
  hasEmpresa: boolean;
  hasSessionParam: boolean;
  persistedDraftId: string | null;
  hasRestorableLocalDraft: boolean;
  isRouteHydrated: boolean;
}): LongFormSessionHydrationAction {
  if (!params.hasEmpresa && !params.hasSessionParam) {
    return "show_company";
  }

  if (params.persistedDraftId) {
    return "redirect_to_draft";
  }

  if (params.hasSessionParam && params.hasRestorableLocalDraft) {
    return "restore_local";
  }

  if (!params.hasEmpresa) {
    return "show_company";
  }

  if (params.isRouteHydrated) {
    return "skip";
  }

  return "bootstrap_defaults";
}
