import { describe, expect, it } from "vitest";
import { resolveActiveLongFormSectionId } from "@/hooks/useLongFormSections";

describe("resolveActiveLongFormSectionId", () => {
  it("selects the visible section closest to the anchor", () => {
    expect(
      resolveActiveLongFormSectionId({
        currentSectionId: "company",
        sectionRects: [
          { sectionId: "company", top: 12, bottom: 80 },
          { sectionId: "visit", top: 140, bottom: 360 },
          { sectionId: "observations", top: 380, bottom: 620 },
        ],
        scrollAnchorTop: 148,
        scrollBottomThreshold: 120,
      })
    ).toBe("visit");
  });

  it("skips sections that are already above the bottom threshold", () => {
    expect(
      resolveActiveLongFormSectionId({
        currentSectionId: "company",
        sectionRects: [
          { sectionId: "company", top: -120, bottom: 100 },
          { sectionId: "visit", top: 260, bottom: 520 },
        ],
        scrollAnchorTop: 148,
        scrollBottomThreshold: 120,
      })
    ).toBe("visit");
  });

  it("falls back to the current section when nothing else is eligible", () => {
    expect(
      resolveActiveLongFormSectionId({
        currentSectionId: "observations",
        sectionRects: [{ sectionId: "company", top: -200, bottom: 90 }],
        scrollAnchorTop: 148,
        scrollBottomThreshold: 120,
      })
    ).toBe("observations");
  });
});
