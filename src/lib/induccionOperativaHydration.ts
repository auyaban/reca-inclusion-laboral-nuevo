import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  resolveLongFormSessionHydration,
  type LongFormDraftHydrationAction,
  type LongFormSessionHydrationAction,
} from "@/lib/longFormHydration";

export type InduccionOperativaDraftHydrationAction =
  LongFormDraftHydrationAction;

export type InduccionOperativaSessionHydrationAction =
  LongFormSessionHydrationAction;

export const buildInduccionOperativaSessionRouteKey =
  buildLongFormSessionRouteKey;

export const resolveInduccionOperativaDraftHydration =
  resolveLongFormDraftHydration;

export const resolveInduccionOperativaSessionHydration =
  resolveLongFormSessionHydration;
