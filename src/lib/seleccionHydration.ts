import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  resolveLongFormSessionHydration,
  type LongFormDraftHydrationAction,
  type LongFormSessionHydrationAction,
} from "@/lib/longFormHydration";

export type SeleccionDraftHydrationAction = LongFormDraftHydrationAction;
export type SeleccionSessionHydrationAction = LongFormSessionHydrationAction;

export const buildSeleccionSessionRouteKey = buildLongFormSessionRouteKey;

export const resolveSeleccionDraftHydration = resolveLongFormDraftHydration;

export const resolveSeleccionSessionHydration =
  resolveLongFormSessionHydration;
