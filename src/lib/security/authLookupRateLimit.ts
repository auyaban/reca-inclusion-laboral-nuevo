import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  buildIpRateLimitKey,
  consumeMemoryRateLimit,
  type MemoryRateLimitResult,
} from "@/lib/security/rateLimit";

export const AUTH_LOOKUP_RATE_LIMIT = {
  limit: 10,
  windowMs: 5 * 60 * 1000,
  window: "5 m",
} as const;

const AUTH_LOOKUP_RATE_LIMIT_PREFIX = "reca:auth_lookup";
const AUTH_LOOKUP_RATE_LIMIT_ERROR =
  "Demasiados intentos. Intenta de nuevo más tarde.";
const AUTH_LOOKUP_RATE_LIMIT_UNAVAILABLE_ERROR =
  "Servicio temporalmente no disponible.";

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

export type AuthLookupRateLimitDecision =
  | {
      allowed: true;
      backend: "memory" | "upstash";
      remaining: number | null;
    }
  | {
      allowed: false;
      backend: "memory" | "upstash" | "unavailable";
      error: string;
      status: 429 | 503;
      retryAfterSeconds: number | null;
    };

interface AuthLookupRateLimitDependencies {
  consumeMemoryRateLimit?: (
    options: Parameters<typeof consumeMemoryRateLimit>[0]
  ) => MemoryRateLimitResult;
  createUpstashRateLimiter?: (config: UpstashConfig) => UpstashRateLimiter;
  env?: NodeJS.ProcessEnv;
  nodeEnv?: string | null | undefined;
  now?: () => number;
}

declare global {
  var __recaAuthLookupUpstashRateLimiter__:
    | {
        configKey: string;
        limiter: UpstashRateLimiter;
      }
    | undefined;
}

function buildUnavailableDecision(): AuthLookupRateLimitDecision {
  return {
    allowed: false,
    backend: "unavailable",
    error: AUTH_LOOKUP_RATE_LIMIT_UNAVAILABLE_ERROR,
    status: 503,
    retryAfterSeconds: null,
  };
}

function toRetryAfterSeconds(resetAt: number, now: number) {
  return Math.max(Math.ceil((resetAt - now) / 1000), 1);
}

function readUpstashConfig(
  env: NodeJS.ProcessEnv
): UpstashConfig | null {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

export function buildUpstashConfigCacheKey(config: UpstashConfig) {
  const tokenFingerprint = createHash("sha256")
    .update(config.token)
    .digest("hex")
    .slice(0, 16);

  return `${config.url}|${tokenFingerprint}`;
}

function logUpstashRateLimitFailure(
  reason: "missing_config" | "request_failed",
  nodeEnv: string | null | undefined,
  error?: unknown
) {
  console.error("[auth-rate-limit] Upstash unavailable", {
    backend: "upstash",
    nodeEnv: nodeEnv ?? null,
    reason,
    error:
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : error == null
            ? null
            : String(error),
  });
}

function createMemoryDecision(
  headers: Headers,
  consumeMemory: (
    options: Parameters<typeof consumeMemoryRateLimit>[0]
  ) => MemoryRateLimitResult,
  now: number
): AuthLookupRateLimitDecision {
  const result = consumeMemory({
    key: buildIpRateLimitKey("auth_lookup", headers),
    limit: AUTH_LOOKUP_RATE_LIMIT.limit,
    windowMs: AUTH_LOOKUP_RATE_LIMIT.windowMs,
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
    error: AUTH_LOOKUP_RATE_LIMIT_ERROR,
    status: 429,
    retryAfterSeconds: result.retryAfterSeconds,
  };
}

function getCachedUpstashRateLimiter(config: UpstashConfig): UpstashRateLimiter {
  const configKey = buildUpstashConfigCacheKey(config);
  const cached = globalThis.__recaAuthLookupUpstashRateLimiter__;

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
      AUTH_LOOKUP_RATE_LIMIT.limit,
      AUTH_LOOKUP_RATE_LIMIT.window
    ),
    analytics: false,
    prefix: AUTH_LOOKUP_RATE_LIMIT_PREFIX,
  });

  globalThis.__recaAuthLookupUpstashRateLimiter__ = {
    configKey,
    limiter,
  };

  return limiter;
}

export async function enforceAuthLookupRateLimit(
  headers: Headers,
  dependencies: AuthLookupRateLimitDependencies = {}
): Promise<AuthLookupRateLimitDecision> {
  const env = dependencies.env ?? process.env;
  const nodeEnv = dependencies.nodeEnv ?? process.env.NODE_ENV;
  const isProduction = nodeEnv === "production";
  const now = dependencies.now?.() ?? Date.now();
  const upstashConfig = readUpstashConfig(env);
  const consumeMemory =
    dependencies.consumeMemoryRateLimit ?? consumeMemoryRateLimit;

  if (upstashConfig) {
    try {
      const limiter =
        dependencies.createUpstashRateLimiter?.(upstashConfig) ??
        getCachedUpstashRateLimiter(upstashConfig);
      const result = await limiter.limit(
        buildIpRateLimitKey("auth_lookup", headers)
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
        error: AUTH_LOOKUP_RATE_LIMIT_ERROR,
        status: 429,
        retryAfterSeconds: toRetryAfterSeconds(result.reset, now),
      };
    } catch (error) {
      logUpstashRateLimitFailure("request_failed", nodeEnv, error);
      if (isProduction) {
        return buildUnavailableDecision();
      }
    }
  } else if (isProduction) {
    logUpstashRateLimitFailure("missing_config", nodeEnv);
    return buildUnavailableDecision();
  }

  return createMemoryDecision(headers, consumeMemory, now);
}

export function resetAuthLookupRateLimitForTests() {
  globalThis.__recaAuthLookupUpstashRateLimiter__ = undefined;
}
