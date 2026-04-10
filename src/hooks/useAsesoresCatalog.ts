"use client";

import { useEffect, useState } from "react";

export type Asesor = {
  nombre: string;
};

const TTL_MS = 5 * 60 * 1000;

let asesoresCache:
  | {
      data: Asesor[];
      fetchedAt: number;
      inflight: Promise<Asesor[]> | null;
    }
  | undefined;

async function fetchAsesoresCatalog() {
  const now = Date.now();
  if (
    asesoresCache &&
    asesoresCache.inflight === null &&
    now - asesoresCache.fetchedAt < TTL_MS
  ) {
    return asesoresCache.data;
  }

  if (asesoresCache?.inflight) {
    return asesoresCache.inflight;
  }

  const inflight = fetch("/api/asesores")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Catálogo no disponible");
      }

      const payload = await response.json();
      return Array.isArray(payload) ? (payload as Asesor[]) : [];
    })
    .then((data) => {
      asesoresCache = {
        data,
        fetchedAt: Date.now(),
        inflight: null,
      };
      return data;
    })
    .catch((error) => {
      asesoresCache = {
        data: asesoresCache?.data ?? [],
        fetchedAt: asesoresCache?.fetchedAt ?? 0,
        inflight: null,
      };
      throw error;
    });

  asesoresCache = {
    data: asesoresCache?.data ?? [],
    fetchedAt: asesoresCache?.fetchedAt ?? 0,
    inflight,
  };

  return inflight;
}

export function useAsesoresCatalog() {
  const [asesores, setAsesores] = useState<Asesor[]>(asesoresCache?.data ?? []);
  const [loading, setLoading] = useState(!asesoresCache?.data?.length);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAsesoresCatalog()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setAsesores(data);
        setError(null);
      })
      .catch((cause) => {
        if (cancelled) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo cargar el catálogo de asesores."
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

  return {
    asesores,
    loading,
    error,
  };
}
