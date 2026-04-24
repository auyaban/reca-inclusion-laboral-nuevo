import { describe, expect, it } from "vitest";
import {
  buildInterpreteNameKey,
  normalizeInterpreteName,
  sortInterpretes,
} from "@/lib/interpretesCatalog";

describe("interpretesCatalog helpers", () => {
  it("normalizes names trimming and collapsing spaces", () => {
    expect(normalizeInterpreteName("  Ana   Maria   Perez  ")).toBe(
      "Ana Maria Perez"
    );
  });

  it("builds a lowercase canonical key", () => {
    expect(buildInterpreteNameKey("  Ana   Maria Perez ")).toBe(
      "ana maria perez"
    );
  });

  it("sorts catalog items by normalized display name", () => {
    expect(
      sortInterpretes([
        { id: "3", nombre: "Zulu" },
        { id: "1", nombre: " Ana " },
        { id: "2", nombre: "beta" },
      ])
    ).toEqual([
      { id: "1", nombre: " Ana " },
      { id: "2", nombre: "beta" },
      { id: "3", nombre: "Zulu" },
    ]);
  });
});
