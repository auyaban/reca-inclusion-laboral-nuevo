// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { useMemo } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyEvaluacionValues } from "@/lib/evaluacion";
import {
  INITIAL_EVALUACION_COLLAPSED_SECTIONS,
  type EvaluacionSectionId,
} from "@/lib/evaluacionSections";
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
    profesionales: [],
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

import { useEvaluacionFormState } from "@/hooks/useEvaluacionFormState";

const SESSION_ID = "session-evaluacion";

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
  return useMemo(() => {
    return {
      activeDraftId: null,
      localDraftSessionId: SESSION_ID,
      loadingDraft: false,
      savingDraft: false,
      editingAuthorityState: "editable",
      lockConflict: null,
      isDraftEditable: true,
      autosave: vi.fn(),
      flushAutosave: vi.fn().mockResolvedValue(undefined),
      hasPendingAutosave: false,
      hasLocalDirtyChanges: false,
      localDraftSavedAt: null,
      loadLocal: loadLocalMock,
      checkpointDraft: vi.fn().mockResolvedValue(undefined),
      saveDraft: vi.fn().mockResolvedValue({ ok: true, draftId: null }),
      loadDraft: vi.fn().mockResolvedValue({ draft: null, empresa: null, error: null }),
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
    };
  }, []);
}

function buildSectionRuntime() {
  return {
    activeSectionId: "company" as EvaluacionSectionId,
    setActiveSectionId: vi.fn(),
    collapsedSections: INITIAL_EVALUACION_COLLAPSED_SECTIONS,
    setCollapsedSections: vi.fn(),
    scrollToSection: vi.fn(),
    toggleSection: vi.fn(),
    selectSection: vi.fn(),
  };
}

describe("useEvaluacionFormState", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.scrollTo = vi.fn();
    hydratedRouteKeys.clear();

    storeState.empresa = null;
    setEmpresaMock.mockImplementation((nextEmpresa: Empresa | null) => {
      storeState.empresa = nextEmpresa;
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

    loadLocalMock.mockResolvedValue({
      data: createEmptyEvaluacionValues(EMPRESA),
      empresa: EMPRESA,
      step: 1,
    });

    useLongFormDraftControllerMock.mockImplementation(() =>
      useDraftControllerMockState()
    );
    useLongFormSectionsMock.mockReturnValue(buildSectionRuntime());
  });

  it("does not rerun session hydration after restoring a local draft into the empresa store", async () => {
    const { rerender, unmount } = renderHook(() => useEvaluacionFormState(), {
      reactStrictMode: false,
    });

    await waitFor(() => {
      expect(setEmpresaMock).toHaveBeenCalledWith(EMPRESA);
    });

    expect(loadLocalMock).toHaveBeenCalledTimes(1);
    expect(beginRouteHydrationMock).toHaveBeenCalledTimes(1);
    expect(markRouteHydratedMock).toHaveBeenCalledTimes(1);

    rerender();

    await waitFor(() => {
      expect(loadLocalMock).toHaveBeenCalledTimes(1);
    });

    expect(beginRouteHydrationMock).toHaveBeenCalledTimes(1);
    expect(markRouteHydratedMock).toHaveBeenCalledTimes(1);
    expect(storeState.empresa).toEqual(EMPRESA);

    unmount();
  });
});
