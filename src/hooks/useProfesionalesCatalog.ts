"use client";

import { useEffect, useState } from "react";

export type Profesional = {
  nombre_profesional: string;
  cargo_profesional: string | null;
};

const TTL_MS = 5 * 60 * 1000;

let profesionalesCache:
  | {
      data: Profesional[];
      fetchedAt: number;
      inflight: Promise<Profesional[]> | null;
    }
  | undefined;

async function fetchProfesionalesCatalog() {
  const now = Date.now();
  if (
    profesionalesCache &&
    profesionalesCache.inflight === null &&
    now - profesionalesCache.fetchedAt < TTL_MS
  ) {
    return profesionalesCache.data;
  }

  if (profesionalesCache?.inflight) {
    return profesionalesCache.inflight;
  }

  const inflight = fetch("/api/profesionales")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Catálogo no disponible");
      }

      const payload = await response.json();
      return Array.isArray(payload) ? (payload as Profesional[]) : [];
    })
    .then((data) => {
      profesionalesCache = {
        data,
        fetchedAt: Date.now(),
        inflight: null,
      };
      return data;
    })
    .catch((error) => {
      profesionalesCache = {
        data: profesionalesCache?.data ?? [],
        fetchedAt: profesionalesCache?.fetchedAt ?? 0,
        inflight: null,
      };
      throw error;
    });

  profesionalesCache = {
    data: profesionalesCache?.data ?? [],
    fetchedAt: profesionalesCache?.fetchedAt ?? 0,
    inflight,
  };

  return inflight;
}

export function useProfesionalesCatalog() {
  const [profesionales, setProfesionales] = useState<Profesional[]>(
    profesionalesCache?.data ?? []
  );
  const [loading, setLoading] = useState(!profesionalesCache?.data?.length);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchProfesionalesCatalog()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setProfesionales(data);
        setError(null);
      })
      .catch((cause) => {
        if (cancelled) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo cargar el catálogo de profesionales."
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
    profesionales,
    loading,
    error,
  };
}
