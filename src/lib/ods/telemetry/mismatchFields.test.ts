import { describe, expect, it } from "vitest";
import { ODS_TELEMETRY_MISMATCH_FIXTURES } from "./fixtures";
import { areTelemetryValuesEqual, calculateTelemetryMismatchFields } from "./mismatchFields";

describe("calculateTelemetryMismatchFields", () => {
  it.each(ODS_TELEMETRY_MISMATCH_FIXTURES)("$name", (fixture) => {
    expect(
      calculateTelemetryMismatchFields(fixture.motorSuggestion, fixture.finalValue)
    ).toEqual(fixture.expectedMismatchFields);
  });

  it("normalizes accents and casing for enum-like text", () => {
    expect(areTelemetryValuesEqual("Bogotá", " bogota ")).toBe(true);
    expect(areTelemetryValuesEqual("Fuera de Bogotá", "fuera de bogota")).toBe(true);
  });

  it("compares non-numeric strings as text, not decimals", () => {
    expect(areTelemetryValuesEqual("100 COP", "100")).toBe(false);
  });
});
