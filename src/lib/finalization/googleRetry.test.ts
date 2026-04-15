import { describe, expect, it, vi } from "vitest";
import {
  computeGoogleRetryDelayMs,
  isRetryableGoogleError,
  withGoogleRetry,
} from "./googleRetry";

describe("google retry helpers", () => {
  it("classifies retryable and non-retryable errors", () => {
    expect(isRetryableGoogleError({ status: 429 })).toBe(true);
    expect(isRetryableGoogleError({ code: 503 })).toBe(true);
    expect(isRetryableGoogleError({ response: { status: 500 } })).toBe(true);
    expect(
      isRetryableGoogleError({
        errors: [{ reason: "rateLimitExceeded" }],
      })
    ).toBe(true);
    expect(isRetryableGoogleError(new Error("backend error while copying"))).toBe(
      true
    );
    expect(isRetryableGoogleError({ status: 403 })).toBe(false);
    expect(isRetryableGoogleError(new Error("permission denied"))).toBe(false);
  });

  it("computes the expected retry delays", () => {
    expect(computeGoogleRetryDelayMs(0, () => 0)).toBe(300);
    expect(computeGoogleRetryDelayMs(1, () => 0)).toBe(900);
    expect(computeGoogleRetryDelayMs(7, () => 0)).toBe(1800);
    expect(computeGoogleRetryDelayMs(0, () => 1)).toBe(450);
  });

  it("retries transient errors and preserves the operation result", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValueOnce(new Error("timed out"))
      .mockResolvedValueOnce("ok");
    const wait = vi.fn().mockResolvedValue(undefined);
    const onRetry = vi.fn();

    await expect(
      withGoogleRetry(operation, {
        wait,
        random: () => 0,
        onRetry,
      })
    ).resolves.toBe("ok");

    expect(operation).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenNthCalledWith(1, 300);
    expect(wait).toHaveBeenNthCalledWith(2, 900);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 300, { status: 429 });
    expect(onRetry).toHaveBeenNthCalledWith(
      2,
      2,
      900,
      expect.objectContaining({
        message: "timed out",
      })
    );
  });

  it("does not retry non-retryable errors", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("permission denied"));
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(
      withGoogleRetry(operation, {
        wait,
        random: () => 0,
      })
    ).rejects.toThrow("permission denied");

    expect(operation).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });
});
