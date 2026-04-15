import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  type LongFormDraftHydrationAction,
} from "@/lib/longFormHydration";

export type PresentacionDraftHydrationAction = LongFormDraftHydrationAction;

export type PresentacionSessionHydrationAction =
  | "show_company"
  | "redirect_to_draft"
  | "restore_local"
  | "skip"
  | "bootstrap_defaults";

export const buildPresentacionSessionRouteKey = buildLongFormSessionRouteKey;

export const resolvePresentacionDraftHydration =
  resolveLongFormDraftHydration;

export function resolvePresentacionSessionHydration(params: {
  hasEmpresa: boolean;
  persistedDraftId: string | null;
  hasRestorableLocalDraft: boolean;
  isRouteHydrated: boolean;
}): PresentacionSessionHydrationAction {
  if (params.isRouteHydrated) {
    return "skip";
  }

  if (params.persistedDraftId) {
    return "redirect_to_draft";
  }

  if (params.hasRestorableLocalDraft) {
    return "restore_local";
  }

  if (!params.hasEmpresa) {
    return "show_company";
  }

  return "bootstrap_defaults";
}
