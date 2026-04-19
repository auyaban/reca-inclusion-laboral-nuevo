import { describe, expect, it } from "vitest";
import {
  getInitialLongFormFinalizationProgress,
  shouldRenderInlineLongFormFinalizationFeedback,
} from "@/lib/longFormFinalization";

describe("shouldRenderInlineLongFormFinalizationFeedback", () => {
  it("hides the inline feedback while the submit dialog is open", () => {
    expect(
      shouldRenderInlineLongFormFinalizationFeedback({
        progress: {
          ...getInitialLongFormFinalizationProgress(),
          phase: "processing",
        },
        dialogOpen: true,
      })
    ).toBe(false);
  });

  it("shows the inline feedback when progress is active and no dialog is open", () => {
    expect(
      shouldRenderInlineLongFormFinalizationFeedback({
        progress: {
          ...getInitialLongFormFinalizationProgress(),
          phase: "error",
        },
        dialogOpen: false,
      })
    ).toBe(true);
  });

  it("keeps idle progress hidden", () => {
    expect(
      shouldRenderInlineLongFormFinalizationFeedback({
        progress: getInitialLongFormFinalizationProgress(),
        dialogOpen: false,
      })
    ).toBe(false);
  });
});
