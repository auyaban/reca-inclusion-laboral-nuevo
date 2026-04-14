import { describe, expect, it } from "vitest";
import { buildFormEditorUrl, getFormEditorPath } from "@/lib/forms";

describe("forms routing helpers", () => {
  it("uses canonical long-form routes for presentacion and sensibilizacion", () => {
    expect(getFormEditorPath("presentacion")).toBe("/formularios/presentacion");
    expect(getFormEditorPath("sensibilizacion")).toBe(
      "/formularios/sensibilizacion"
    );
  });

  it("preserves draft, session and new query params on canonical sensibilizacion urls", () => {
    expect(
      buildFormEditorUrl("sensibilizacion", {
        draftId: "draft-123",
        sessionId: "session-456",
        isNewDraft: true,
      })
    ).toBe(
      "/formularios/sensibilizacion?draft=draft-123&session=session-456&new=1"
    );
  });
});
