export type ParseTrace = {
  steps: ParseTraceStep[];
  startedAt: number;
  endedAt?: number;
};

export type ParseTraceStep = {
  action: string;
  detail?: string;
  durationMs?: number;
  timestamp: number;
};

export function createTrace(action: string): ParseTrace {
  const now = Date.now();
  return {
    steps: [{ action, timestamp: now }],
    startedAt: now,
  };
}

export function addTraceStep(trace: ParseTrace, action: string, detail?: string): void {
  const now = Date.now();
  const prev = trace.steps[trace.steps.length - 1];
  trace.steps.push({
    action,
    detail,
    durationMs: prev ? now - prev.timestamp : undefined,
    timestamp: now,
  });
}

export function finalizeTrace(trace: ParseTrace): ParseTrace {
  trace.endedAt = Date.now();
  return trace;
}

export function traceSummary(trace: ParseTrace): string {
  const total = trace.endedAt ? trace.endedAt - trace.startedAt : Date.now() - trace.startedAt;
  return `${trace.steps.length} pasos en ${total}ms`;
}
