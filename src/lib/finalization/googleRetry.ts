export const GOOGLE_RETRY_DELAYS_MS = [300, 900, 1800] as const;

function sleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

function getErrorStatusCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as Record<string, unknown>;
  const numericStatus =
    typeof candidate.status === "number"
      ? candidate.status
      : typeof candidate.code === "number"
        ? candidate.code
        : null;

  if (numericStatus != null) {
    return numericStatus;
  }

  const responseStatus =
    typeof candidate.response === "object" &&
    candidate.response &&
    typeof (candidate.response as Record<string, unknown>).status === "number"
      ? ((candidate.response as Record<string, unknown>).status as number)
      : null;

  return responseStatus;
}

function getRetryableReason(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = error as Record<string, unknown>;
  const errors = Array.isArray(candidate.errors) ? candidate.errors : [];
  const reason = errors.find(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).reason === "string"
  ) as Record<string, unknown> | undefined;

  return typeof reason?.reason === "string" ? reason.reason : "";
}

export function isRetryableGoogleError(error: unknown) {
  const status = getErrorStatusCode(error);
  if (status != null) {
    return status === 429 || status >= 500;
  }

  const reason = getRetryableReason(error);
  if (reason === "rateLimitExceeded" || reason === "userRateLimitExceeded") {
    return true;
  }

  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("backend error") ||
    normalizedMessage.includes("timed out") ||
    normalizedMessage.includes("econnreset") ||
    normalizedMessage.includes("etimedout")
  );
}

export function computeGoogleRetryDelayMs(
  retryIndex: number,
  random = Math.random
) {
  const baseDelay =
    GOOGLE_RETRY_DELAYS_MS[
      Math.min(retryIndex, GOOGLE_RETRY_DELAYS_MS.length - 1)
    ] ?? GOOGLE_RETRY_DELAYS_MS[GOOGLE_RETRY_DELAYS_MS.length - 1];
  const jitter = Math.floor(random() * 150);

  return Math.min(2000, baseDelay + jitter);
}

export async function withGoogleRetry<T>(
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number;
    random?: () => number;
    wait?: (delayMs: number) => Promise<void>;
    onRetry?: (retryCount: number, delayMs: number, error: unknown) => void;
  }
) {
  const maxRetries = options?.maxRetries ?? 3;
  const wait = options?.wait ?? sleep;
  const random = options?.random ?? Math.random;
  let retryCount = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableGoogleError(error) || retryCount >= maxRetries) {
        throw error;
      }

      const delayMs = computeGoogleRetryDelayMs(retryCount, random);
      retryCount += 1;
      options?.onRetry?.(retryCount, delayMs, error);
      await wait(delayMs);
    }
  }
}
