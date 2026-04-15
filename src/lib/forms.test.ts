import { describe, expect, it } from "vitest";
import {
  buildFormEditorUrl,
  getFormEditorPath,
  getFormLabel,
  getFormTabLabel,
  isLongFormSlug,
  LONG_FORM_SLUGS,
} from "@/lib/forms";

describe("forms routing helpers", () => {
  it("centralizes the supported long-form slugs", () => {
    expect(LONG_FORM_SLUGS).toEqual([
      "presentacion",
      "condiciones-vacante",
      "sensibilizacion",
    ]);
    expect(isLongFormSlug("presentacion")).toBe(true);
    expect(isLongFormSlug("condiciones-vacante")).toBe(true);
    expect(isLongFormSlug("sensibilizacion")).toBe(true);
    expect(isLongFormSlug("evaluacion")).toBe(false);
  });

  it("uses canonical long-form routes for the supported long-form slugs", () => {
    expect(getFormEditorPath("presentacion")).toBe("/formularios/presentacion");
    expect(getFormEditorPath("condiciones-vacante")).toBe(
      "/formularios/condiciones-vacante"
    );
    expect(getFormEditorPath("sensibilizacion")).toBe(
      "/formularios/sensibilizacion"
    );
    expect(getFormEditorPath("evaluacion")).toBe(
      "/formularios/evaluacion/seccion-2"
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

  it("falls back to the raw slug when a label is unknown", () => {
    expect(getFormLabel("formulario-x")).toBe("formulario-x");
    expect(getFormTabLabel("formulario-x")).toBe("formulario-x");
  });
});
