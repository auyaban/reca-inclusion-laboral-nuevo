import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  consumeMemoryRateLimit,
  type MemoryRateLimitResult,
  warnMemoryRateLimitFallbackOnce,
} from "@/lib/security/rateLimit";

export const PREWARM_RATE_LIMIT = {
  limit: 6,
  windowMs: 60_000,
  window: "60 s",
} as const;

const PREWARM_RATE_LIMIT_PREFIX = "reca:google_prewarm";
const PREWARM_RATE_LIMIT_ERROR =
  "Demasiados intentos de preparar Google. Intenta de nuevo en unos segundos.";

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

export type PrewarmRateLimitDecision =
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

interface PrewarmRateLimitDependencies {
  consumeMemoryRateLimit?: (
    options: Parameters<typeof consumeMemoryRateLimit>[0]
  ) => MemoryRateLimitResult;
  createUpstashRateLimiter?: (config: UpstashConfig) => UpstashRateLimiter;
  env?: NodeJS.ProcessEnv;
  now?: () => number;
}

declare global {
  var __recaPrewarmUpstashRateLimiter__:
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

function toRetryAfterSeconds(resetAt: number, now: number) {
  return Math.max(Math.ceil((resetAt - now) / 1000), 1);
}

function buildPrewarmRateLimitKey(options: {
  userId: string;
  draftId: string;
  formSlug: string;
  empresaKey?: string | null;
  structureSignature?: string | null;
}) {
  const fineFingerprint = createHash("sha256")
    .update(
      [
        options.empresaKey?.trim().toLowerCase() ?? "",
        options.structureSignature?.trim() ?? "",
      ].join("|")
    )
    .digest("hex")
    .slice(0, 16);

  return `${PREWARM_RATE_LIMIT_PREFIX}:${options.userId}:${options.formSlug}:${options.draftId}:${fineFingerprint}`;
}

function getCachedUpstashRateLimiter(config: UpstashConfig): UpstashRateLimiter {
  const configKey = buildUpstashConfigCacheKey(config);
  const cached = globalThis.__recaPrewarmUpstashRateLimiter__;

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
      PREWARM_RATE_LIMIT.limit,
      PREWARM_RATE_LIMIT.window
    ),
    analytics: false,
    prefix: PREWARM_RATE_LIMIT_PREFIX,
  });

  globalThis.__recaPrewarmUpstashRateLimiter__ = {
    configKey,
    limiter,
  };

  return limiter;
}

export async function enforcePrewarmRateLimit(
  options: {
    userId: string;
    draftId: string;
    formSlug: string;
    empresaKey?: string | null;
    structureSignature?: string | null;
  },
  dependencies: PrewarmRateLimitDependencies = {}
): Promise<PrewarmRateLimitDecision> {
  const now = dependencies.now?.() ?? Date.now();
  const env = dependencies.env ?? process.env;
  const nodeEnv = env.NODE_ENV ?? process.env.NODE_ENV ?? null;
  const key = buildPrewarmRateLimitKey(options);
  const upstashConfig = readUpstashConfig(env);

  if (upstashConfig) {
    try {
      const limiter =
        dependencies.createUpstashRateLimiter?.(upstashConfig) ??
        getCachedUpstashRateLimiter(upstashConfig);
      const result = await limiter.limit(key);
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
        error: PREWARM_RATE_LIMIT_ERROR,
        status: 429,
        retryAfterSeconds: toRetryAfterSeconds(result.reset, now),
      };
    } catch (error) {
      if (nodeEnv === "production") {
        warnMemoryRateLimitFallbackOnce({
          limiter: "prewarm",
          reason: "request_failed",
          nodeEnv,
          error,
        });
      }
    }
  } else if (nodeEnv === "production") {
    warnMemoryRateLimitFallbackOnce({
      limiter: "prewarm",
      reason: "missing_config",
      nodeEnv,
    });
  }

  const consumeMemory = dependencies.consumeMemoryRateLimit ?? consumeMemoryRateLimit;
  const result = consumeMemory({
    key,
    limit: PREWARM_RATE_LIMIT.limit,
    windowMs: PREWARM_RATE_LIMIT.windowMs,
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
    error: PREWARM_RATE_LIMIT_ERROR,
    status: 429,
    retryAfterSeconds: result.retryAfterSeconds,
  };
}

export function resetPrewarmRateLimitForTests() {
  globalThis.__recaPrewarmUpstashRateLimiter__ = undefined;
}
