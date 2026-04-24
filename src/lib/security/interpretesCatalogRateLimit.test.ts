import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enforceInterpretesCatalogRateLimit,
  INTERPRETES_CATALOG_RATE_LIMIT,
  resetInterpretesCatalogRateLimitForTests,
} from "@/lib/security/interpretesCatalogRateLimit";
import { resetMemoryRateLimitStoreForTests } from "@/lib/security/rateLimit";

function buildHeaders(ip = "127.0.0.1") {
  return new Headers({
    "x-forwarded-for": ip,
  });
}

describe("interpretesCatalogRateLimit", () => {
  beforeEach(() => {
    resetMemoryRateLimitStoreForTests();
    resetInterpretesCatalogRateLimitForTests();
    vi.restoreAllMocks();
  });

  it("falls back to memory when Upstash is not configured", async () => {
    const decision = await enforceInterpretesCatalogRateLimit(buildHeaders(), {
      env: {},
      now: () => 0,
    });

    expect(decision).toEqual({
      allowed: true,
      backend: "memory",
      remaining: INTERPRETES_CATALOG_RATE_LIMIT.limit - 1,
    });
  });

  it("warns once in production when Upstash is not configured and falls back to memory", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const first = await enforceInterpretesCatalogRateLimit(buildHeaders(), {
      env: {
        NODE_ENV: "production",
      },
      now: () => 0,
    });
    const second = await enforceInterpretesCatalogRateLimit(buildHeaders("127.0.0.2"), {
      env: {
        NODE_ENV: "production",
      },
      now: () => 1,
    });

    expect(first).toEqual({
      allowed: true,
      backend: "memory",
      remaining: INTERPRETES_CATALOG_RATE_LIMIT.limit - 1,
    });
    expect(second).toEqual({
      allowed: true,
      backend: "memory",
      remaining: INTERPRETES_CATALOG_RATE_LIMIT.limit - 1,
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[rate-limit] Falling back to memory limiter",
      expect.objectContaining({
        limiter: "interpretes_catalog",
        backend: "memory",
        reason: "missing_config",
        nodeEnv: "production",
      })
    );
  });

  it("falls back to memory when Upstash throws in production", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const first = await enforceInterpretesCatalogRateLimit(buildHeaders(), {
      env: {
        NODE_ENV: "production",
        UPSTASH_REDIS_REST_URL: "https://upstash.example",
        UPSTASH_REDIS_REST_TOKEN: "token",
      },
      createUpstashRateLimiter: () => ({
        limit: vi.fn().mockRejectedValue(new Error("upstash down")),
      }),
      consumeMemoryRateLimit: () => ({
        allowed: true,
        remaining: INTERPRETES_CATALOG_RATE_LIMIT.limit - 1,
        retryAfterSeconds: 0,
      }),
      now: () => 0,
    });
    const second = await enforceInterpretesCatalogRateLimit(
      buildHeaders("127.0.0.2"),
      {
        env: {
          NODE_ENV: "production",
          UPSTASH_REDIS_REST_URL: "https://upstash.example",
          UPSTASH_REDIS_REST_TOKEN: "token",
        },
        createUpstashRateLimiter: () => ({
          limit: vi.fn().mockRejectedValue(new Error("upstash down")),
        }),
        consumeMemoryRateLimit: () => ({
          allowed: true,
          remaining: INTERPRETES_CATALOG_RATE_LIMIT.limit - 1,
          retryAfterSeconds: 0,
        }),
        now: () => 1,
      }
    );

    expect(first).toEqual({
      allowed: true,
      backend: "memory",
      remaining: INTERPRETES_CATALOG_RATE_LIMIT.limit - 1,
    });
    expect(second).toEqual({
      allowed: true,
      backend: "memory",
      remaining: INTERPRETES_CATALOG_RATE_LIMIT.limit - 1,
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[rate-limit] Falling back to memory limiter",
      expect.objectContaining({
        limiter: "interpretes_catalog",
        backend: "memory",
        reason: "request_failed",
        nodeEnv: "production",
        error: "upstash down",
      })
    );
  });

  it("returns 429 when the memory limiter is exhausted", async () => {
    const decision = await enforceInterpretesCatalogRateLimit(buildHeaders(), {
      env: {},
      now: () => 0,
      consumeMemoryRateLimit: () => ({
        allowed: false,
        remaining: 0,
        retryAfterSeconds: 13,
      }),
    });

    expect(decision).toEqual({
      allowed: false,
      backend: "memory",
      error:
        "Demasiados intentos de crear interpretes. Intenta de nuevo en unos segundos.",
      status: 429,
      retryAfterSeconds: 13,
    });
  });
});
