// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getInitialLongFormFinalizationProgress } from "@/lib/longFormFinalization";

const {
  replaceMock,
  pushMock,
  draftRuntimeMock,
  finalizationRuntimeMock,
  useEmpresaStoreMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
  draftRuntimeMock: vi.fn(),
  finalizationRuntimeMock: vi.fn(),
  useEmpresaStoreMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock,
  }),
}));

vi.mock("@/hooks/useGooglePrewarm", () => ({
  useGooglePrewarm: () => undefined,
}));

vi.mock("@/hooks/formDraft/useInitialLocalDraftSeed", () => ({
  useInitialLocalDraftSeed: () => undefined,
}));

vi.mock("@/hooks/useInvisibleDraftTelemetry", () => ({
  useInvisibleDraftTelemetry: () => ({
    reportInvisibleDraftSuppression: vi.fn(),
  }),
}));

vi.mock("@/hooks/interpreteLsc/useInterpreteLscDraftRuntime", () => ({
  useInterpreteLscDraftRuntime: draftRuntimeMock,
}));

vi.mock("@/hooks/interpreteLsc/useInterpreteLscFinalizationRuntime", () => ({
  useInterpreteLscFinalizationRuntime: finalizationRuntimeMock,
}));

vi.mock("@/hooks/useProfesionalesCatalog", () => ({
  useProfesionalesCatalog: () => ({ profesionales: [] }),
}));

vi.mock("@/hooks/useInterpretesCatalog", () => ({
  useInterpretesCatalog: () => ({
    interpretes: [],
    error: null,
    creatingName: null,
    createInterprete: vi.fn(),
  }),
}));

vi.mock("@/lib/store/empresaStore", () => ({
  useEmpresaStore: useEmpresaStoreMock,
}));

import { useInterpreteLscFormState } from "@/hooks/useInterpreteLscFormState";

const sharedCompany = {
  id: "empresa-1",
  nombre_empresa: "CORONA INDUSTRIAL SAS",
  nit_empresa: "900696296-4",
  profesional_asignado: "Profesional RECA",
} as const;

function buildDraftRuntime() {
  return {
    draftParam: null,
    sessionParam: "session-lsc",
    explicitNewDraft: false,
    invisibleDraftPilotEnabled: false,
    bootstrapDraftId: null,
    activeDraftId: null,
    localDraftSessionId: "session-lsc",
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
    loadLocal: vi.fn().mockResolvedValue(null),
    checkpointDraft: vi.fn().mockResolvedValue(undefined),
    saveDraft: vi.fn().mockResolvedValue({ ok: true, draftId: null }),
    loadDraft: vi.fn().mockResolvedValue({ draft: null, empresa: null, error: null }),
    startNewDraftSession: vi.fn(() => "session-lsc"),
    setDraftAlias: vi.fn(),
    draftLifecycleSuspended: false,
    restoringDraft: false,
    setRestoringDraft: vi.fn(),
    beginRouteHydration: vi.fn(),
    isRouteHydrated: vi.fn(() => true),
    isRouteHydrationSettled: vi.fn(() => true),
    markRouteHydrated: vi.fn(),
    suspendDraftLifecycle: vi.fn(),
    resumeDraftLifecycle: vi.fn(),
    buildDraftStatusProps: vi.fn(() => ({ onSave: vi.fn() })),
    buildDraftLockBannerProps: vi.fn(() => ({})),
    checkpointInvalidSubmission: vi.fn(),
    clearDraftAfterSuccess: vi.fn(),
    isReadonlyDraft: false,
    ensureDraftIdentity: vi.fn().mockResolvedValue(undefined),
  };
}

describe("useInterpreteLscFormState", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pushMock.mockReset();
    draftRuntimeMock.mockReset();
    finalizationRuntimeMock.mockReset();
    useEmpresaStoreMock.mockImplementation((selector) =>
      selector({
        empresa: sharedCompany,
        setEmpresa: vi.fn(),
        clearEmpresa: vi.fn(),
      })
    );
    draftRuntimeMock.mockReturnValue(buildDraftRuntime());
    finalizationRuntimeMock.mockReturnValue({
      submitConfirmOpen: false,
      isFinalizing: false,
      finalizationProgress: getInitialLongFormFinalizationProgress(),
      finalizationFeedbackRef: { current: null },
      resetFinalizationProgress: vi.fn(),
      handlePrepareSubmit: vi.fn(),
      confirmSubmit: vi.fn().mockResolvedValue(undefined),
      cancelSubmitDialog: vi.fn(),
      reportInvalidSubmissionPromotion: vi.fn(),
    });
  });

  it("keeps navigation and summary stable across rerenders with unchanged form slices", () => {
    const { result, rerender } = renderHook(() => useInterpreteLscFormState());

    expect(result.current.mode).toBe("editing");
    if (result.current.mode !== "editing") {
      throw new Error("Expected editing mode");
    }

    const firstNavItems = result.current.presenterProps.shell.navItems;
    const firstServiceSummary = result.current.presenterProps.serviceSummary;

    rerender();

    expect(result.current.mode).toBe("editing");
    if (result.current.mode !== "editing") {
      throw new Error("Expected editing mode");
    }

    expect(result.current.presenterProps.shell.navItems).toBe(firstNavItems);
    expect(result.current.presenterProps.serviceSummary).toBe(firstServiceSummary);
    expect(result.current.presenterProps.draftStatus).toBeTruthy();
    expect(result.current.presenterProps.shell.finalizationFeedback).toBeNull();
    expect(result.current.presenterProps.shell.navItems).toEqual([
      {
        id: "company",
        label: "Empresa y servicio",
        shortLabel: "Empresa",
        status: "active",
      },
      {
        id: "participants",
        label: "Oferentes / vinculados",
        shortLabel: "Oferentes",
        status: "idle",
      },
      {
        id: "interpreters",
        label: "Interpretes y horas",
        shortLabel: "Interpretes",
        status: "idle",
      },
      {
        id: "attendees",
        label: "Asistentes",
        shortLabel: "Asistentes",
        status: "idle",
      },
    ]);
  });
});
