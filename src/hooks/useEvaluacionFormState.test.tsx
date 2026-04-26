// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { useMemo } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyEvaluacionValues } from "@/lib/evaluacion";
import {
  INITIAL_EVALUACION_COLLAPSED_SECTIONS,
  EVALUACION_QUESTION_SECTION_IDS,
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
      autosave: autosaveMock,
      flushAutosave: flushAutosaveMock,
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
    autosaveMock.mockReset();
    flushAutosaveMock.mockReset();
    flushAutosaveMock.mockResolvedValue(true);

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

  it("applies failed visit as a one-way action and forces immediate draft persistence", async () => {
    storeState.empresa = EMPRESA;
    loadLocalMock.mockResolvedValue(null);

    const { result } = renderHook(() => useEvaluacionFormState(), {
      reactStrictMode: false,
    });

    await waitFor(() => {
      expect(result.current.mode).toBe("editing");
    });

    if (result.current.mode !== "editing") {
      throw new Error("Expected editing state");
    }

    expect(result.current.presenterProps.sections.section_6.required).toBe(false);
    expect(
      result.current.presenterProps.sections.section_8.minMeaningfulAttendees
    ).toBe(2);
    expect(
      result.current.presenterProps.shell.navItems
        .flatMap((item) => (item.type === "group" ? item.children : [item]))
        .filter((item) =>
          EVALUACION_QUESTION_SECTION_IDS.includes(
            item.id as (typeof EVALUACION_QUESTION_SECTION_IDS)[number]
          )
        )
        .some((item) => item.status === "completed")
    ).toBe(false);

    await act(async () => {
      result.current.presenterProps.failedVisitDialog.onConfirm();
    });

    await waitFor(() => {
      expect(flushAutosaveMock).toHaveBeenCalledTimes(1);
      expect(result.current.mode).toBe("editing");
      expect(
        result.current.mode === "editing" &&
          result.current.presenterProps.sections.section_6.required
      ).toBe(true);
      expect(
        result.current.mode === "editing" &&
          result.current.presenterProps.sections.section_8.minMeaningfulAttendees
      ).toBe(1);
    });

    const failedVisitAutosaveCall = autosaveMock.mock.calls.find(
      (call) => call[2]?.forcePersist === true
    ) as
      | [number, Record<string, unknown>, { forcePersist?: boolean } | undefined]
      | undefined;

    expect(failedVisitAutosaveCall).toBeDefined();
    expect(typeof failedVisitAutosaveCall?.[1].failed_visit_applied_at).toBe(
      "string"
    );
    const failedVisitQuestionStatuses =
      result.current.mode === "editing"
        ? result.current.presenterProps.shell.navItems
            .flatMap((item) => (item.type === "group" ? item.children : [item]))
            .filter((item) =>
              EVALUACION_QUESTION_SECTION_IDS.includes(
                item.id as (typeof EVALUACION_QUESTION_SECTION_IDS)[number]
              )
            )
            .map((item) => item.status)
        : [];

    expect(failedVisitQuestionStatuses).toHaveLength(
      EVALUACION_QUESTION_SECTION_IDS.length
    );
    expect(failedVisitQuestionStatuses.every((status) => status === "completed")).toBe(
      true
    );
    expect(autosaveMock.mock.invocationCallOrder[0]).toBeLessThan(
      flushAutosaveMock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY
    );
  });
});
