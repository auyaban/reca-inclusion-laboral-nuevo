import {
  buildLongFormSessionRouteKey,
  resolveLongFormDraftHydration,
  resolveInvisibleDraftSessionHydration,
  type LongFormDraftHydrationAction,
  type InvisibleDraftSessionHydrationAction,
} from "@/lib/longFormHydration";

export type InterpreteLscDraftHydrationAction = LongFormDraftHydrationAction;

export type InterpreteLscSessionHydrationAction =
  InvisibleDraftSessionHydrationAction;

export const buildInterpreteLscSessionRouteKey = buildLongFormSessionRouteKey;

export const resolveInterpreteLscDraftHydration =
  resolveLongFormDraftHydration;

export const resolveInterpreteLscSessionHydration =
  resolveInvisibleDraftSessionHydration;
