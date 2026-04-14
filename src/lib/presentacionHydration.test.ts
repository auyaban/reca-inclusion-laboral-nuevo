import { describe, expect, it } from "vitest";
import {
  buildPresentacionSessionRouteKey,
  resolvePresentacionDraftHydration,
  resolvePresentacionSessionHydration,
} from "@/lib/presentacionHydration";

describe("presentacion hydration helpers", () => {
  it("prefers restoring the local draft before remote loading on draft routes", () => {
    expect(
      resolvePresentacionDraftHydration({
        isRouteHydrated: false,
        hasRestorableLocalDraft: true,
      })
    ).toBe("restore_local");
  });

  it("skips draft hydration when the route is already hydrated", () => {
    expect(
      resolvePresentacionDraftHydration({
        isRouteHydrated: true,
        hasRestorableLocalDraft: true,
      })
    ).toBe("skip");
  });

  it("prioritizes a promoted draft over local session restore", () => {
    expect(
      resolvePresentacionSessionHydration({
        hasEmpresa: true,
        persistedDraftId: "draft-promoted",
        hasRestorableLocalDraft: true,
        isRouteHydrated: false,
      })
    ).toBe("redirect_to_draft");
  });

  it("restores the local session draft when no promoted draft exists", () => {
    expect(
      resolvePresentacionSessionHydration({
        hasEmpresa: true,
        persistedDraftId: null,
        hasRestorableLocalDraft: true,
        isRouteHydrated: false,
      })
    ).toBe("restore_local");
  });

  it("skips session hydration when the route is already hydrated", () => {
    expect(
      resolvePresentacionSessionHydration({
        hasEmpresa: true,
        persistedDraftId: "draft-promoted",
        hasRestorableLocalDraft: true,
        isRouteHydrated: true,
      })
    ).toBe("skip");
  });

  it("bootstraps defaults when the session route has empresa but no prior draft", () => {
    expect(
      resolvePresentacionSessionHydration({
        hasEmpresa: true,
        persistedDraftId: null,
        hasRestorableLocalDraft: false,
        isRouteHydrated: false,
      })
    ).toBe("bootstrap_defaults");
  });

  it("shows the company section when the session route cannot reconstruct empresa", () => {
    expect(
      resolvePresentacionSessionHydration({
        hasEmpresa: false,
        persistedDraftId: null,
        hasRestorableLocalDraft: false,
        isRouteHydrated: false,
      })
    ).toBe("show_company");
  });

  it("builds stable session route keys for compatibility hydration", () => {
    expect(buildPresentacionSessionRouteKey("session-1", false)).toBe(
      "session:session-1:default"
    );
    expect(buildPresentacionSessionRouteKey("session-1", true)).toBe(
      "session:session-1:new"
    );
  });
});
