import { describe, expect, it } from "vitest";
import { shouldShowEvaluacionLoadingState } from "@/lib/evaluacionLoadingState";

describe("shouldShowEvaluacionLoadingState", () => {
  it("shows loading while opening a draft route that has not been hydrated yet", () => {
    expect(
      shouldShowEvaluacionLoadingState({
        draftParam: "draft-123",
        restoringDraft: true,
        loadingDraft: false,
        hasEmpresa: true,
        currentRouteHydrated: false,
      })
    ).toBe(true);
  });

  it("keeps the editor visible after a session-to-draft promotion already marked as hydrated", () => {
    expect(
      shouldShowEvaluacionLoadingState({
        draftParam: "draft-123",
        restoringDraft: true,
        loadingDraft: false,
        hasEmpresa: true,
        currentRouteHydrated: true,
      })
    ).toBe(false);
  });

  it("still shows loading for company-less session bootstrap restores", () => {
    expect(
      shouldShowEvaluacionLoadingState({
        draftParam: null,
        restoringDraft: true,
        loadingDraft: false,
        hasEmpresa: false,
        currentRouteHydrated: false,
      })
    ).toBe(true);
  });
});
