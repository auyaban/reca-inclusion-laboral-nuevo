import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  resolveInvisibleDraftSessionHydration,
  type LongFormDraftHydrationAction,
  type InvisibleDraftSessionHydrationAction,
} from "@/lib/longFormHydration";

export type InduccionesDraftHydrationAction = LongFormDraftHydrationAction;
export type InduccionesSessionHydrationAction =
  InvisibleDraftSessionHydrationAction;

export const buildInduccionesSessionRouteKey = buildLongFormSessionRouteKey;

export const resolveInduccionesDraftHydration = resolveLongFormDraftHydration;

export const resolveInduccionesSessionHydration =
  resolveInvisibleDraftSessionHydration;
