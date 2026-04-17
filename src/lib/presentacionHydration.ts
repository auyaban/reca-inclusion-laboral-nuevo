import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  resolveInvisibleDraftSessionHydration,
  type LongFormDraftHydrationAction,
  type InvisibleDraftSessionHydrationAction,
} from "@/lib/longFormHydration";

export type PresentacionDraftHydrationAction = LongFormDraftHydrationAction;

export type PresentacionSessionHydrationAction =
  InvisibleDraftSessionHydrationAction;

export const buildPresentacionSessionRouteKey = buildLongFormSessionRouteKey;

export const resolvePresentacionDraftHydration =
  resolveLongFormDraftHydration;

export const resolvePresentacionSessionHydration =
  resolveInvisibleDraftSessionHydration;
