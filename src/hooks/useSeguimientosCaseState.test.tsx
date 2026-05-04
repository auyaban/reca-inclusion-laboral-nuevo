// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSeguimientosStageDraftStateMap,
  createEmptySeguimientosBaseValues,
  createEmptySeguimientosFinalSummary,
} from "@/lib/seguimientos";
import { buildSeguimientosWorkflow } from "@/lib/seguimientosStages";
import {
  SEGUIMIENTOS_CASE_SCHEMA_VERSION,
  type SeguimientosCaseHydration,
} from "@/lib/seguimientosRuntime";
import {
  resolveExpectedCaseUpdatedAt,
  commitHydrationStateWithRef,
  resetLastCommittedUpdatedAtRef,
  useSeguimientosCaseState,
} from "@/hooks/useSeguimientosCaseState";
import * as seguimientosCaseStateSync from "@/hooks/seguimientosCaseStateSync";

const routerReplace = vi.hoisted(() => vi.fn());
const routerPush = vi.hoisted(() => vi.fn());
const draftControllerMocks = vi.hoisted(() => ({
  loadLocal: vi.fn(),
  loadDraft: vi.fn(),
  clearDraft: vi.fn(),
  autosave: vi.fn(),
  checkpointDraft: vi.fn(),
  beginRouteHydration: vi.fn(),
  buildDraftStatusProps: vi.fn(() => ({
    savingDraft: false,
    remoteIdentityState: "ready",
    remoteSyncState: "synced",
    hasPendingAutosave: false,
    hasLocalDirtyChanges: false,
    hasPendingRemoteSync: false,
    localDraftSavedAt: null,
    draftSavedAt: null,
    localPersistenceState: "indexeddb",
  })),
  buildDraftLockBannerProps: vi.fn(() => null),
  isRouteHydrated: vi.fn(() => false),
  markRouteHydrated: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock("@/hooks/useLongFormDraftController", () => ({
  useLongFormDraftController: () => ({
    activeDraftId: "draft-1",
    localDraftSessionId: "session-1",
    loadingDraft: false,
    hasPendingAutosave: false,
    hasLocalDirtyChanges: false,
    localDraftSavedAt: null,
    draftLifecycleSuspended: false,
    isReadonlyDraft: false,
    loadLocal: draftControllerMocks.loadLocal,
    loadDraft: draftControllerMocks.loadDraft,
    clearDraft: draftControllerMocks.clearDraft,
    autosave: draftControllerMocks.autosave,
    checkpointDraft: draftControllerMocks.checkpointDraft,
    beginRouteHydration: draftControllerMocks.beginRouteHydration,
    buildDraftStatusProps: draftControllerMocks.buildDraftStatusProps,
    buildDraftLockBannerProps: draftControllerMocks.buildDraftLockBannerProps,
    isRouteHydrated: draftControllerMocks.isRouteHydrated,
    markRouteHydrated: draftControllerMocks.markRouteHydrated,
  }),
}));

vi.mock("@/hooks/formDraft/useInitialLocalDraftSeed", () => ({
  useInitialLocalDraftSeed: vi.fn(),
}));

function createHookHydration(updatedAt: string): SeguimientosCaseHydration {
  const empresa = {
    id: "empresa-1",
    nombre_empresa: "Empresa Uno SAS",
    nit_empresa: "900123456",
    direccion_empresa: "Calle 1",
    ciudad_empresa: "Bogota",
    sede_empresa: "Principal",
    zona_empresa: "Zona Norte",
    correo_1: "empresa@example.com",
    contacto_empresa: "Laura Gomez",
    telefono_empresa: "3000000000",
    cargo: "Lider",
    profesional_asignado: "Marta Ruiz",
    correo_profesional: "marta@example.com",
    asesor: "Carlos Perez",
    correo_asesor: "carlos@example.com",
    caja_compensacion: "Colsubsidio",
  };
  const baseValues = createEmptySeguimientosBaseValues(empresa);
  const caseMeta = {
    caseId: "sheet-1",
    cedula: "1001234567",
    nombreVinculado: "Ana Perez",
    empresaNit: "900123456",
    empresaNombre: "Empresa Uno SAS",
    companyType: "no_compensar" as const,
    maxFollowups: 3,
    driveFolderId: "folder-1",
    spreadsheetId: "sheet-1",
    spreadsheetUrl: "https://docs.google.com/spreadsheets/d/sheet-1/edit",
    folderName: "Ana Perez - 1001234567",
    baseSheetName: "9. SEGUIMIENTO AL PROCESO DE INCLUSION LABORAL",
    profesionalAsignado: "Marta Ruiz",
    cajaCompensacion: "Colsubsidio",
    createdAt: "2026-04-21T10:00:00.000Z",
    updatedAt,
  };
  const workflow = buildSeguimientosWorkflow({
    companyType: caseMeta.companyType,
    baseValues,
    persistedBaseValues: baseValues,
    followups: {},
    persistedFollowups: {},
    activeStageId: "base_process",
  });

  return {
    schemaVersion: SEGUIMIENTOS_CASE_SCHEMA_VERSION,
    caseMeta,
    empresaSnapshot: empresa,
    personPrefill: {
      cedula_usuario: "1001234567",
      nombre_usuario: "Ana Perez",
      discapacidad_usuario: "Auditiva",
      discapacidad_detalle: "",
      certificado_discapacidad: "Si",
      certificado_porcentaje: "45",
      telefono_oferente: "3000000000",
      correo_oferente: "ana@example.com",
      cargo_oferente: "Auxiliar administrativo",
      contacto_emergencia: "Mario Perez",
      parentesco: "Hermano",
      telefono_emergencia: "3010000000",
      fecha_firma_contrato: "2026-04-21",
      tipo_contrato: "Termino fijo",
      fecha_fin: "2026-12-21",
      empresa_nit: "900123456",
      empresa_nombre: "Empresa Uno SAS",
    },
    stageDraftStateByStageId: buildSeguimientosStageDraftStateMap(
      caseMeta.companyType
    ),
    baseValues,
    persistedBaseValues: baseValues,
    followupValuesByIndex: {},
    persistedFollowupValuesByIndex: {},
    summary: createEmptySeguimientosFinalSummary(),
    workflow,
    suggestedStageId: workflow.suggestedStageId,
  };
}

describe("resolveExpectedCaseUpdatedAt", () => {
  it("returns the ref value when lastCommittedRef has a value (post-save closure bridge)", () => {
    const ref = { current: "2026-05-01T10:01:00.000Z" };
    const draftData = {
      caseMeta: { updatedAt: "2026-05-01T10:00:00.000Z" },
    };

    const result = resolveExpectedCaseUpdatedAt(ref, draftData);

    expect(result).toBe("2026-05-01T10:01:00.000Z");
  });

  it("falls back to currentDraftData.caseMeta.updatedAt when ref is null (first save, no prior response)", () => {
    const ref = { current: null };
    const draftData = {
      caseMeta: { updatedAt: "2026-05-01T10:00:00.000Z" },
    };

    const result = resolveExpectedCaseUpdatedAt(ref, draftData);

    expect(result).toBe("2026-05-01T10:00:00.000Z");
  });

  it("returns null when both ref and draftData have no updatedAt", () => {
    const ref = { current: null };
    const draftData = {
      caseMeta: { updatedAt: null },
    };

    const result = resolveExpectedCaseUpdatedAt(ref, draftData);

    expect(result).toBeNull();
  });

  it("bridges stale closure: ref wins after being updated between saves (non-fantasma proof)", () => {
    // Simulates the exact pattern in handleSaveBaseStage / handleSaveDirtyStages:
    // 1. First save: ref is null (no prior response), uses stale closure value
    // 2. After response: ref is updated with new server timestamp
    // 3. Second save (same closure): ref has value, wins over stale closure
    const ref = { current: null as string | null };
    const draftData = {
      caseMeta: { updatedAt: "2026-05-01T10:00:00.000Z" },
    };

    // First save — uses draft data (no ref yet)
    const firstResult = resolveExpectedCaseUpdatedAt(ref, draftData);
    expect(firstResult).toBe("2026-05-01T10:00:00.000Z");

    // After response, handler updates ref with fresh timestamp
    // (this line corresponds to handleSaveBaseStage / handleSaveDirtyStages
    // setting lastCommittedUpdatedAtRef.current)
    ref.current = "2026-05-01T10:01:00.000Z";

    // Second save (same closure, React hasn't re-rendered yet) — ref wins
    const secondResult = resolveExpectedCaseUpdatedAt(ref, draftData);
    expect(secondResult).toBe("2026-05-01T10:01:00.000Z");

    // NON-FANTASMA PROOF: comment out ref.current = "..." above (line ~39).
    // The second assertion fails: expected T1, received T0 (stale closure).
  });
});

describe("commitHydrationStateWithRef", () => {
  it("updates the ref with the hydration updatedAt", () => {
    const ref = { current: null as string | null };
    const hydration = {
      caseMeta: { updatedAt: "2026-05-01T10:01:00.000Z" },
    };

    commitHydrationStateWithRef(hydration, ref);

    expect(ref.current).toBe("2026-05-01T10:01:00.000Z");
  });

  it("sets ref to null when hydration has no updatedAt", () => {
    const ref = { current: "2026-05-01T10:00:00.000Z" };
    const hydration = {
      caseMeta: { updatedAt: undefined },
    };

    commitHydrationStateWithRef(hydration, ref);

    expect(ref.current).toBeNull();
  });
});

describe("resetLastCommittedUpdatedAtRef", () => {
  it("sets ref to null when called (simulates resetToCedulaGate / restoreFromDraftData)", () => {
    const ref = { current: "2026-05-01T10:05:00.000Z" };

    resetLastCommittedUpdatedAtRef(ref);

    expect(ref.current).toBeNull();

    // After reset, next save falls back to draft data
    const draftData = {
      caseMeta: { updatedAt: "2026-05-02T10:00:00.000Z" },
    };

    const result = resolveExpectedCaseUpdatedAt(ref, draftData);
    expect(result).toBe("2026-05-02T10:00:00.000Z");
  });

  it("is idempotent when ref is already null", () => {
    const ref = { current: null as string | null };

    resetLastCommittedUpdatedAtRef(ref);

    expect(ref.current).toBeNull();
  });
});

describe("useSeguimientosCaseState hydration commits", () => {
  beforeEach(() => {
    vi.useRealTimers();
    routerPush.mockReset();
    routerReplace.mockReset();
    Object.values(draftControllerMocks).forEach((mock) => mock.mockClear());
    draftControllerMocks.isRouteHydrated.mockReturnValue(false);
    draftControllerMocks.buildDraftStatusProps.mockReturnValue({
      savingDraft: false,
      remoteIdentityState: "ready",
      remoteSyncState: "synced",
      hasPendingAutosave: false,
      hasLocalDirtyChanges: false,
      hasPendingRemoteSync: false,
      localDraftSavedAt: null,
      draftSavedAt: null,
      localPersistenceState: "indexeddb",
    });
    draftControllerMocks.buildDraftLockBannerProps.mockReturnValue(null);
    draftControllerMocks.checkpointDraft.mockResolvedValue({
      ok: true,
      draftId: "draft-1",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses a refresh hydration updatedAt for the next save even before React rerenders", async () => {
    const t0 = "2026-05-01T10:00:00.000Z";
    const t1 = "2026-05-01T10:01:00.000Z";
    const t2 = "2026-05-01T10:02:00.000Z";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/bootstrap")) {
        return Response.json({
          status: "ready",
          hydration: createHookHydration(t0),
        });
      }
      if (url.endsWith("/result/refresh")) {
        return Response.json({
          status: "ready",
          hydration: createHookHydration(t1),
        });
      }
      if (url.endsWith("/stage/base")) {
        return Response.json({
          status: "ready",
          hydration: createHookHydration(t2),
          savedAt: t2,
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSeguimientosCaseState());

    await act(async () => {
      await result.current.prepareCase("1001234567");
    });

    await act(async () => {
      await result.current.handleRefreshResultSummary();
      await result.current.handleSaveBaseStage();
    });

    const saveRequest = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/stage/base")
    );
    expect(saveRequest).toBeDefined();
    const [, init] = saveRequest ?? [];
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({
      expectedCaseUpdatedAt: t1,
    });
  });

  it("commits the applied hydration once after a successful save", async () => {
    const t0 = "2026-05-01T10:00:00.000Z";
    const t1 = "2026-05-01T10:01:00.000Z";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/bootstrap")) {
        return Response.json({
          status: "ready",
          hydration: createHookHydration(t0),
        });
      }
      if (url.endsWith("/stage/base")) {
        return Response.json({
          status: "ready",
          hydration: createHookHydration(t1),
          savedAt: t1,
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const commitSpy = vi.spyOn(
      seguimientosCaseStateSync,
      "commitHydrationStateWithRef"
    );

    const { result } = renderHook(() => useSeguimientosCaseState());

    await act(async () => {
      await result.current.prepareCase("1001234567");
    });
    commitSpy.mockClear();

    await act(async () => {
      await result.current.handleSaveBaseStage();
    });

    expect(commitSpy).toHaveBeenCalledTimes(1);
    expect(commitSpy.mock.calls[0]?.[0]).toMatchObject({
      caseMeta: { updatedAt: t1 },
    });
  });

  it("blocks editing for refresh written_needs_reload without applying stale hydration", async () => {
    const t0 = "2026-05-01T10:00:00.000Z";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/bootstrap")) {
        return Response.json({
          status: "ready",
          hydration: createHookHydration(t0),
        });
      }
      if (url.endsWith("/result/refresh")) {
        return Response.json({
          status: "written_needs_reload",
          caseId: "sheet-1",
          message:
            "El consolidado se reparo en Google Sheets. Recarga Seguimientos antes de continuar.",
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSeguimientosCaseState());

    await act(async () => {
      await result.current.prepareCase("1001234567");
    });
    await act(async () => {
      await result.current.handleRefreshResultSummary();
    });

    await waitFor(() => {
      expect(result.current.isSyncRecoveryBlocked).toBe(true);
    });
    expect(result.current.syncRecoveryState).toMatchObject({
      caseId: "sheet-1",
      savedStageIds: [],
      message:
        "El consolidado se reparo en Google Sheets. Recarga Seguimientos antes de continuar.",
    });
    expect(result.current.currentDraftData?.caseMeta.updatedAt).toBe(t0);
  });

  it("blocks editing for export written_needs_reload without applying stale hydration", async () => {
    const t0 = "2026-05-01T10:00:00.000Z";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/bootstrap")) {
        return Response.json({
          status: "ready",
          hydration: createHookHydration(t0),
        });
      }
      if (url.endsWith("/pdf/export")) {
        return Response.json({
          status: "written_needs_reload",
          caseId: "sheet-1",
          message:
            "El consolidado se reparo en Google Sheets. Recarga Seguimientos antes de continuar.",
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSeguimientosCaseState());

    await act(async () => {
      await result.current.prepareCase("1001234567");
    });
    await act(async () => {
      await result.current.handleExportPdf("base_plus_followup_1_plus_final");
    });

    await waitFor(() => {
      expect(result.current.isSyncRecoveryBlocked).toBe(true);
    });
    expect(result.current.syncRecoveryState).toMatchObject({
      caseId: "sheet-1",
      savedStageIds: [],
      message:
        "El consolidado se reparo en Google Sheets. Recarga Seguimientos antes de continuar.",
    });
    expect(result.current.currentDraftData?.caseMeta.updatedAt).toBe(t0);
  });

  it("stores requires_empresa_assignment without converting it into a server error", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/bootstrap")) {
        return Response.json({
          status: "requires_empresa_assignment",
          cedula: "1001234567",
          nombreVinculado: "Ana Perez",
          initialNit: "900000000",
          message:
            "El NIT 900000000 registrado en el vinculado no esta en el catalogo activo. Asigna una empresa valida o cambia el NIT.",
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSeguimientosCaseState());

    await act(async () => {
      await result.current.prepareCase("1001234567");
    });

    expect(result.current.serverError).toBeNull();
    expect(result.current.empresaAssignmentResolution).toEqual({
      kind: "new",
      cedula: "1001234567",
      nombreVinculado: "Ana Perez",
      initialNit: "900000000",
      message:
        "El NIT 900000000 registrado en el vinculado no esta en el catalogo activo. Asigna una empresa valida o cambia el NIT.",
    });
  });

  it("stores duplicate empresa disambiguation and clears it after a ready bootstrap", async () => {
    const t0 = "2026-05-01T10:00:00.000Z";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/bootstrap") && fetchMock.mock.calls.length === 1) {
        return Response.json({
          status: "requires_disambiguation",
          cedula: "1001234567",
          nombreVinculado: "Ana Perez",
          nit: "900123456-1",
          options: [
            {
              id: "emp-1",
              nombre_empresa: "Empresa Uno SAS",
              nit_empresa: "900123456-1",
              ciudad_empresa: "Bogota",
              sede_empresa: "Principal",
              zona_empresa: "Zona Norte",
            },
            {
              id: "emp-2",
              nombre_empresa: "Empresa Dos SAS",
              nit_empresa: "900123456-1",
              ciudad_empresa: "Medellin",
              sede_empresa: "Norte",
              zona_empresa: "Zona Sur",
            },
          ],
          preselectedEmpresaId: "emp-1",
        });
      }
      if (url.endsWith("/bootstrap")) {
        return Response.json({
          status: "ready",
          hydration: createHookHydration(t0),
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSeguimientosCaseState());

    await act(async () => {
      await result.current.prepareCase("1001234567");
    });

    expect(result.current.empresaAssignmentResolution).toMatchObject({
      kind: "disambiguate",
      preselected: {
        id: "emp-1",
        nombre_empresa: "Empresa Uno SAS",
      },
    });
    expect(result.current.serverError).toBeNull();

    await act(async () => {
      await result.current.prepareCase("1001234567");
    });

    expect(result.current.empresaAssignmentResolution).toBeNull();
    expect(result.current.hydration?.caseMeta.updatedAt).toBe(t0);
  });
});
