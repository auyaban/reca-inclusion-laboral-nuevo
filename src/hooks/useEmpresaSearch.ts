"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EMPRESA_SEARCH_FIELDS } from "@/lib/empresa";
import type { Empresa } from "@/lib/store/empresaStore";

export function useEmpresaSearch(query: string) {
  const [results, setResults] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: searchError } = await supabase
        .from("empresas")
        .select(EMPRESA_SEARCH_FIELDS)
        .ilike("nombre_empresa", `%${query.trim()}%`)
        .order("nombre_empresa", { ascending: true })
        .limit(20);

      if (searchError) {
        setError("Error al buscar empresas. Intenta de nuevo.");
      } else {
        setResults(((data ?? []) as unknown) as Empresa[]);
      }

      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  return {
    results,
    loading,
    error,
    showNoResults:
      !loading && query.trim().length >= 2 && results.length === 0 && !error,
  };
}
