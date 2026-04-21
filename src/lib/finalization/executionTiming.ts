export type ExecutionTimingStep = {
  label: string;
  durationMs: number;
  totalMs: number;
};

export type ExecutionTimingTracker = {
  requestId: string;
  mark: (label: string) => void;
  getSteps: () => ExecutionTimingStep[];
  getTotalMs: () => number;
};
