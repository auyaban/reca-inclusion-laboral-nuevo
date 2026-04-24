"use client";

import { useCallback, useEffect, useState } from "react";

type CatalogLoadOptions = { force?: boolean };

export function useCatalogResource<T>(options: {
  initialData: T[];
  load: (loadOptions?: CatalogLoadOptions) => Promise<T[]>;
  defaultLoadError: string;
}) {
  const { initialData, load, defaultLoadError } = options;
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(!initialData.length);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (loadOptions?: CatalogLoadOptions) => {
      try {
        setLoading(true);
        const nextData = await load(loadOptions);
        setData(nextData);
        setError(null);
        return nextData;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : defaultLoadError;
        setError(message);
        throw cause;
      } finally {
        setLoading(false);
      }
    },
    [defaultLoadError, load]
  );

  useEffect(() => {
    let cancelled = false;

    load()
      .then((nextData) => {
        if (cancelled) {
          return;
        }

        setData(nextData);
        setError(null);
      })
      .catch((cause) => {
        if (cancelled) {
          return;
        }

        setError(
          cause instanceof Error ? cause.message : defaultLoadError
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
  }, [defaultLoadError, load]);

  return {
    data,
    loading,
    error,
    refresh,
    setData,
    setError,
    setLoading,
  };
}
