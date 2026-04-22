// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SeguimientosFinalStageEditor } from "@/components/forms/seguimientos/SeguimientosFinalStageEditor";
import { createEmptySeguimientosFinalSummary } from "@/lib/seguimientos";

afterEach(() => {
  cleanup();
});

describe("SeguimientosFinalStageEditor", () => {
  it("maps the technical integrity state to a human-readable label", () => {
    const summary = {
      ...createEmptySeguimientosFinalSummary(),
      formulaIntegrity: "stale" as const,
      formulaValidationMode: "direct_write_only" as const,
      fields: {
        estado_global: "",
      },
    };

    const html = renderToStaticMarkup(
      <SeguimientosFinalStageEditor
        summary={summary}
        pdfOptions={[
          {
            id: "base_only",
            label: "Solo ficha inicial",
            includesBase: true,
            fechaSeguimiento: null,
            includeFinalSummary: false,
            enabled: false,
            disabledReason: "Ficha inicial aun no esta lista",
          },
        ]}
        completionLinks={null}
        isReadonly={false}
        refreshing={false}
        exporting={false}
        pdfBlockedReason={null}
        onRefresh={vi.fn().mockResolvedValue(true)}
        onExport={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(html).toContain("Estado del consolidado: Parcial");
    expect(html).toContain(
      "Guardar borrador o guardar en Google Sheets no generan el PDF automaticamente."
    );
    expect(html).toContain("Algunos campos se validan automáticamente en esta fase.");
    expect(html).toContain("—");
  });

  it("renders all variants and surfaces the selected disabled reason", () => {
    render(
      <SeguimientosFinalStageEditor
        summary={{
          ...createEmptySeguimientosFinalSummary(),
          formulaIntegrity: "healthy",
          exportReady: false,
          fields: {
            estado_global: "Listo",
          },
        }}
        pdfOptions={[
          {
            id: "base_only",
            label: "Solo ficha inicial",
            includesBase: true,
            fechaSeguimiento: null,
            includeFinalSummary: false,
            enabled: true,
            disabledReason: null,
          },
          {
            id: "base_plus_followup_1",
            label: "Ficha inicial + Seguimiento 1",
            includesBase: true,
            followupIndex: 1,
            fechaSeguimiento: "2026-04-21",
            includeFinalSummary: false,
            enabled: true,
            disabledReason: null,
          },
          {
            id: "base_plus_followup_2",
            label: "Ficha inicial + Seguimiento 2",
            includesBase: true,
            followupIndex: 2,
            fechaSeguimiento: null,
            includeFinalSummary: false,
            enabled: false,
            disabledReason: "Seguimiento 2 aun no esta guardado",
          },
        ]}
        completionLinks={null}
        isReadonly={false}
        refreshing={false}
        exporting={false}
        pdfBlockedReason={null}
        onRefresh={vi.fn().mockResolvedValue(true)}
        onExport={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(
      screen.getByTestId("seguimientos-final-pdf-option-base_only")
    ).toBeTruthy();
    expect(
      screen.getByTestId("seguimientos-final-pdf-option-base_plus_followup_1")
    ).toBeTruthy();
    expect(
      screen.getByTestId("seguimientos-final-pdf-option-base_plus_followup_2")
    ).toBeTruthy();

    fireEvent.click(
      screen.getByTestId("seguimientos-final-pdf-option-base_plus_followup_2")
    );

    expect(screen.getByTestId("seguimientos-final-pdf-notice").textContent).toContain(
      "Seguimiento 2 aun no esta guardado"
    );
    expect(
      screen
        .getByTestId("seguimientos-final-export-button")
        .hasAttribute("disabled")
    ).toBe(true);
  });
});
