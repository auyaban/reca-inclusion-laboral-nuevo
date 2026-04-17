import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  resolveInvisibleDraftSessionHydration,
  type LongFormDraftHydrationAction,
  type InvisibleDraftSessionHydrationAction,
} from "@/lib/longFormHydration";

export type CondicionesVacanteDraftHydrationAction =
  LongFormDraftHydrationAction;
export type CondicionesVacanteSessionHydrationAction =
  InvisibleDraftSessionHydrationAction;

export const buildCondicionesVacanteSessionRouteKey =
  buildLongFormSessionRouteKey;

export const resolveCondicionesVacanteDraftHydration =
  resolveLongFormDraftHydration;

export const resolveCondicionesVacanteSessionHydration =
  resolveInvisibleDraftSessionHydration;
