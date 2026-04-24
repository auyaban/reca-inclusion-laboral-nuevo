"use client";

import { fetchCachedCatalog, type CatalogCacheState } from "@/lib/catalogCache";
import { useCatalogResource } from "@/hooks/useCatalogResource";

export type Profesional = {
  nombre_profesional: string;
  cargo_profesional: string | null;
};

const TTL_MS = 5 * 60 * 1000;

let profesionalesCache: CatalogCacheState<Profesional> | undefined;

export async function fetchProfesionalesCatalog(options?: { force?: boolean }) {
  return fetchCachedCatalog({
    cache: profesionalesCache,
    ttlMs: TTL_MS,
    force: options?.force,
    fetcher: async () => {
      const response = await fetch("/api/profesionales");
      if (!response.ok) {
        throw new Error("Catálogo no disponible");
      }

      const payload = await response.json();
      return Array.isArray(payload) ? (payload as Profesional[]) : [];
    },
    setCache(next) {
      profesionalesCache = next;
    },
  });
}

export function resetProfesionalesCatalogCache() {
  profesionalesCache = undefined;
}

export function useProfesionalesCatalog() {
  const {
    data: profesionales,
    loading,
    error,
    refresh,
  } = useCatalogResource<Profesional>({
    initialData: profesionalesCache?.data ?? [],
    load: fetchProfesionalesCatalog,
    defaultLoadError: "No se pudo cargar el catálogo de profesionales.",
  });

  return {
    profesionales,
    loading,
    error,
    refresh,
  };
}
