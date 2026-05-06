"use client";

import { useEffect, useRef, useState } from "react";
import type { Empresa } from "@/lib/store/empresaStore";

const MAX_EMPRESA_SEARCH_QUERY_LENGTH = 100;

export function useEmpresaSearch(query: string) {
  const [results, setResults] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasResolvedSearch, setHasResolvedSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalizedQuery = query.trim().slice(0, MAX_EMPRESA_SEARCH_QUERY_LENGTH);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      setHasResolvedSearch(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      setHasResolvedSearch(false);

      try {
        const response = await fetch(
          `/api/empresas/search?q=${encodeURIComponent(normalizedQuery)}`,
          { method: "GET" }
        );
        if (!response.ok) {
          throw new Error("empresa_search_failed");
        }
        const payload = (await response.json()) as { items?: Empresa[] };
        setResults(payload.items ?? []);
        setHasResolvedSearch(true);
      } catch {
        setError("Error al buscar empresas. Intenta de nuevo.");
        setResults([]);
        setHasResolvedSearch(false);
      }

      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [normalizedQuery]);

  return {
    results,
    loading,
    error,
    showNoResults:
      hasResolvedSearch &&
      !loading &&
      normalizedQuery.length >= 2 &&
      results.length === 0 &&
      !error,
  };
}
