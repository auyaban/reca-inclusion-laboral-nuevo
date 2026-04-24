export type CatalogCacheState<T> = {
  data: T[];
  fetchedAt: number;
  inflight: Promise<T[]> | null;
};

export async function fetchCachedCatalog<T>(options: {
  cache: CatalogCacheState<T> | undefined;
  ttlMs: number;
  force?: boolean;
  fetcher: () => Promise<T[]>;
  setCache: (next: CatalogCacheState<T>) => void;
}) {
  const force = options.force === true;
  const now = Date.now();

  if (
    !force &&
    options.cache &&
    options.cache.inflight === null &&
    now - options.cache.fetchedAt < options.ttlMs
  ) {
    return options.cache.data;
  }

  if (!force && options.cache?.inflight) {
    return options.cache.inflight;
  }

  const inflight = options
    .fetcher()
    .then((data) => {
      options.setCache({
        data,
        fetchedAt: Date.now(),
        inflight: null,
      });
      return data;
    })
    .catch((error) => {
      options.setCache({
        data: options.cache?.data ?? [],
        fetchedAt: options.cache?.fetchedAt ?? 0,
        inflight: null,
      });
      throw error;
    });

  options.setCache({
    data: options.cache?.data ?? [],
    fetchedAt: options.cache?.fetchedAt ?? 0,
    inflight,
  });

  return inflight;
}
