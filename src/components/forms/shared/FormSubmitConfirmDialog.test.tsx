// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FormSubmitConfirmDialog } from "@/components/forms/shared/FormSubmitConfirmDialog";

describe("FormSubmitConfirmDialog", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the confirmation state with primary actions", () => {
    const html = renderToStaticMarkup(
      <FormSubmitConfirmDialog
        open
        description="Confirma el envÃ­o del acta."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(html).toContain("Confirmar envío");
    expect(html).toContain("Confirma el envÃ­o del acta.");
    expect(html).toContain("Cancelar");
  });

  it("renders the processing state with steps and elapsed time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T20:01:10.000Z"));

    const html = renderToStaticMarkup(
      <FormSubmitConfirmDialog
        open
        phase="processing"
        progress={{
          phase: "processing",
          currentStageId: "esperando_respuesta",
          startedAt: new Date("2026-04-15T20:00:00.000Z").getTime(),
          displayMessage: null,
          errorMessage: null,
          retryAction: "submit",
        }}
        description="Confirma el envÃ­o del acta."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(html).toContain("Publicando acta");
    expect(html).toContain("Procesando acta");
    expect(html).toContain("01:10");

    vi.useRealTimers();
  });

  it("renders a verification retry action when confirmation polling fails", () => {
    const html = renderToStaticMarkup(
      <FormSubmitConfirmDialog
        open
        phase="processing"
        progress={{
          phase: "error",
          currentStageId: "verificando_publicacion",
          startedAt: new Date("2026-04-15T20:00:00.000Z").getTime(),
          displayMessage:
            "No pudimos confirmar la publicaciÃ³n. Puede que el acta ya estÃ© guardada.",
          errorMessage: "No pudimos confirmar la publicaciÃ³n.",
          retryAction: "check_status",
        }}
        confirmLabel="Verificar de nuevo"
        cancelLabel="Cerrar"
        description="Confirma el envÃ­o del acta."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(html).toContain("Publicación interrumpida");
    expect(html).toContain("No pudimos confirmar la publicaciÃ³n.");
    expect(html).toContain("Verificar de nuevo");
    expect(html).toContain("Cerrar");
    expect(html).toContain(
      "No pudimos confirmar la publicaciÃ³n. Puede que el acta ya estÃ© guardada."
    );
  });

  it("keeps the elapsed clock moving while the dialog stays in processing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T20:00:00.000Z"));

    render(
      <FormSubmitConfirmDialog
        open
        phase="processing"
        progress={{
          phase: "processing",
          currentStageId: "esperando_respuesta",
          startedAt: new Date("2026-04-15T20:00:00.000Z").getTime(),
          displayMessage: null,
          errorMessage: null,
          retryAction: "submit",
        }}
        description="Confirma el envÃ­o del acta."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByTestId("long-form-finalization-elapsed").textContent).toBe(
      "00:00"
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByTestId("long-form-finalization-elapsed").textContent).toBe(
      "00:05"
    );
  });
});
