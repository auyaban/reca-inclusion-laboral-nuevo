"use client";

import { useEffect, useRef, useState } from "react";
import {
  normalizeCedulaUsuario,
  type UsuarioRecaSearchResult,
} from "@/lib/usuariosReca";

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 32;

export function useUsuariosRecaSearch(query: string) {
  const [results, setResults] = useState<UsuarioRecaSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const normalizedQuery = normalizeCedulaUsuario(query).slice(
    0,
    MAX_QUERY_LENGTH
  );

  useEffect(() => {
    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(
          `/api/usuarios-reca?query=${encodeURIComponent(normalizedQuery)}`,
          { signal: controller.signal }
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload.error ?? "No fue posible buscar en usuarios RECA."
          );
        }

        setResults(Array.isArray(payload) ? payload : []);
      } catch (nextError) {
        if (
          nextError instanceof DOMException &&
          nextError.name === "AbortError"
        ) {
          return;
        }

        setResults([]);
        setError(
          nextError instanceof Error
            ? nextError.message
            : "No fue posible buscar en usuarios RECA."
        );
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [normalizedQuery]);

  return {
    results,
    loading,
    error,
    normalizedQuery,
    showNoResults:
      !loading &&
      normalizedQuery.length >= MIN_QUERY_LENGTH &&
      results.length === 0 &&
      !error,
  };
}
