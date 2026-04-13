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
});
