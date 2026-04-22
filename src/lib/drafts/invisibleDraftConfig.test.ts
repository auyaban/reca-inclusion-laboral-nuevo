import { describe, expect, it } from "vitest";
import { isInvisibleDraftPilotEnabled } from "@/lib/drafts/invisibleDraftConfig";

describe("invisibleDraftConfig", () => {
  it("keeps evaluacion inside the invisible draft pilot", () => {
    expect(isInvisibleDraftPilotEnabled("evaluacion")).toBe(true);
  });

  it("keeps seguimientos inside the invisible draft pilot", () => {
    expect(isInvisibleDraftPilotEnabled("seguimientos")).toBe(true);
  });
});
