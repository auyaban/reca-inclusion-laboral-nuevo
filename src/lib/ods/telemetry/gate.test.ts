import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateOdsTelemetryGate, isOdsTelemetryEnabled } from "@/lib/ods/telemetry/gate";

describe("ODS telemetry gate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stays disabled when ODS_TELEMETRY_START_AT is missing", () => {
    expect(evaluateOdsTelemetryGate("", new Date("2026-05-04T12:00:00Z"))).toEqual({
      enabled: false,
      reason: "missing",
    });
  });

  it("enables telemetry when the configured start date is in the past", () => {
    expect(
      isOdsTelemetryEnabled(
        "2026-05-04T10:00:00Z",
        new Date("2026-05-04T12:00:00Z")
      )
    ).toBe(true);
  });

  it("stays disabled when the configured start date is in the future", () => {
    const gate = evaluateOdsTelemetryGate(
      "2026-05-05T00:00:00Z",
      new Date("2026-05-04T12:00:00Z")
    );

    expect(gate.enabled).toBe(false);
    expect(gate.reason).toBe("future");
  });

  it("stays disabled and logs a non-sensitive warning when the date is invalid", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const gate = evaluateOdsTelemetryGate("not-a-date", new Date("2026-05-04T12:00:00Z"));

    expect(gate).toEqual({ enabled: false, reason: "invalid" });
    expect(warn).toHaveBeenCalledWith("[ods/telemetry/record] invalid_start_at");
  });
});
