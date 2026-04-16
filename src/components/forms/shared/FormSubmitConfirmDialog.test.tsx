import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FormSubmitConfirmDialog } from "@/components/forms/shared/FormSubmitConfirmDialog";

describe("FormSubmitConfirmDialog", () => {
  it("renders the confirmation state with primary actions", () => {
    const html = renderToStaticMarkup(
      <FormSubmitConfirmDialog
        open
        description="Confirma el envio del acta."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(html).toContain("Confirmar envío");
    expect(html).toContain("Confirma el envio del acta.");
    expect(html).toContain("Confirmar envío");
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
          errorMessage: null,
        }}
        description="Confirma el envio del acta."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(html).toContain("Publicando acta");
    expect(html).toContain("Esperando respuesta");
    expect(html).toContain("01:10");

    vi.useRealTimers();
  });
});
