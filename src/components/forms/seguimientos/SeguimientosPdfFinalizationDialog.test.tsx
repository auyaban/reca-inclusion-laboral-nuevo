// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeguimientosPdfFinalizationDialog } from "@/components/forms/seguimientos/SeguimientosPdfFinalizationDialog";

afterEach(() => {
  cleanup();
});

describe("SeguimientosPdfFinalizationDialog", () => {
  it("renders a blocking processing state without close or retry actions", () => {
    render(
      <SeguimientosPdfFinalizationDialog
        status="processing"
        links={null}
        errorMessage={null}
        onRetry={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId("seguimientos-pdf-finalization-dialog")).toBeTruthy();
    expect(
      screen.getByText("Generando PDF, esto puede tardar unos segundos...")
    ).toBeTruthy();
    expect(screen.queryByTestId("seguimientos-pdf-finalization-close")).toBeNull();
    expect(screen.queryByTestId("seguimientos-pdf-finalization-retry")).toBeNull();
  });

  it("moves focus into the dialog and restores it when closing", () => {
    function Harness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Abrir finalizacion
          </button>
          {open ? (
            <SeguimientosPdfFinalizationDialog
              status="success"
              links={null}
              errorMessage={null}
              onRetry={vi.fn()}
              onClose={() => setOpen(false)}
            />
          ) : null}
        </>
      );
    }

    render(<Harness />);

    const trigger = screen.getByText("Abrir finalizacion");
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);

    const closeButton = screen.getByTestId(
      "seguimientos-pdf-finalization-close"
    );
    expect(document.activeElement).toBe(closeButton);

    fireEvent.click(closeButton);

    expect(document.activeElement).toBe(trigger);
  });

  it("keeps focus on the blocking processing dialog when tabbing", () => {
    render(
      <>
        <button type="button">Control externo</button>
        <SeguimientosPdfFinalizationDialog
          status="processing"
          links={null}
          errorMessage={null}
          onRetry={vi.fn()}
          onClose={vi.fn()}
        />
      </>
    );

    const panel = screen.getByTestId("seguimientos-pdf-finalization-panel");
    expect(document.activeElement).toBe(panel);

    fireEvent.keyDown(panel, { key: "Tab" });

    expect(document.activeElement).toBe(panel);
  });

  it("renders success with completion links and a close action", () => {
    render(
      <SeguimientosPdfFinalizationDialog
        status="success"
        links={{
          sheetLink: "https://docs.google.com/spreadsheets/d/sheet-1/edit",
          pdfLink: "https://drive.google.com/file/d/pdf-1/view",
        }}
        errorMessage={null}
        onRetry={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("PDF generado correctamente.")).toBeTruthy();
    expect(screen.getByText("Ver PDF en Drive")).toBeTruthy();
    expect(screen.getByText("Ver acta en Google Sheets")).toBeTruthy();
    expect(screen.getByTestId("seguimientos-pdf-finalization-close")).toBeTruthy();
  });

  it("renders an actionable error state with retry and close actions", () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();

    render(
      <SeguimientosPdfFinalizationDialog
        status="error"
        links={null}
        errorMessage="Drive rechazo la exportacion."
        onRetry={onRetry}
        onClose={onClose}
      />
    );

    expect(screen.getByText("Drive rechazo la exportacion.")).toBeTruthy();

    fireEvent.click(screen.getByTestId("seguimientos-pdf-finalization-retry"));
    fireEvent.click(screen.getByTestId("seguimientos-pdf-finalization-close"));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
