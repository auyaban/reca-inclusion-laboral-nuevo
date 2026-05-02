// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeguimientosBaseStageSummary } from "@/components/forms/seguimientos/SeguimientosBaseStageSummary";
import { SEGUIMIENTOS_BASE_STAGE_ID } from "@/lib/seguimientos";
import type { SeguimientosStageState } from "@/lib/seguimientosStages";

afterEach(() => {
  cleanup();
});

function buildProtectedBaseStageState(): SeguimientosStageState {
  return {
    stageId: SEGUIMIENTOS_BASE_STAGE_ID,
    kind: "base",
    label: "Ficha inicial",
    title: "Ficha inicial",
    status: "completed",
    progress: {
      filled: 10,
      total: 10,
      coveragePercent: 100,
      hasMeaningfulContent: true,
      meetsMinimumRequirements: true,
      status: "completed",
      isCompleted: true,
    },
    isSuggested: false,
    isEditable: false,
    isProtectedByDefault: true,
    supportsOverride: true,
    supportsCopyForward: false,
    supportsFailedVisitPreset: false,
    overrideActive: false,
    helperText: "Ficha protegida.",
  };
}

function renderSummary(overrides: Partial<{
  isReadonlyDraft: boolean;
  isReEntry: boolean;
  onRequestOverride: () => void;
}> = {}) {
  return render(
    <SeguimientosBaseStageSummary
      baseValues={{
        nombre_vinculado: "Ana Perez",
        cedula: "1001234567",
        nombre_empresa: "Empresa Uno",
        nit_empresa: "900123456",
        tipo_contrato: "Indefinido",
        cargo_vinculado: "Analista",
        modalidad: "Presencial",
        fecha_visita: "2026-04-21",
      }}
      stageState={buildProtectedBaseStageState()}
      isReadonlyDraft={overrides.isReadonlyDraft ?? false}
      isReEntry={overrides.isReEntry ?? true}
      onRequestOverride={overrides.onRequestOverride ?? vi.fn()}
    />
  );
}

describe("SeguimientosBaseStageSummary", () => {
  it("does not nest the reopen button inside the toggle button", () => {
    const { container } = renderSummary();

    expect(screen.getByTestId("seguimientos-base-stage-toggle")).toBeTruthy();
    expect(screen.getByTestId("seguimientos-base-stage-reopen-button")).toBeTruthy();
    expect(container.querySelectorAll("button button")).toHaveLength(0);
  });

  it("toggles the summary content when the header toggle is clicked", () => {
    renderSummary();

    expect(screen.queryByTestId("seguimientos-base-stage-summary-content")).toBeNull();

    fireEvent.click(screen.getByTestId("seguimientos-base-stage-toggle"));
    expect(screen.getByTestId("seguimientos-base-stage-summary-content")).toBeTruthy();

    fireEvent.click(screen.getByTestId("seguimientos-base-stage-toggle"));
    expect(screen.queryByTestId("seguimientos-base-stage-summary-content")).toBeNull();
  });

  it("requests override from the reopen button without toggling the summary", () => {
    const onRequestOverride = vi.fn();
    renderSummary({ onRequestOverride });

    expect(screen.queryByTestId("seguimientos-base-stage-summary-content")).toBeNull();

    fireEvent.click(screen.getByTestId("seguimientos-base-stage-reopen-button"));

    expect(onRequestOverride).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("seguimientos-base-stage-summary-content")).toBeNull();
  });
});
