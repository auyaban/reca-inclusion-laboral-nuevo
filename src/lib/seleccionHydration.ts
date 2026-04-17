import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  resolveInvisibleDraftSessionHydration,
  type LongFormDraftHydrationAction,
  type InvisibleDraftSessionHydrationAction,
} from "@/lib/longFormHydration";

export type SeleccionDraftHydrationAction = LongFormDraftHydrationAction;
export type SeleccionSessionHydrationAction =
  InvisibleDraftSessionHydrationAction;

export const buildSeleccionSessionRouteKey = buildLongFormSessionRouteKey;

export const resolveSeleccionDraftHydration = resolveLongFormDraftHydration;

export const resolveSeleccionSessionHydration =
  resolveInvisibleDraftSessionHydration;
