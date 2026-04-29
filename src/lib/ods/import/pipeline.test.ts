import { describe, it, expect } from "vitest";
import { fuzzyNitMatch } from "@/lib/ods/import/pipeline";

describe("fuzzyNitMatch", () => {
  it("returns exact match when NIT matches exactly", () => {
    const knownNits = ["900123456", "800987654", "700111222"];
    const result = fuzzyNitMatch("900123456", knownNits);
    expect(result).not.toBeNull();
    expect(result?.nit).toBe("900123456");
    expect(result?.confidence).toBe(1.0);
  });

  it("returns fuzzy match when NIT has typo", () => {
    const knownNits = ["900123456", "800987654", "700111222"];
    const result = fuzzyNitMatch("900123457", knownNits);
    expect(result).not.toBeNull();
    expect(result?.nit).toBe("900123456");
    expect(result?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("returns null when no match above threshold", () => {
    const knownNits = ["900123456", "800987654", "700111222"];
    const result = fuzzyNitMatch("111111111", knownNits);
    expect(result).toBeNull();
  });

  it("handles NIT with dashes", () => {
    const knownNits = ["900123456", "800987654"];
    const result = fuzzyNitMatch("900123456", knownNits);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe(1.0);
  });

  it("returns null for empty input", () => {
    const knownNits = ["900123456"];
    const result = fuzzyNitMatch("", knownNits);
    expect(result).toBeNull();
  });
});
