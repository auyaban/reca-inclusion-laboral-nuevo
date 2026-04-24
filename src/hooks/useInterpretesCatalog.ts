"use client";

import { useCallback, useState } from "react";
import { fetchCachedCatalog, type CatalogCacheState } from "@/lib/catalogCache";
import {
  buildInterpreteNameKey,
  normalizeInterpreteName,
  sortInterpretes,
} from "@/lib/interpretesCatalog";
import { useCatalogResource } from "@/hooks/useCatalogResource";
export type { InterpreteCatalogItem } from "@/lib/interpretesCatalog";
import type { InterpreteCatalogItem } from "@/lib/interpretesCatalog";

const TTL_MS = 5 * 60 * 1000;

let interpretesCache: CatalogCacheState<InterpreteCatalogItem> | undefined;

function isInterpreteCatalogItem(value: unknown): value is InterpreteCatalogItem {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).id === "string" &&
      typeof (value as Record<string, unknown>).nombre === "string"
  );
}

function mergeInterprete(
  items: readonly InterpreteCatalogItem[],
  nextItem: InterpreteCatalogItem
) {
  const nextNameKey = buildInterpreteNameKey(nextItem.nombre);
  const filtered = items.filter(
    (item) => buildInterpreteNameKey(item.nombre) !== nextNameKey
  );
  return sortInterpretes([...filtered, nextItem]);
}

async function fetchInterpretesCatalog(options?: { force?: boolean }) {
  return fetchCachedCatalog({
    cache: interpretesCache,
    ttlMs: TTL_MS,
    force: options?.force,
    fetcher: async () => {
      const response = await fetch("/api/interpretes");
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Catalogo no disponible"
        );
      }

      const payload = await response.json();
      return Array.isArray(payload)
        ? sortInterpretes(payload.filter(isInterpreteCatalogItem))
        : [];
    },
    setCache(next) {
      interpretesCache = next;
    },
  });
}

export function resetInterpretesCatalogCache() {
  interpretesCache = undefined;
}

export function useInterpretesCatalog() {
  const [creatingName, setCreatingName] = useState<string | null>(null);
  const {
    data: interpretes,
    loading,
    error,
    refresh,
    setData: setInterpretes,
    setError,
  } = useCatalogResource<InterpreteCatalogItem>({
    initialData: interpretesCache?.data ?? [],
    load: fetchInterpretesCatalog,
    defaultLoadError: "No se pudo cargar el catalogo de interpretes.",
  });

  const createInterprete = useCallback(
    async (nombre: string) => {
      const normalizedName = normalizeInterpreteName(nombre);
      if (!normalizedName) {
        throw new Error("El nombre del interprete es obligatorio.");
      }

      setCreatingName(normalizedName);
      setError(null);

      try {
        const response = await fetch("/api/interpretes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: normalizedName }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            typeof payload?.error === "string"
              ? payload.error
              : "No se pudo crear el interprete."
          );
        }

        if (!isInterpreteCatalogItem(payload)) {
          throw new Error("La respuesta del catalogo de interpretes es invalida.");
        }

        const nextInterpretes = mergeInterprete(interpretesCache?.data ?? [], payload);
        interpretesCache = {
          data: nextInterpretes,
          fetchedAt: Date.now(),
          inflight: null,
        };
        setInterpretes(nextInterpretes);
        return payload;
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "No se pudo crear el interprete.";
        setError(message);
        throw cause;
      } finally {
        setCreatingName(null);
      }
    },
    [setError, setInterpretes]
  );

  return {
    interpretes,
    loading,
    error,
    creatingName,
    refresh,
    createInterprete,
  };
}
