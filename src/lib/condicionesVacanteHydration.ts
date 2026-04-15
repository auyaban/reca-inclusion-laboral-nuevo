import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  resolveLongFormSessionHydration,
  type LongFormDraftHydrationAction,
  type LongFormSessionHydrationAction,
} from "@/lib/longFormHydration";

export type CondicionesVacanteDraftHydrationAction =
  LongFormDraftHydrationAction;
export type CondicionesVacanteSessionHydrationAction =
  LongFormSessionHydrationAction;

export const buildCondicionesVacanteSessionRouteKey =
  buildLongFormSessionRouteKey;

export const resolveCondicionesVacanteDraftHydration =
  resolveLongFormDraftHydration;

export const resolveCondicionesVacanteSessionHydration =
  resolveLongFormSessionHydration;
