// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LongFormFinalizationStatus } from "@/components/forms/shared/LongFormFinalizationStatus";

describe("LongFormFinalizationStatus", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders active and completed steps while processing", () => {
    vi.useFakeTimers();
    const startedAt = new Date("2026-04-15T20:00:00.000Z").getTime();
    vi.setSystemTime(startedAt + 30_000);
    const html = renderToStaticMarkup(
      <LongFormFinalizationStatus
        progress={{
          phase: "processing",
          currentStageId: "verificando_publicacion",
          startedAt,
          displayMessage: null,
          errorMessage: null,
          retryAction: "check_status",
        }}
      />
    );

    expect(html).toContain("Publicando acta");
    expect(html).toContain("Confirmando");
    expect(html).toContain("00:30");
  });

  it("renders the inline error state without hiding the backend message", () => {
    const html = renderToStaticMarkup(
      <LongFormFinalizationStatus
        progress={{
          phase: "error",
          currentStageId: "verificando_publicacion",
          startedAt: Date.now(),
          displayMessage:
            "No pudimos confirmar la publicacion. Puede que el acta ya este guardada.",
          errorMessage: "No pudimos confirmar la publicacion.",
          retryAction: "check_status",
        }}
      />
    );

    expect(html).toContain("interrumpida");
    expect(html).toContain("No pudimos confirmar");
  });

  it("updates elapsed time while processing using its internal clock", () => {
    vi.useFakeTimers();
    const startedAt = new Date("2026-04-15T20:00:00.000Z").getTime();
    vi.setSystemTime(startedAt);

    render(
      <LongFormFinalizationStatus
        progress={{
          phase: "processing",
          currentStageId: "esperando_respuesta",
          startedAt,
          displayMessage: null,
          errorMessage: null,
          retryAction: "submit",
        }}
      />
    );

    expect(screen.getByTestId("long-form-finalization-elapsed").textContent).toBe(
      "00:00"
    );

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.getByTestId("long-form-finalization-elapsed").textContent).toBe(
      "00:03"
    );
  });

  it("freezes the elapsed time when processing ends", () => {
    vi.useFakeTimers();
    const startedAt = new Date("2026-04-15T20:00:00.000Z").getTime();
    vi.setSystemTime(startedAt);
    const { rerender } = render(
      <LongFormFinalizationStatus
        progress={{
          phase: "processing",
          currentStageId: "verificando_publicacion",
          startedAt,
          displayMessage: null,
          errorMessage: null,
          retryAction: "check_status",
        }}
      />
    );

    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(screen.getByTestId("long-form-finalization-elapsed").textContent).toBe(
      "00:04"
    );

    rerender(
      <LongFormFinalizationStatus
        progress={{
          phase: "error",
          currentStageId: "verificando_publicacion",
          startedAt,
          displayMessage: "No pudimos confirmar la publicacion.",
          errorMessage: "No pudimos confirmar la publicacion.",
          retryAction: "check_status",
        }}
      />
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.getByTestId("long-form-finalization-elapsed").textContent).toBe(
      "00:04"
    );
  });
});
