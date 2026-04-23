"use client";

import { useCallback, useEffect, useState } from "react";

export type InterpreteCatalogItem = {
  id: string;
  nombre: string;
};

const TTL_MS = 5 * 60 * 1000;

let interpretesCache:
  | {
      data: InterpreteCatalogItem[];
      fetchedAt: number;
      inflight: Promise<InterpreteCatalogItem[]> | null;
    }
  | undefined;

function normalizeInterpreteName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function buildInterpreteNameKey(value: string) {
  return normalizeInterpreteName(value).toLocaleLowerCase("es-CO");
}

function isInterpreteCatalogItem(value: unknown): value is InterpreteCatalogItem {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).id === "string" &&
      typeof (value as Record<string, unknown>).nombre === "string"
  );
}

function sortInterpretes(items: readonly InterpreteCatalogItem[]) {
  return [...items].sort((left, right) =>
    left.nombre.localeCompare(right.nombre, "es-CO", {
      sensitivity: "base",
    })
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
  const force = options?.force === true;
  const now = Date.now();

  if (
    !force &&
    interpretesCache &&
    interpretesCache.inflight === null &&
    now - interpretesCache.fetchedAt < TTL_MS
  ) {
    return interpretesCache.data;
  }

  if (!force && interpretesCache?.inflight) {
    return interpretesCache.inflight;
  }

  const inflight = fetch("/api/interpretes")
    .then(async (response) => {
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
    })
    .then((data) => {
      interpretesCache = {
        data,
        fetchedAt: Date.now(),
        inflight: null,
      };
      return data;
    })
    .catch((error) => {
      interpretesCache = {
        data: interpretesCache?.data ?? [],
        fetchedAt: interpretesCache?.fetchedAt ?? 0,
        inflight: null,
      };
      throw error;
    });

  interpretesCache = {
    data: interpretesCache?.data ?? [],
    fetchedAt: interpretesCache?.fetchedAt ?? 0,
    inflight,
  };

  return inflight;
}

export function resetInterpretesCatalogCache() {
  interpretesCache = undefined;
}

export function useInterpretesCatalog() {
  const [interpretes, setInterpretes] = useState<InterpreteCatalogItem[]>(
    interpretesCache?.data ?? []
  );
  const [loading, setLoading] = useState(!interpretesCache?.data?.length);
  const [error, setError] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    try {
      setLoading(true);
      const data = await fetchInterpretesCatalog(options);
      setInterpretes(data);
      setError(null);
      return data;
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "No se pudo cargar el catalogo de interpretes.";
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchInterpretesCatalog()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setInterpretes(data);
        setError(null);
      })
      .catch((cause) => {
        if (cancelled) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo cargar el catalogo de interpretes."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    []
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
