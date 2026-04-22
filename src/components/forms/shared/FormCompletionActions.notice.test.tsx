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
            state: "failed",
            message:
              "No pudimos abrir el recurso. Revisa el bloqueador de popups o intenta de nuevo.",
            openedTargets: [],
            failedTargets: [{ target: "sheet", reason: "popup_blocked" }],
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
      "No pudimos abrir el recurso. Revisa el bloqueador de popups o intenta de nuevo."
    );
    expect(html).toContain("border-amber-200");
  });
});
