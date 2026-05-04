const TELEMETRY_START_ENV = "ODS_TELEMETRY_START_AT";

export type OdsTelemetryGate =
  | { enabled: true; startAt: Date }
  | { enabled: false; reason: "missing" | "future" | "invalid"; startAt?: Date };

export function evaluateOdsTelemetryGate(
  envValue = process.env[TELEMETRY_START_ENV],
  now = new Date()
): OdsTelemetryGate {
  const raw = envValue?.trim();
  if (!raw) {
    return { enabled: false, reason: "missing" };
  }

  const startAt = new Date(raw);
  if (Number.isNaN(startAt.getTime())) {
    console.warn("[ods/telemetry/record] invalid_start_at");
    return { enabled: false, reason: "invalid" };
  }

  if (now.getTime() < startAt.getTime()) {
    return { enabled: false, reason: "future", startAt };
  }

  return { enabled: true, startAt };
}

export function isOdsTelemetryEnabled(
  envValue = process.env[TELEMETRY_START_ENV],
  now = new Date()
) {
  return evaluateOdsTelemetryGate(envValue, now).enabled;
}
