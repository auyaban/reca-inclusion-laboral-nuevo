// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeguimientosCaseOverview } from "@/components/forms/seguimientos/SeguimientosCaseOverview";
import {
  SEGUIMIENTOS_BASE_STAGE_ID,
  createEmptySeguimientosBaseValues,
} from "@/lib/seguimientos";
import type {
  SeguimientosCaseHydration,
  SeguimientosDraftData,
} from "@/lib/seguimientosRuntime";
import { buildSeguimientosWorkflow } from "@/lib/seguimientosStages";

function createOverviewProps() {
  const base = createEmptySeguimientosBaseValues();
  const workflow = buildSeguimientosWorkflow({
    companyType: "no_compensar",
    baseValues: base,
    persistedBaseValues: base,
  });
  const caseMeta = {
    caseId: "case-1",
    cedula: "1001234567",
    nombreVinculado: "Persona Demo",
    empresaNit: "900123456",
    empresaNombre: "Empresa Demo SAS",
    companyType: "no_compensar",
    maxFollowups: 3,
    driveFolderId: null,
    spreadsheetId: null,
    spreadsheetUrl: null,
    folderName: null,
    baseSheetName: null,
    profesionalAsignado: null,
    cajaCompensacion: null,
    createdAt: null,
    updatedAt: null,
  } as const;
  const hydration = {
    schemaVersion: 1,
    caseMeta,
    empresaSnapshot: null,
    personPrefill: {},
    stageDraftStateByStageId: {},
    baseValues: base,
    persistedBaseValues: base,
    followupValuesByIndex: {},
    persistedFollowupValuesByIndex: {},
    summary: {},
    workflow,
    suggestedStageId: SEGUIMIENTOS_BASE_STAGE_ID,
  } as unknown as SeguimientosCaseHydration;
  const draftData = {
    schemaVersion: 1,
    caseMeta,
    empresaSnapshot: null,
    personPrefill: {},
    stageDraftStateByStageId: {},
    workflow,
    activeStageId: SEGUIMIENTOS_BASE_STAGE_ID,
    base,
    persistedBase: base,
    followups: {},
    persistedFollowups: {},
    summary: {},
  } as unknown as SeguimientosDraftData;

  return { hydration, draftData, workflow };
}

afterEach(() => {
  cleanup();
});

describe("SeguimientosCaseOverview", () => {
  it("uses the shared backoffice header while preserving back navigation", () => {
    const { hydration, draftData, workflow } = createOverviewProps();
    const onBack = vi.fn();

    render(
      <SeguimientosCaseOverview
        hydration={hydration}
        draftData={draftData}
        workflow={workflow}
        activeStageId={SEGUIMIENTOS_BASE_STAGE_ID}
        isFirstEntry={false}
        isReEntry={false}
        isReadonlyDraft={false}
        serverError={null}
        statusNotice={null}
        onBack={onBack}
        onStageSelect={vi.fn()}
        onRequestBaseStageOverride={vi.fn()}
      >
        <div data-testid="active-stage-editor" />
      </SeguimientosCaseOverview>
    );

    expect(screen.getByTestId("backoffice-page-header")).toBeTruthy();
    expect(
      screen.getByText((content) => content.includes("Persona Demo"))
    ).toBeTruthy();

    fireEvent.click(screen.getByTestId("seguimientos-overview-back"));

    expect(onBack).toHaveBeenCalledOnce();
  });
});
