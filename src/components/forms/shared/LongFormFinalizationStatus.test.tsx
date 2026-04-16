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
          currentStageId: "esperando_respuesta",
          startedAt: new Date("2026-04-15T20:00:00.000Z").getTime(),
          errorMessage: null,
        }}
      />
    );

    expect(html).toContain("Publicando acta");
    expect(html).toContain("Esperando respuesta");
    expect(html).toContain("00:30");

    vi.useRealTimers();
  });

  it("renders the inline error state without hiding the backend message", () => {
    const html = renderToStaticMarkup(
      <LongFormFinalizationStatus
        progress={{
          phase: "error",
          currentStageId: "esperando_respuesta",
          startedAt: Date.now(),
          errorMessage: "No se pudo publicar el acta de prueba.",
        }}
      />
    );

    expect(html).toContain("La publicación no se completó");
    expect(html).toContain("El formulario sigue disponible");
    expect(html).toContain("No se pudo publicar el acta de prueba.");
  });
});
