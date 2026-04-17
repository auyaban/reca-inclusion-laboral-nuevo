import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  resolveInvisibleDraftSessionHydration,
  type LongFormDraftHydrationAction,
  type InvisibleDraftSessionHydrationAction,
} from "@/lib/longFormHydration";

export type SensibilizacionDraftHydrationAction =
  LongFormDraftHydrationAction;

export type SensibilizacionSessionHydrationAction =
  InvisibleDraftSessionHydrationAction;

export const buildSensibilizacionSessionRouteKey =
  buildLongFormSessionRouteKey;

export const resolveSensibilizacionDraftHydration =
  resolveLongFormDraftHydration;

export const resolveSensibilizacionSessionHydration =
  resolveInvisibleDraftSessionHydration;
