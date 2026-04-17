import {
  buildInduccionesSessionRouteKey,
  resolveInduccionesDraftHydration,
  resolveInduccionesSessionHydration,
  type InduccionesDraftHydrationAction,
  type InduccionesSessionHydrationAction,
} from "@/lib/induccionesDraftHydration";

export type InduccionOrganizacionalDraftHydrationAction =
  InduccionesDraftHydrationAction;
export type InduccionOrganizacionalSessionHydrationAction =
  InduccionesSessionHydrationAction;

export const buildInduccionOrganizacionalSessionRouteKey =
  buildInduccionesSessionRouteKey;

export const resolveInduccionOrganizacionalDraftHydration =
  resolveInduccionesDraftHydration;

export const resolveInduccionOrganizacionalSessionHydration =
  resolveInduccionesSessionHydration;
