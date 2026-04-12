import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_LOOKUP_RATE_LIMIT,
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
  });

  it("usa Upstash en produccion cuando la configuracion existe", async () => {
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

  it("cae a memory limiter fuera de produccion cuando no hay Upstash", async () => {
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

  it("devuelve 503 si falta la configuracion en produccion", async () => {
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
  });

  it("mantiene 429 y Retry-After cuando Upstash bloquea", async () => {
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

  it("falla cerrado en produccion si Upstash responde con error", async () => {
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
  });
});
