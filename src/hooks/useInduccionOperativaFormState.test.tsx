// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { useMemo } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INITIAL_INDUCCION_OPERATIVA_COLLAPSED_SECTIONS,
  type InduccionOperativaSectionId,
} from "@/lib/induccionOperativaSections";
import type { Empresa } from "@/lib/store/empresaStore";

const {
  useSearchParamsMock,
  routerMock,
  useLongFormDraftControllerMock,
  useLongFormSectionsMock,
  useEmpresaStoreMock,
  setEmpresaMock,
  clearEmpresaMock,
  loadLocalMock,
  beginRouteHydrationMock,
  markRouteHydratedMock,
  reportInvisibleDraftSuppressionMock,
  buildDraftStatusPropsMock,
  buildDraftLockBannerPropsMock,
  storeState,
  hydratedRouteKeys,
  autosaveMock,
  flushAutosaveMock,
} = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  routerMock: {
    replace: vi.fn(),
    push: vi.fn(),
  },
  useLongFormDraftControllerMock: vi.fn(),
  useLongFormSectionsMock: vi.fn(),
  useEmpresaStoreMock: vi.fn(),
  setEmpresaMock: vi.fn(),
  clearEmpresaMock: vi.fn(),
  loadLocalMock: vi.fn(),
  beginRouteHydrationMock: vi.fn(),
  markRouteHydratedMock: vi.fn(),
  reportInvisibleDraftSuppressionMock: vi.fn(),
  buildDraftStatusPropsMock: vi.fn(() => ({})),
  buildDraftLockBannerPropsMock: vi.fn(() => ({})),
  storeState: {
    empresa: null as Empresa | null,
  },
  hydratedRouteKeys: new Set<string>(),
  autosaveMock: vi.fn(),
  flushAutosaveMock: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock("@/hooks/useGooglePrewarm", () => ({
  useGooglePrewarm: () => undefined,
}));

vi.mock("@/hooks/formDraft/useInitialLocalDraftSeed", () => ({
  useInitialLocalDraftSeed: () => undefined,
}));

vi.mock("@/hooks/useInvisibleDraftTelemetry", () => ({
  useInvisibleDraftTelemetry: () => ({
    reportInvisibleDraftSuppression: reportInvisibleDraftSuppressionMock,
  }),
}));

vi.mock("@/hooks/useProfesionalesCatalog", () => ({
  useProfesionalesCatalog: () => ({
    profesionales: [
      {
        nombre_profesional: "Marta Ruiz",
        cargo_profesional: "Profesional RECA",
      },
    ],
  }),
}));

vi.mock("@/hooks/useLongFormDraftController", () => ({
  useLongFormDraftController: useLongFormDraftControllerMock,
}));

vi.mock("@/hooks/useLongFormSections", () => ({
  useLongFormSections: useLongFormSectionsMock,
}));

vi.mock("@/lib/store/empresaStore", () => ({
  useEmpresaStore: useEmpresaStoreMock,
}));

import { useInduccionOperativaFormState } from "@/hooks/useInduccionOperativaFormState";

const SESSION_ID = "session-induccion-operativa";

const EMPRESA: Empresa = {
  id: "empresa-1",
  nombre_empresa: "ACME SAS",
  nit_empresa: "900123456",
  direccion_empresa: "Calle 1",
  ciudad_empresa: "Bogota",
  sede_empresa: "Principal",
  zona_empresa: null,
  correo_1: "contacto@acme.com",
  contacto_empresa: "Laura Gomez",
  telefono_empresa: "3000000000",
  cargo: "Gerente",
  profesional_asignado: "Marta Ruiz",
  correo_profesional: "marta@reca.com",
  asesor: "Carlos Ruiz",
  correo_asesor: "carlos@reca.com",
  caja_compensacion: "Compensar",
};

function useDraftControllerMockState() {
  return useMemo(
    () => ({
      activeDraftId: null,
      localDraftSessionId: SESSION_ID,
      loadingDraft: false,
      savingDraft: false,
      editingAuthorityState: "editable",
      lockConflict: null,
      isDraftEditable: true,
      autosave: autosaveMock,
      flushAutosave: flushAutosaveMock,
      hasPendingAutosave: false,
      hasLocalDirtyChanges: false,
      localDraftSavedAt: null,
      loadLocal: loadLocalMock,
      checkpointDraft: vi.fn().mockResolvedValue(undefined),
      saveDraft: vi.fn().mockResolvedValue({ ok: true, draftId: null }),
      loadDraft: vi
        .fn()
        .mockResolvedValue({ draft: null, empresa: null, error: null }),
      startNewDraftSession: vi.fn(() => SESSION_ID),
      draftLifecycleSuspended: false,
      restoringDraft: false,
      setRestoringDraft: vi.fn(),
      beginRouteHydration: beginRouteHydrationMock,
      isRouteHydrated: vi.fn((routeKey: string | null) =>
        routeKey ? hydratedRouteKeys.has(routeKey) : false
      ),
      isRouteHydrationSettled: vi.fn((routeKey: string | null) =>
        routeKey ? hydratedRouteKeys.has(routeKey) : false
      ),
      markRouteHydrated: vi.fn((routeKey: string | null) => {
        if (routeKey) {
          hydratedRouteKeys.add(routeKey);
        } else {
          hydratedRouteKeys.clear();
        }
        markRouteHydratedMock(routeKey);
      }),
      suspendDraftLifecycle: vi.fn(),
      resumeDraftLifecycle: vi.fn(),
      buildDraftStatusProps: buildDraftStatusPropsMock,
      buildDraftLockBannerProps: buildDraftLockBannerPropsMock,
      checkpointInvalidSubmission: vi.fn(),
      clearDraftAfterSuccess: vi.fn().mockResolvedValue(undefined),
      isReadonlyDraft: false,
      ensureDraftIdentity: vi.fn().mockResolvedValue(undefined),
    }),
    []
  );
}

function buildSectionRuntime() {
  return {
    activeSectionId: "company" as InduccionOperativaSectionId,
    setActiveSectionId: vi.fn(),
    collapsedSections: INITIAL_INDUCCION_OPERATIVA_COLLAPSED_SECTIONS,
    setCollapsedSections: vi.fn(),
    scrollToSection: vi.fn(),
    toggleSection: vi.fn(),
    selectSection: vi.fn(),
  };
}

describe("useInduccionOperativaFormState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    hydratedRouteKeys.clear();
    autosaveMock.mockReset();
    flushAutosaveMock.mockReset();
    flushAutosaveMock.mockResolvedValue(true);
    storeState.empresa = EMPRESA;

    setEmpresaMock.mockImplementation((nextEmpresa: Empresa | null) => {
      storeState.empresa = nextEmpresa;
    });
    clearEmpresaMock.mockImplementation(() => {
      storeState.empresa = null;
    });

    useEmpresaStoreMock.mockImplementation(
      (selector: (state: {
        empresa: Empresa | null;
        setEmpresa: typeof setEmpresaMock;
        clearEmpresa: typeof clearEmpresaMock;
      }) => unknown) =>
        selector({
          empresa: storeState.empresa,
          setEmpresa: setEmpresaMock,
          clearEmpresa: clearEmpresaMock,
        })
    );

    useSearchParamsMock.mockImplementation(() => ({
      get: (key: string) => (key === "session" ? SESSION_ID : null),
    }));

    loadLocalMock.mockResolvedValue(null);

    useLongFormDraftControllerMock.mockImplementation(() =>
      useDraftControllerMockState()
    );
    useLongFormSectionsMock.mockReturnValue(buildSectionRuntime());
  });

  it("applies failed visit and forces persistence while relaxing followup requirements", async () => {
    const { result } = renderHook(() => useInduccionOperativaFormState(), {
      reactStrictMode: false,
    });

    await waitFor(() => {
      expect(result.current.mode).toBe("editing");
    });

    if (result.current.mode !== "editing") {
      throw new Error("Expected editing state");
    }

    expect(result.current.presenterProps.sections.followup.required).toBe(true);
    expect(result.current.presenterProps.sections.observations.required).toBe(
      false
    );

    await act(async () => {
      result.current.presenterProps.failedVisitDialog.onConfirm();
    });

    await waitFor(() => {
      expect(flushAutosaveMock).toHaveBeenCalledTimes(1);
      expect(result.current.mode).toBe("editing");
      expect(
        result.current.mode === "editing" &&
          result.current.presenterProps.sections.followup.required
      ).toBe(false);
      expect(
        result.current.mode === "editing" &&
          result.current.presenterProps.sections.observations.required
      ).toBe(true);
    });

    const failedVisitAutosaveCall = autosaveMock.mock.calls.find(
      (call) => call[2]?.forcePersist === true
    ) as
      | [number, Record<string, unknown>, { forcePersist?: boolean } | undefined]
      | undefined;

    expect(failedVisitAutosaveCall).toBeDefined();
    expect(failedVisitAutosaveCall?.[1].ajustes_requeridos).toBe("No aplica");
    expect(
      failedVisitAutosaveCall?.[1].section_3?.funciones_corresponden_perfil
        ?.ejecucion
    ).toBe("No aplica");
    expect(typeof failedVisitAutosaveCall?.[1].failed_visit_applied_at).toBe(
      "string"
    );
  });
});
