import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enforcePrewarmRateLimit,
  PREWARM_RATE_LIMIT,
  resetPrewarmRateLimitForTests,
} from "@/lib/security/prewarmRateLimit";
import { resetMemoryRateLimitStoreForTests } from "@/lib/security/rateLimit";

describe("enforcePrewarmRateLimit", () => {
  beforeEach(() => {
    resetMemoryRateLimitStoreForTests();
    resetPrewarmRateLimitForTests();
    vi.restoreAllMocks();
  });

  it("uses Upstash when configuration exists", async () => {
    const createUpstashRateLimiter = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({
        success: true,
        remaining: 4,
        reset: 999_999,
        pending: Promise.resolve(),
      }),
    });

    const result = await enforcePrewarmRateLimit(
      {
        userId: "user-1",
        draftId: "draft-1",
        formSlug: "evaluacion",
      },
      {
        env: {
          UPSTASH_REDIS_REST_URL: "https://redis.example",
          UPSTASH_REDIS_REST_TOKEN: "secret-token",
        } as unknown as NodeJS.ProcessEnv,
        createUpstashRateLimiter,
      }
    );

    expect(result).toEqual({
      allowed: true,
      backend: "upstash",
      remaining: 4,
    });
    expect(createUpstashRateLimiter).toHaveBeenCalledOnce();
  });

  it("falls back to the memory limiter when Upstash is not configured", async () => {
    const result = await enforcePrewarmRateLimit(
      {
        userId: "user-1",
        draftId: "draft-1",
        formSlug: "evaluacion",
      },
      {
        env: {} as unknown as NodeJS.ProcessEnv,
        now: () => 1_000,
      }
    );

    expect(result).toEqual({
      allowed: true,
      backend: "memory",
      remaining: PREWARM_RATE_LIMIT.limit - 1,
    });
  });

  it("warns once in production when Upstash config is missing and falls back to memory", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const first = await enforcePrewarmRateLimit(
      {
        userId: "user-1",
        draftId: "draft-1",
        formSlug: "evaluacion",
      },
      {
        env: {
          NODE_ENV: "production",
        } as unknown as NodeJS.ProcessEnv,
        now: () => 1_000,
      }
    );
    const second = await enforcePrewarmRateLimit(
      {
        userId: "user-2",
        draftId: "draft-2",
        formSlug: "evaluacion",
      },
      {
        env: {
          NODE_ENV: "production",
        } as unknown as NodeJS.ProcessEnv,
        now: () => 2_000,
      }
    );

    expect(first).toEqual({
      allowed: true,
      backend: "memory",
      remaining: PREWARM_RATE_LIMIT.limit - 1,
    });
    expect(second).toEqual({
      allowed: true,
      backend: "memory",
      remaining: PREWARM_RATE_LIMIT.limit - 1,
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[rate-limit] Falling back to memory limiter",
      expect.objectContaining({
        limiter: "prewarm",
        backend: "memory",
        reason: "missing_config",
        nodeEnv: "production",
      })
    );
  });

  it("returns 429 with retry-after when Upstash blocks", async () => {
    const result = await enforcePrewarmRateLimit(
      {
        userId: "user-1",
        draftId: "draft-1",
        formSlug: "evaluacion",
      },
      {
        env: {
          UPSTASH_REDIS_REST_URL: "https://redis.example",
          UPSTASH_REDIS_REST_TOKEN: "secret-token",
        } as unknown as NodeJS.ProcessEnv,
        now: () => 10_000,
        createUpstashRateLimiter: () => ({
          limit: vi.fn().mockResolvedValue({
            success: false,
            reset: 13_100,
            pending: Promise.resolve(),
          }),
        }),
      }
    );

    expect(result).toEqual({
      allowed: false,
      backend: "upstash",
      error:
        "Demasiados intentos de preparar Google. Intenta de nuevo en unos segundos.",
      status: 429,
      retryAfterSeconds: 4,
    });
  });

  it("treats different structure signatures as different buckets in memory fallback", async () => {
    const first = await enforcePrewarmRateLimit(
      {
        userId: "user-1",
        draftId: "draft-1",
        formSlug: "evaluacion",
        empresaKey: "Empresa Demo",
        structureSignature: '{"asistentesCount":1}',
      },
      {
        env: {} as unknown as NodeJS.ProcessEnv,
        now: () => 5_000,
      }
    );

    const second = await enforcePrewarmRateLimit(
      {
        userId: "user-1",
        draftId: "draft-1",
        formSlug: "evaluacion",
        empresaKey: "Empresa Demo",
        structureSignature: '{"asistentesCount":2}',
      },
      {
        env: {} as unknown as NodeJS.ProcessEnv,
        now: () => 5_000,
      }
    );

    expect(first).toEqual({
      allowed: true,
      backend: "memory",
      remaining: PREWARM_RATE_LIMIT.limit - 1,
    });
    expect(second).toEqual({
      allowed: true,
      backend: "memory",
      remaining: PREWARM_RATE_LIMIT.limit - 1,
    });
  });

  it("warns once in production when Upstash errors and falls back to memory", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const first = await enforcePrewarmRateLimit(
      {
        userId: "user-1",
        draftId: "draft-1",
        formSlug: "evaluacion",
      },
      {
        env: {
          NODE_ENV: "production",
          UPSTASH_REDIS_REST_URL: "https://redis.example",
          UPSTASH_REDIS_REST_TOKEN: "secret-token",
        } as unknown as NodeJS.ProcessEnv,
        now: () => 2_000,
        createUpstashRateLimiter: () => ({
          limit: vi.fn().mockRejectedValue(new Error("redis-down")),
        }),
      }
    );
    const second = await enforcePrewarmRateLimit(
      {
        userId: "user-2",
        draftId: "draft-2",
        formSlug: "evaluacion",
      },
      {
        env: {
          NODE_ENV: "production",
          UPSTASH_REDIS_REST_URL: "https://redis.example",
          UPSTASH_REDIS_REST_TOKEN: "secret-token",
        } as unknown as NodeJS.ProcessEnv,
        now: () => 3_000,
        createUpstashRateLimiter: () => ({
          limit: vi.fn().mockRejectedValue(new Error("redis-down")),
        }),
      }
    );

    expect(first).toEqual({
      allowed: true,
      backend: "memory",
      remaining: PREWARM_RATE_LIMIT.limit - 1,
    });
    expect(second).toEqual({
      allowed: true,
      backend: "memory",
      remaining: PREWARM_RATE_LIMIT.limit - 1,
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[rate-limit] Falling back to memory limiter",
      expect.objectContaining({
        error: "redis-down",
        limiter: "prewarm",
        backend: "memory",
        reason: "request_failed",
        nodeEnv: "production",
      })
    );
  });
});
