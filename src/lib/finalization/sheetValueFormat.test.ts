import { describe, expect, it } from "vitest";
import { toDecimalSheetValue } from "@/lib/finalization/sheetValueFormat";

describe("toDecimalSheetValue", () => {
  it("normalizes decimal percentage-like values for Google Sheets", () => {
    expect(toDecimalSheetValue("45%")).toBe(45);
    expect(toDecimalSheetValue("45,5%")).toBe(45.5);
    expect(toDecimalSheetValue("45.5")).toBe(45.5);
    expect(toDecimalSheetValue("")).toBe("");
    expect(toDecimalSheetValue("abc")).toBe("abc");
  });
});
