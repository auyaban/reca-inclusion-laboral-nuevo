"use client";

import { useCallback, useEffect, useState } from "react";
import type { CondicionesVacanteCatalogs } from "@/lib/condicionesVacante";

export const CONDICIONES_VACANTE_CATALOGS_TTL_MS = 5 * 60 * 1000;
export type CondicionesVacanteCatalogsStatus = "loading" | "ready" | "error";

let catalogsCache:
  | {
      data: CondicionesVacanteCatalogs | null;
      fetchedAt: number;
      inflight: Promise<CondicionesVacanteCatalogs> | null;
    }
  | undefined;

function getCatalogErrorMessage(cause: unknown) {
  return cause instanceof Error
    ? cause.message
    : "No se pudo cargar el catalogo de discapacidades.";
}

export async function fetchCondicionesVacanteCatalogs({
  force = false,
}: {
  force?: boolean;
} = {}) {
  const now = Date.now();
  if (
    !force &&
    catalogsCache &&
    catalogsCache.inflight === null &&
    now - catalogsCache.fetchedAt < CONDICIONES_VACANTE_CATALOGS_TTL_MS &&
    catalogsCache.data
  ) {
    return catalogsCache.data;
  }

  if (!force && catalogsCache?.inflight) {
    return catalogsCache.inflight;
  }

  const inflight = fetch("/api/condiciones-vacante-discapacidades")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Catalogo no disponible");
      }

      const payload = (await response.json()) as CondicionesVacanteCatalogs;
      return payload;
    })
    .then((data) => {
      catalogsCache = {
        data,
        fetchedAt: Date.now(),
        inflight: null,
      };
      return data;
    })
    .catch((error) => {
      catalogsCache = {
        data: catalogsCache?.data ?? null,
        fetchedAt: catalogsCache?.fetchedAt ?? 0,
        inflight: null,
      };
      throw error;
    });

  catalogsCache = {
    data: catalogsCache?.data ?? null,
    fetchedAt: catalogsCache?.fetchedAt ?? 0,
    inflight,
  };

  return inflight;
}

export function __resetCondicionesVacanteCatalogsCache() {
  catalogsCache = undefined;
}

export function useCondicionesVacanteCatalogs() {
  const [catalogs, setCatalogs] = useState<CondicionesVacanteCatalogs | null>(() =>
    catalogsCache?.data ?? null
  );
  const [loading, setLoading] = useState(() => !catalogsCache?.data);
  const [error, setError] = useState<string | null>(null);

  const loadCatalogs = useCallback(async (force = false) => {
    setLoading(true);

    try {
      const data = await fetchCondicionesVacanteCatalogs({ force });
      setCatalogs(data);
      setError(null);
      return data;
    } catch (cause) {
      setCatalogs(catalogsCache?.data ?? null);
      setError(getCatalogErrorMessage(cause));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadCatalogs().then((data) => {
      if (cancelled) {
        return;
      }

      if (!data) {
        setCatalogs(catalogsCache?.data ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadCatalogs]);

  const retry = useCallback(async () => {
    return loadCatalogs(true);
  }, [loadCatalogs]);

  const status: CondicionesVacanteCatalogsStatus = catalogs
    ? "ready"
    : loading
      ? "loading"
      : "error";

  return {
    catalogs,
    loading,
    error,
    status,
    retry,
  };
}
