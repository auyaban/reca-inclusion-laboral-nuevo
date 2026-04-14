import { describe, expect, it } from "vitest";
import {
  buildSensibilizacionSessionRouteKey,
  resolveSensibilizacionDraftHydration,
  resolveSensibilizacionSessionHydration,
} from "@/lib/sensibilizacionHydration";

describe("sensibilizacion hydration helpers", () => {
  it("prefers restoring the local draft before remote loading on draft routes", () => {
    expect(
      resolveSensibilizacionDraftHydration({
        isRouteHydrated: false,
        hasRestorableLocalDraft: true,
      })
    ).toBe("restore_local");
  });

  it("skips draft hydration when the route is already hydrated", () => {
    expect(
      resolveSensibilizacionDraftHydration({
        isRouteHydrated: true,
        hasRestorableLocalDraft: true,
      })
    ).toBe("skip");
  });

  it("prioritizes a promoted draft over local session restore", () => {
    expect(
      resolveSensibilizacionSessionHydration({
        hasEmpresa: true,
        hasSessionParam: true,
        persistedDraftId: "draft-promoted",
        hasRestorableLocalDraft: true,
        isRouteHydrated: false,
      })
    ).toBe("redirect_to_draft");
  });

  it("restores the local session draft when no promoted draft exists", () => {
    expect(
      resolveSensibilizacionSessionHydration({
        hasEmpresa: true,
        hasSessionParam: true,
        persistedDraftId: null,
        hasRestorableLocalDraft: true,
        isRouteHydrated: false,
      })
    ).toBe("restore_local");
  });

  it("bootstraps a new session when there is empresa but no prior draft", () => {
    expect(
      resolveSensibilizacionSessionHydration({
        hasEmpresa: true,
        hasSessionParam: false,
        persistedDraftId: null,
        hasRestorableLocalDraft: false,
        isRouteHydrated: false,
      })
    ).toBe("bootstrap_defaults");
  });

  it("shows the company section when there is no empresa and no session route", () => {
    expect(
      resolveSensibilizacionSessionHydration({
        hasEmpresa: false,
        hasSessionParam: false,
        persistedDraftId: null,
        hasRestorableLocalDraft: false,
        isRouteHydrated: false,
      })
    ).toBe("show_company");
  });

  it("builds stable session route keys for compatibility hydration", () => {
    expect(buildSensibilizacionSessionRouteKey("session-1", false)).toBe(
      "session:session-1:default"
    );
    expect(buildSensibilizacionSessionRouteKey("session-1", true)).toBe(
      "session:session-1:new"
    );
  });
});
