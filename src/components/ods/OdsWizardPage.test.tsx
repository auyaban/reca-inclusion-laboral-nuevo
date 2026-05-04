// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useOdsStore } from "@/hooks/useOdsStore";
import type { PipelineResult } from "@/lib/ods/import/pipeline";

const previewResult: PipelineResult & { telemetria_id?: string } = {
  success: true,
  level: 4,
  analysis: {},
  participants: [],
  suggestions: [],
  decisionLog: [],
  warnings: [],
  formato_finalizado_id: "11111111-1111-4111-8111-111111111111",
  telemetria_id: "55555555-5555-4555-8555-555555555555",
};

vi.mock("@/components/ods/sections/Seccion1", () => ({
  Seccion1: () => <div data-testid="seccion-1" />,
}));
vi.mock("@/components/ods/sections/Seccion2", () => ({
  Seccion2: () => <div data-testid="seccion-2" />,
}));
vi.mock("@/components/ods/sections/Seccion3", () => ({
  Seccion3: () => <div data-testid="seccion-3" />,
}));
vi.mock("@/components/ods/sections/Seccion4", () => ({
  Seccion4: () => <div data-testid="seccion-4" />,
}));
vi.mock("@/components/ods/sections/Seccion5", () => ({
  Seccion5: () => <div data-testid="seccion-5" />,
}));
vi.mock("@/components/ods/StickyResumenBar", () => ({
  StickyResumenBar: () => <div data-testid="sticky-resumen" />,
}));
vi.mock("@/components/ods/SummaryCard", () => ({
  SummaryCard: () => <div data-testid="summary-card" />,
}));
vi.mock("@/components/ods/ImportActaModal", () => ({
  ImportActaModal: ({ open, onPreview }: { open: boolean; onPreview: (result: typeof previewResult) => void }) =>
    open ? (
      <button type="button" onClick={() => onPreview(previewResult)}>
        mock preview
      </button>
    ) : null,
}));
vi.mock("@/components/ods/ImportPreviewDialog", () => ({
  ImportPreviewDialog: ({
    open,
    onApply,
  }: {
    open: boolean;
    onApply: () => void;
  }) =>
    open ? (
      <button type="button" onClick={onApply}>
        mock apply
      </button>
    ) : null,
}));

afterEach(() => {
  cleanup();
  useOdsStore.getState().reset();
});

describe("OdsWizardPage import telemetry metadata", () => {
  it("stores telemetria_id when applying an import preview", async () => {
    const { default: OdsWizardPage } = await import("@/components/ods/OdsWizardPage");

    render(<OdsWizardPage />);

    fireEvent.click(screen.getByTestId("ods-import-acta-button"));
    fireEvent.click(screen.getByText("mock preview"));
    fireEvent.click(screen.getByText("mock apply"));

    expect(useOdsStore.getState().formato_finalizado_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(useOdsStore.getState().telemetria_id).toBe("55555555-5555-4555-8555-555555555555");
  });
});
