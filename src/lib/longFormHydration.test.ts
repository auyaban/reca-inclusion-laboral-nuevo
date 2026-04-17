import { describe, expect, it } from "vitest";
import {
  buildLongFormSessionRouteKey,
  resolveInvisibleDraftSessionHydration,
  resolveLongFormDraftHydration,
  resolveLongFormDraftSource,
} from "@/lib/longFormHydration";

describe("resolveInvisibleDraftSessionHydration", () => {
  it("prioritizes the local session copy over the promoted draft", () => {
    expect(
      resolveInvisibleDraftSessionHydration({
        hasEmpresa: true,
        persistedDraftId: "draft-promoted",
        hasRestorableLocalDraft: true,
        isRouteHydrated: false,
      })
    ).toBe("restore_local");
  });

  it("loads the promoted remote draft when no local copy is available", () => {
    expect(
      resolveInvisibleDraftSessionHydration({
        hasEmpresa: true,
        persistedDraftId: "draft-promoted",
        hasRestorableLocalDraft: false,
        isRouteHydrated: false,
      })
    ).toBe("load_promoted_remote");
  });

  it("skips hydration when the route is already hydrated", () => {
    expect(
      resolveInvisibleDraftSessionHydration({
        hasEmpresa: true,
        persistedDraftId: "draft-promoted",
        hasRestorableLocalDraft: true,
        isRouteHydrated: true,
      })
    ).toBe("skip");
  });

  it("bootstraps defaults when empresa exists without prior draft state", () => {
    expect(
      resolveInvisibleDraftSessionHydration({
        hasEmpresa: true,
        persistedDraftId: null,
        hasRestorableLocalDraft: false,
        isRouteHydrated: false,
      })
    ).toBe("bootstrap_defaults");
  });

  it("shows the company section when the route cannot reconstruct empresa", () => {
    expect(
      resolveInvisibleDraftSessionHydration({
        hasEmpresa: false,
        persistedDraftId: null,
        hasRestorableLocalDraft: false,
        isRouteHydrated: false,
      })
    ).toBe("show_company");
  });
});

describe("resolveLongFormDraftHydration", () => {
  it("prefers restoring the local draft before remote loading on draft routes", () => {
    expect(
      resolveLongFormDraftHydration({
        isRouteHydrated: false,
        hasRestorableLocalDraft: true,
      })
    ).toBe("restore_local");
  });

  it("skips draft hydration when the route is already hydrated", () => {
    expect(
      resolveLongFormDraftHydration({
        isRouteHydrated: true,
        hasRestorableLocalDraft: true,
      })
    ).toBe("skip");
  });
});

describe("buildLongFormSessionRouteKey", () => {
  it("builds stable session route keys for compatibility hydration", () => {
    expect(buildLongFormSessionRouteKey("session-1", false)).toBe(
      "session:session-1:default"
    );
    expect(buildLongFormSessionRouteKey("session-1", true)).toBe(
      "session:session-1:new"
    );
  });
});

describe("resolveLongFormDraftSource", () => {
  const empresa = {
    id: "empresa-1",
    nombre_empresa: "Acme",
    nit_empresa: "900123",
    direccion_empresa: null,
    ciudad_empresa: null,
    sede_empresa: null,
    zona_empresa: null,
    correo_1: null,
    contacto_empresa: null,
    telefono_empresa: null,
    cargo: null,
    profesional_asignado: null,
    correo_profesional: null,
    asesor: null,
    correo_asesor: null,
    caja_compensacion: null,
  };

  const localDraft = {
    step: 2,
    data: { observaciones: "local" },
    empresa,
    updatedAt: "2026-04-16T10:00:00.000Z",
  };

  const prefetchedDraft = {
    id: "draft-1",
    form_slug: "presentacion",
    step: 3,
    empresa_nit: empresa.nit_empresa,
    empresa_nombre: empresa.nombre_empresa,
    empresa_snapshot: empresa,
    updated_at: "2026-04-16T11:00:00.000Z",
    created_at: "2026-04-16T11:00:00.000Z",
    last_checkpoint_at: "2026-04-16T11:00:00.000Z",
    last_checkpoint_hash: "hash-1",
    data: { observaciones: "remote" },
  };

  it("prioritizes the local snapshot over the prefetched draft", () => {
    expect(
      resolveLongFormDraftSource({
        hydrationAction: "restore_local",
        localDraft,
        localEmpresa: empresa,
        initialDraftResolution: {
          status: "ready",
          draft: prefetchedDraft,
          empresa,
        },
      })
    ).toEqual({
      action: "restore_local",
      draft: localDraft,
      empresa,
    });
  });

  it("uses the prefetched draft when there is no local snapshot", () => {
    expect(
      resolveLongFormDraftSource({
        hydrationAction: "load_remote",
        localDraft: null,
        localEmpresa: null,
        initialDraftResolution: {
          status: "ready",
          draft: prefetchedDraft,
          empresa,
        },
      })
    ).toEqual({
      action: "restore_prefetched",
      draft: prefetchedDraft,
      empresa,
    });
  });

  it("returns an error when the server prefetch already failed", () => {
    expect(
      resolveLongFormDraftSource({
        hydrationAction: "load_remote",
        localDraft: null,
        localEmpresa: null,
        initialDraftResolution: {
          status: "error",
          message: "No se pudo abrir el borrador.",
        },
      })
    ).toEqual({
      action: "show_error",
      message: "No se pudo abrir el borrador.",
    });
  });

  it("falls back to the client fetch when no server resolution is available", () => {
    expect(
      resolveLongFormDraftSource({
        hydrationAction: "load_remote",
        localDraft: null,
        localEmpresa: null,
        initialDraftResolution: {
          status: "none",
        },
      })
    ).toEqual({
      action: "load_client",
    });
  });
});
