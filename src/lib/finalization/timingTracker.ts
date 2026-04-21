import type { DraftGooglePrewarmTiming } from "@/lib/finalization/prewarmTypes";
import type { ExecutionTimingTracker } from "@/lib/finalization/executionTiming";

type TimingStep = DraftGooglePrewarmTiming["steps"][number];

export type TimingTracker = ExecutionTimingTracker & {
  finish: () => DraftGooglePrewarmTiming;
  snapshot: () => DraftGooglePrewarmTiming;
};

export function createTimingTracker(requestId = crypto.randomUUID().slice(0, 8)): TimingTracker {
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();
  let lastMarkAt = startedAt;
  const steps: TimingStep[] = [];

  function buildSnapshot(): DraftGooglePrewarmTiming {
    return {
      requestId,
      startedAt: startedAtIso,
      totalMs: Date.now() - startedAt,
      steps: [...steps],
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
    getSteps() {
      return [...steps];
    },
    getTotalMs() {
      return Date.now() - startedAt;
    },
    finish() {
      return buildSnapshot();
    },
    snapshot() {
      return buildSnapshot();
    },
  };
}
