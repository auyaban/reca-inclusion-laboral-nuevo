import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_LOOKUP_RATE_LIMIT,
  buildUpstashConfigCacheKey,
  enforceAuthLookupRateLimit,
  resetAuthLookupRateLimitForTests,
} from "@/lib/security/authLookupRateLimit";
import { resetMemoryRateLimitStoreForTests } from "@/lib/security/rateLimit";

describe("enforceAuthLookupRateLimit", () => {
  const headers = new Headers({
    "x-forwarded-for": "203.0.113.5",
  });

  beforeEach(() => {
    resetMemoryRateLimitStoreForTests();
    resetAuthLookupRateLimitForTests();
    vi.restoreAllMocks();
  });

  it("uses Upstash in production when the configuration exists", async () => {
    const createUpstashRateLimiter = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({
        success: true,
        remaining: 9,
        reset: 999_999,
        pending: Promise.resolve(),
      }),
    });

    const result = await enforceAuthLookupRateLimit(headers, {
      env: {
        UPSTASH_REDIS_REST_URL: "https://redis.example",
        UPSTASH_REDIS_REST_TOKEN: "secret-token",
      } as NodeJS.ProcessEnv,
      nodeEnv: "production",
      createUpstashRateLimiter,
    });

    expect(result).toEqual({
      allowed: true,
      backend: "upstash",
      remaining: 9,
    });
    expect(createUpstashRateLimiter).toHaveBeenCalledOnce();
  });

  it("falls back to the memory limiter outside production when Upstash is missing", async () => {
    const result = await enforceAuthLookupRateLimit(headers, {
      env: {} as NodeJS.ProcessEnv,
      nodeEnv: "test",
      now: () => 1_000,
    });

    expect(result).toEqual({
      allowed: true,
      backend: "memory",
      remaining: AUTH_LOOKUP_RATE_LIMIT.limit - 1,
    });
  });

  it("returns 503 and logs when the configuration is missing in production", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await enforceAuthLookupRateLimit(headers, {
      env: {} as NodeJS.ProcessEnv,
      nodeEnv: "production",
    });

    expect(result).toEqual({
      allowed: false,
      backend: "unavailable",
      error: "Servicio temporalmente no disponible.",
      status: 503,
      retryAfterSeconds: null,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "[auth-rate-limit] Upstash unavailable",
      expect.objectContaining({
        backend: "upstash",
        nodeEnv: "production",
        reason: "missing_config",
        error: null,
      })
    );
  });

  it("keeps 429 and Retry-After when Upstash blocks the request", async () => {
    const result = await enforceAuthLookupRateLimit(headers, {
      env: {
        UPSTASH_REDIS_REST_URL: "https://redis.example",
        UPSTASH_REDIS_REST_TOKEN: "secret-token",
      } as NodeJS.ProcessEnv,
      nodeEnv: "production",
      now: () => 10_000,
      createUpstashRateLimiter: () => ({
        limit: vi.fn().mockResolvedValue({
          success: false,
          reset: 13_100,
          pending: Promise.resolve(),
        }),
      }),
    });

    expect(result).toEqual({
      allowed: false,
      backend: "upstash",
      error: "Demasiados intentos. Intenta de nuevo más tarde.",
      status: 429,
      retryAfterSeconds: 4,
    });
  });

  it("fails closed and logs when Upstash errors in production", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await enforceAuthLookupRateLimit(headers, {
      env: {
        UPSTASH_REDIS_REST_URL: "https://redis.example",
        UPSTASH_REDIS_REST_TOKEN: "secret-token",
      } as NodeJS.ProcessEnv,
      nodeEnv: "production",
      createUpstashRateLimiter: () => ({
        limit: vi.fn().mockRejectedValue(new Error("redis-down")),
      }),
    });

    expect(result).toEqual({
      allowed: false,
      backend: "unavailable",
      error: "Servicio temporalmente no disponible.",
      status: 503,
      retryAfterSeconds: null,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "[auth-rate-limit] Upstash unavailable",
      expect.objectContaining({
        backend: "upstash",
        nodeEnv: "production",
        reason: "request_failed",
        error: "redis-down",
      })
    );
  });

  it("builds a cache key without exposing the raw Upstash token", () => {
    const configKey = buildUpstashConfigCacheKey({
      url: "https://redis.example",
      token: "secret-token",
    });

    expect(configKey).toContain("https://redis.example|");
    expect(configKey).not.toContain("secret-token");
    expect(configKey.split("|")[1]).toHaveLength(16);
  });
});
