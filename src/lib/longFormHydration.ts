import type { InitialDraftResolution } from "@/lib/drafts/initialDraftResolution";
import type { DraftMeta, LocalDraft } from "@/lib/drafts/shared";
import type { Empresa } from "@/lib/store/empresaStore";

export type LongFormDraftHydrationAction =
  | "skip"
  | "restore_local"
  | "load_remote";

export type InvisibleDraftSessionHydrationAction =
  | "show_company"
  | "restore_local"
  | "load_promoted_remote"
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

export type LongFormDraftSourceResolution =
  | { action: "skip" }
  | { action: "restore_local"; draft: LocalDraft; empresa: Empresa }
  | { action: "restore_prefetched"; draft: DraftMeta; empresa: Empresa }
  | { action: "show_error"; message: string }
  | { action: "load_client" };

export function resolveLongFormDraftSource(params: {
  hydrationAction: LongFormDraftHydrationAction;
  localDraft: LocalDraft | null;
  localEmpresa: Empresa | null;
  initialDraftResolution: InitialDraftResolution;
}): LongFormDraftSourceResolution {
  if (params.hydrationAction === "skip") {
    return { action: "skip" };
  }

  if (
    params.hydrationAction === "restore_local" &&
    params.localDraft &&
    params.localEmpresa
  ) {
    return {
      action: "restore_local",
      draft: params.localDraft,
      empresa: params.localEmpresa,
    };
  }

  if (params.initialDraftResolution.status === "ready") {
    return {
      action: "restore_prefetched",
      draft: params.initialDraftResolution.draft,
      empresa: params.initialDraftResolution.empresa,
    };
  }

  if (params.initialDraftResolution.status === "error") {
    return {
      action: "show_error",
      message: params.initialDraftResolution.message,
    };
  }

  return { action: "load_client" };
}

export function resolveInvisibleDraftSessionHydration(params: {
  hasEmpresa: boolean;
  persistedDraftId: string | null;
  hasRestorableLocalDraft: boolean;
  isRouteHydrated: boolean;
}): InvisibleDraftSessionHydrationAction {
  if (params.isRouteHydrated) {
    return "skip";
  }

  if (params.hasRestorableLocalDraft) {
    return "restore_local";
  }

  if (params.persistedDraftId) {
    return "load_promoted_remote";
  }

  if (!params.hasEmpresa) {
    return "show_company";
  }

  return "bootstrap_defaults";
}
