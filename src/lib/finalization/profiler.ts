type FinalizationStep = {
  label: string;
  durationMs: number;
  totalMs: number;
};

export type FinalizationProfiler = {
  requestId: string;
  mark: (label: string) => void;
  finish: (metadata?: Record<string, unknown>) => void;
  fail: (error: unknown, metadata?: Record<string, unknown>) => void;
};

function shouldLogFinalizationProfiler() {
  return process.env.NODE_ENV !== "production";
}

export function createFinalizationProfiler(
  formSlug: string
): FinalizationProfiler {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  let lastMarkAt = startedAt;
  const steps: FinalizationStep[] = [];

  function buildSummary(metadata?: Record<string, unknown>) {
    return {
      requestId,
      formSlug,
      totalMs: Date.now() - startedAt,
      steps,
      ...metadata,
    };
  }

  return {
    requestId,
    mark(label) {
      const now = Date.now();
      steps.push({
        label,
        durationMs: now - lastMarkAt,
        totalMs: now - startedAt,
      });
      lastMarkAt = now;
    },
    finish(metadata) {
      if (!shouldLogFinalizationProfiler()) {
        return;
      }

      console.info(
        `[finalization:${formSlug}:${requestId}] success`,
        buildSummary(metadata)
      );
    },
    fail(error, metadata) {
      if (!shouldLogFinalizationProfiler()) {
        return;
      }

      console.error(
        `[finalization:${formSlug}:${requestId}] failed`,
        buildSummary({
          ...metadata,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    },
  };
}
