import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  resolveLongFormSessionHydration,
  type LongFormDraftHydrationAction,
  type LongFormSessionHydrationAction,
} from "@/lib/longFormHydration";

export type SensibilizacionDraftHydrationAction = LongFormDraftHydrationAction;
export type SensibilizacionSessionHydrationAction =
  LongFormSessionHydrationAction;

export const buildSensibilizacionSessionRouteKey =
  buildLongFormSessionRouteKey;

export const resolveSensibilizacionDraftHydration =
  resolveLongFormDraftHydration;

export const resolveSensibilizacionSessionHydration =
  resolveLongFormSessionHydration;
