import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  resolveLongFormSessionHydration,
  type LongFormDraftHydrationAction,
  type LongFormSessionHydrationAction,
} from "@/lib/longFormHydration";

export type ContratacionDraftHydrationAction = LongFormDraftHydrationAction;
export type ContratacionSessionHydrationAction =
  LongFormSessionHydrationAction;

export const buildContratacionSessionRouteKey = buildLongFormSessionRouteKey;

export const resolveContratacionDraftHydration = resolveLongFormDraftHydration;

export const resolveContratacionSessionHydration =
  resolveLongFormSessionHydration;
