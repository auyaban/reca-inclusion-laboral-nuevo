import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  resolveInvisibleDraftSessionHydration,
  type LongFormDraftHydrationAction,
  type InvisibleDraftSessionHydrationAction,
} from "@/lib/longFormHydration";

export type ContratacionDraftHydrationAction = LongFormDraftHydrationAction;
export type ContratacionSessionHydrationAction =
  InvisibleDraftSessionHydrationAction;

export const buildContratacionSessionRouteKey = buildLongFormSessionRouteKey;

export const resolveContratacionDraftHydration = resolveLongFormDraftHydration;

export const resolveContratacionSessionHydration =
  resolveInvisibleDraftSessionHydration;
