import { afterEach, describe, expect, it, vi } from "vitest";

describe("FormCompletionActions notices", () => {
  afterEach(() => {
    vi.doUnmock("react");
    vi.resetModules();
  });

  it("renders the inline message when the action result requires feedback", async () => {
    vi.resetModules();

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useState: () => [
          {
            state: "opened_but_not_closable",
            message:
              "El recurso se abrió, pero esta pestaña no se pudo cerrar automáticamente. Puedes cerrarla manualmente.",
            openedTargets: ["sheet"],
            failedTargets: [],
          },
          vi.fn(),
        ],
      };
    });

    const { renderToStaticMarkup } = await import("react-dom/server");
    const { FormCompletionActions } = await import(
      "@/components/forms/shared/FormCompletionActions"
    );

    const html = renderToStaticMarkup(
      <FormCompletionActions
        links={{
          sheetLink: "https://sheet.example/1",
        }}
      />
    );

    expect(html).toContain(
      "El recurso se abrió, pero esta pestaña no se pudo cerrar automáticamente. Puedes cerrarla manualmente."
    );
    expect(html).toContain("border-blue-200");
  });

  it("highlights the PDF action when the flow requires a guided follow-up", async () => {
    vi.resetModules();

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react");

      return {
        ...actual,
        useState: () => [
          {
            state: "guided_followup",
            message: 'Abrimos el acta. Usa "Ver PDF en Drive" para abrir el PDF.',
            openedTargets: ["sheet"],
            failedTargets: [],
          },
          vi.fn(),
        ],
      };
    });

    const { renderToStaticMarkup } = await import("react-dom/server");
    const { FormCompletionActions } = await import(
      "@/components/forms/shared/FormCompletionActions"
    );

    const html = renderToStaticMarkup(
      <FormCompletionActions
        links={{
          sheetLink: "https://sheet.example/1",
          pdfLink: "https://pdf.example/1",
        }}
      />
    );

    expect(html).toContain(
      'Abrimos el acta. Usa &quot;Ver PDF en Drive&quot; para abrir el PDF.'
    );
    expect(html).toContain("ring-2");
  });
});
