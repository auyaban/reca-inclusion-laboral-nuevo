import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  buildIpRateLimitKey,
  consumeMemoryRateLimit,
  type MemoryRateLimitResult,
  warnMemoryRateLimitFallbackOnce,
} from "@/lib/security/rateLimit";

export const INTERPRETES_CATALOG_RATE_LIMIT = {
  limit: 5,
  windowMs: 60_000,
  window: "60 s",
} as const;

const RATE_LIMIT_PREFIX = "reca:interpretes_catalog";
const RATE_LIMIT_ERROR =
  "Demasiados intentos de crear interpretes. Intenta de nuevo en unos segundos.";

type UpstashRateLimiterResult = {
  success: boolean;
  remaining?: number;
  reset: number;
  pending?: Promise<unknown>;
};

type UpstashRateLimiter = {
  limit: (identifier: string) => Promise<UpstashRateLimiterResult>;
};

interface UpstashConfig {
  url: string;
  token: string;
}

export type InterpretesCatalogRateLimitDecision =
  | {
      allowed: true;
      backend: "memory" | "upstash";
      remaining: number | null;
    }
  | {
      allowed: false;
      backend: "memory" | "upstash";
      error: string;
      status: 429;
      retryAfterSeconds: number;
    };

interface InterpretesCatalogRateLimitDependencies {
  consumeMemoryRateLimit?: (
    options: Parameters<typeof consumeMemoryRateLimit>[0]
  ) => MemoryRateLimitResult;
  createUpstashRateLimiter?: (config: UpstashConfig) => UpstashRateLimiter;
  env?: NodeJS.ProcessEnv;
  now?: () => number;
}

declare global {
  var __recaInterpretesCatalogUpstashRateLimiter__:
    | {
        configKey: string;
        limiter: UpstashRateLimiter;
      }
    | undefined;
}

function readUpstashConfig(env: NodeJS.ProcessEnv): UpstashConfig | null {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

function buildUpstashConfigCacheKey(config: UpstashConfig) {
  const tokenFingerprint = createHash("sha256")
    .update(config.token)
    .digest("hex")
    .slice(0, 16);

  return `${config.url}|${tokenFingerprint}`;
}

function getCachedUpstashRateLimiter(config: UpstashConfig): UpstashRateLimiter {
  const configKey = buildUpstashConfigCacheKey(config);
  const cached = globalThis.__recaInterpretesCatalogUpstashRateLimiter__;

  if (cached?.configKey === configKey) {
    return cached.limiter;
  }

  const redis = new Redis({
    url: config.url,
    token: config.token,
  });

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      INTERPRETES_CATALOG_RATE_LIMIT.limit,
      INTERPRETES_CATALOG_RATE_LIMIT.window
    ),
    analytics: false,
    prefix: RATE_LIMIT_PREFIX,
  });

  globalThis.__recaInterpretesCatalogUpstashRateLimiter__ = {
    configKey,
    limiter,
  };

  return limiter;
}

function toRetryAfterSeconds(resetAt: number, now: number) {
  return Math.max(Math.ceil((resetAt - now) / 1000), 1);
}

export async function enforceInterpretesCatalogRateLimit(
  headers: Headers,
  dependencies: InterpretesCatalogRateLimitDependencies = {}
): Promise<InterpretesCatalogRateLimitDecision> {
  const now = dependencies.now?.() ?? Date.now();
  const env = dependencies.env ?? process.env;
  const nodeEnv = env.NODE_ENV ?? process.env.NODE_ENV ?? null;
  const upstashConfig = readUpstashConfig(env);

  if (upstashConfig) {
    try {
      const limiter =
        dependencies.createUpstashRateLimiter?.(upstashConfig) ??
        getCachedUpstashRateLimiter(upstashConfig);
      const result = await limiter.limit(
        buildIpRateLimitKey("interpretes_catalog", headers)
      );
      void result.pending?.catch(() => {});

      if (result.success) {
        return {
          allowed: true,
          backend: "upstash",
          remaining: result.remaining ?? null,
        };
      }

      return {
        allowed: false,
        backend: "upstash",
        error: RATE_LIMIT_ERROR,
        status: 429,
        retryAfterSeconds: toRetryAfterSeconds(result.reset, now),
      };
    } catch (error) {
      if (nodeEnv === "production") {
        warnMemoryRateLimitFallbackOnce({
          limiter: "interpretes_catalog",
          reason: "request_failed",
          nodeEnv,
          error,
        });
      }
    }
  } else if (nodeEnv === "production") {
    warnMemoryRateLimitFallbackOnce({
      limiter: "interpretes_catalog",
      reason: "missing_config",
      nodeEnv,
    });
  }

  const consumeMemory =
    dependencies.consumeMemoryRateLimit ?? consumeMemoryRateLimit;
  const result = consumeMemory({
    key: buildIpRateLimitKey("interpretes_catalog", headers),
    limit: INTERPRETES_CATALOG_RATE_LIMIT.limit,
    windowMs: INTERPRETES_CATALOG_RATE_LIMIT.windowMs,
    now,
  });

  if (result.allowed) {
    return {
      allowed: true,
      backend: "memory",
      remaining: result.remaining,
    };
  }

  return {
    allowed: false,
    backend: "memory",
    error: RATE_LIMIT_ERROR,
    status: 429,
    retryAfterSeconds: result.retryAfterSeconds,
  };
}

export function resetInterpretesCatalogRateLimitForTests() {
  globalThis.__recaInterpretesCatalogUpstashRateLimiter__ = undefined;
}
