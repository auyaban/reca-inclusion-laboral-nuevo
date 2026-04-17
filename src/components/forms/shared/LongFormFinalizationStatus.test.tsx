import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LongFormFinalizationStatus } from "@/components/forms/shared/LongFormFinalizationStatus";

describe("LongFormFinalizationStatus", () => {
  it("renders active and completed steps while processing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T20:00:30.000Z"));

    const html = renderToStaticMarkup(
      <LongFormFinalizationStatus
        progress={{
          phase: "processing",
          currentStageId: "verificando_publicacion",
          startedAt: new Date("2026-04-15T20:00:00.000Z").getTime(),
          displayMessage: null,
          errorMessage: null,
          retryAction: "check_status",
        }}
      />
    );

    expect(html).toContain("Publicando acta");
    expect(html).toContain("Confirmando publicación");
    expect(html).toContain("00:30");

    vi.useRealTimers();
  });

  it("renders the inline error state without hiding the backend message", () => {
    const html = renderToStaticMarkup(
      <LongFormFinalizationStatus
        progress={{
          phase: "error",
          currentStageId: "verificando_publicacion",
          startedAt: Date.now(),
          displayMessage:
            "No pudimos confirmar la publicación. Puede que el acta ya esté guardada.",
          errorMessage: "No pudimos confirmar la publicación.",
          retryAction: "check_status",
        }}
      />
    );

    expect(html).toContain("Publicación interrumpida");
    expect(html).toContain(
      "No pudimos confirmar la publicación. Puede que el acta ya esté guardada."
    );
    expect(html).toContain("No pudimos confirmar la publicación.");
  });
});
