interface MemoryRateLimitEntry {
  count: number;
  resetAt: number;
}

type MemoryRateLimitStore = Map<string, MemoryRateLimitEntry>;
const SWEEP_INTERVAL_MS = 60_000;
let lastSweepAt = 0;

declare global {
  var __recaMemoryRateLimitStore__: MemoryRateLimitStore | undefined;
  var __recaRateLimitFallbackWarnings__: Set<string> | undefined;
}

export interface MemoryRateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}

export interface MemoryRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
}

export type MemoryRateLimitFallbackReason =
  | "missing_config"
  | "request_failed";

function getRateLimitStore(): MemoryRateLimitStore {
  if (!globalThis.__recaMemoryRateLimitStore__) {
    globalThis.__recaMemoryRateLimitStore__ = new Map();
  }

  return globalThis.__recaMemoryRateLimitStore__;
}

function getRateLimitFallbackWarningsStore() {
  if (!globalThis.__recaRateLimitFallbackWarnings__) {
    globalThis.__recaRateLimitFallbackWarnings__ = new Set();
  }

  return globalThis.__recaRateLimitFallbackWarnings__;
}

function sweepExpiredEntries(store: MemoryRateLimitStore, now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

function maybeSweep(store: MemoryRateLimitStore, now: number) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) {
    return;
  }

  sweepExpiredEntries(store, now);
  lastSweepAt = now;
}

export function getClientIpFromHeaders(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstForwardedIp = forwardedFor
      .split(",")
      .map((value) => value.trim())
      .find(Boolean);

    if (firstForwardedIp) {
      return firstForwardedIp;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function buildIpRateLimitKey(prefix: string, headers: Headers) {
  return `${prefix}:${getClientIpFromHeaders(headers)}`;
}

export function warnMemoryRateLimitFallbackOnce(options: {
  limiter: string;
  reason: MemoryRateLimitFallbackReason;
  nodeEnv?: string | null | undefined;
  error?: unknown;
}) {
  const nodeEnv = options.nodeEnv ?? null;
  if (nodeEnv !== "production") {
    return;
  }
  const warningKey = `${options.limiter}:${options.reason}`;
  const warnings = getRateLimitFallbackWarningsStore();

  if (warnings.has(warningKey)) {
    return;
  }

  warnings.add(warningKey);
  console.warn("[rate-limit] Falling back to memory limiter", {
    limiter: options.limiter,
    backend: "memory",
    reason: options.reason,
    nodeEnv,
    error:
      options.error instanceof Error
        ? options.error.message
        : typeof options.error === "string"
          ? options.error
          : options.error == null
            ? null
            : String(options.error),
  });
}

// Mitigación best-effort en memoria: útil para tráfico bajo, pero no reemplaza
// un rate limiter distribuido entre instancias serverless.
export function consumeMemoryRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
}: MemoryRateLimitOptions): MemoryRateLimitResult {
  const store = getRateLimitStore();
  maybeSweep(store, now);

  const currentEntry = store.get(key);
  if (!currentEntry || currentEntry.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: 0,
      resetAt,
    };
  }

  if (currentEntry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((currentEntry.resetAt - now) / 1000), 1),
      resetAt: currentEntry.resetAt,
    };
  }

  currentEntry.count += 1;
  store.set(key, currentEntry);

  return {
    allowed: true,
    remaining: Math.max(limit - currentEntry.count, 0),
    retryAfterSeconds: 0,
    resetAt: currentEntry.resetAt,
  };
}

export function resetMemoryRateLimitStoreForTests() {
  getRateLimitStore().clear();
  getRateLimitFallbackWarningsStore().clear();
  lastSweepAt = 0;
}
