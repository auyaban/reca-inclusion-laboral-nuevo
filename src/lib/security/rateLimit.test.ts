import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildIpRateLimitKey,
  consumeMemoryRateLimit,
  getClientIpFromHeaders,
  resetMemoryRateLimitStoreForTests,
  warnMemoryRateLimitFallbackOnce,
} from "@/lib/security/rateLimit";

function getStoreSize() {
  return globalThis.__recaMemoryRateLimitStore__?.size ?? 0;
}

describe("consumeMemoryRateLimit", () => {
  beforeEach(() => {
    resetMemoryRateLimitStoreForTests();
  });

  it("permite solicitudes hasta el umbral configurado", () => {
    const first = consumeMemoryRateLimit({
      key: "auth_lookup:1.1.1.1",
      limit: 3,
      windowMs: 60_000,
      now: 1_000,
    });
    const second = consumeMemoryRateLimit({
      key: "auth_lookup:1.1.1.1",
      limit: 3,
      windowMs: 60_000,
      now: 1_100,
    });
    const third = consumeMemoryRateLimit({
      key: "auth_lookup:1.1.1.1",
      limit: 3,
      windowMs: 60_000,
      now: 1_200,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("bloquea cuando el umbral ya fue consumido", () => {
    consumeMemoryRateLimit({
      key: "auth_lookup:1.1.1.1",
      limit: 2,
      windowMs: 60_000,
      now: 1_000,
    });
    consumeMemoryRateLimit({
      key: "auth_lookup:1.1.1.1",
      limit: 2,
      windowMs: 60_000,
      now: 1_100,
    });

    const blocked = consumeMemoryRateLimit({
      key: "auth_lookup:1.1.1.1",
      limit: 2,
      windowMs: 60_000,
      now: 1_200,
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("reinicia la ventana al expirar el tiempo", () => {
    consumeMemoryRateLimit({
      key: "auth_lookup:1.1.1.1",
      limit: 1,
      windowMs: 10_000,
      now: 1_000,
    });

    const afterReset = consumeMemoryRateLimit({
      key: "auth_lookup:1.1.1.1",
      limit: 1,
      windowMs: 10_000,
      now: 11_001,
    });

    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(0);
  });

  it("sweep expired entries only periodically while still resetting reused keys", () => {
    consumeMemoryRateLimit({
      key: "auth_lookup:1.1.1.1",
      limit: 1,
      windowMs: 1_000,
      now: 1_000,
    });
    consumeMemoryRateLimit({
      key: "auth_lookup:2.2.2.2",
      limit: 1,
      windowMs: 1_000,
      now: 2_500,
    });

    expect(getStoreSize()).toBe(2);

    consumeMemoryRateLimit({
      key: "auth_lookup:3.3.3.3",
      limit: 1,
      windowMs: 1_000,
      now: 62_000,
    });

    expect(getStoreSize()).toBe(1);
  });
});

describe("buildIpRateLimitKey", () => {
  it("usa la primera IP de x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.5, 70.41.3.18",
    });

    expect(getClientIpFromHeaders(headers)).toBe("203.0.113.5");
    expect(buildIpRateLimitKey("auth_lookup", headers)).toBe(
      "auth_lookup:203.0.113.5"
    );
  });

  it("usa fallback estable cuando no hay IP", () => {
    const headers = new Headers();

    expect(getClientIpFromHeaders(headers)).toBe("unknown");
    expect(buildIpRateLimitKey("auth_lookup", headers)).toBe(
      "auth_lookup:unknown"
    );
  });
});

describe("warnMemoryRateLimitFallbackOnce", () => {
  beforeEach(() => {
    resetMemoryRateLimitStoreForTests();
  });

  it("no-ops outside production", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    warnMemoryRateLimitFallbackOnce({
      limiter: "prewarm",
      reason: "missing_config",
      nodeEnv: "development",
    });

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("warns only once per limiter/reason in production", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    warnMemoryRateLimitFallbackOnce({
      limiter: "prewarm",
      reason: "missing_config",
      nodeEnv: "production",
    });
    warnMemoryRateLimitFallbackOnce({
      limiter: "prewarm",
      reason: "missing_config",
      nodeEnv: "production",
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
});
