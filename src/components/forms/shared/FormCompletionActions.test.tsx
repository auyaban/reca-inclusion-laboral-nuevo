import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FormCompletionActions } from "@/components/forms/shared/FormCompletionActions";
import { openCompletionAction } from "@/components/forms/shared/formCompletionActions.runtime";

describe("FormCompletionActions", () => {
  it("renders the individual actions when both links exist", () => {
    const html = renderToStaticMarkup(
      <FormCompletionActions
        links={{
          sheetLink: "https://sheet.example/1",
          pdfLink: "https://pdf.example/1",
        }}
      />
    );

    expect(html).not.toContain("Abrir acta y luego PDF");
    expect(html).toContain("Ver acta en Google Sheets");
    expect(html).toContain("Ver PDF en Drive");
  });

  it("renders only the actions for links that are available", () => {
    const html = renderToStaticMarkup(
      <FormCompletionActions
        links={{
          pdfLink: "https://pdf.example/1",
        }}
      />
    );

    expect(html).not.toContain("Abrir acta y luego PDF");
    expect(html).not.toContain("Ver acta en Google Sheets");
    expect(html).toContain("Ver PDF en Drive");
  });
});

describe("openCompletionAction", () => {
  it("returns a completed result after opening an individual resource", () => {
    const open = vi.fn().mockReturnValue({});

    const result = openCompletionAction(
      "sheet",
      {
        sheetLink: "https://sheet.example/1",
      },
      {
        open,
        location: {
          origin: "https://reca.example",
        },
      }
    );

    expect(result).toEqual({
      state: "completed",
      message: null,
      openedTargets: ["sheet"],
      failedTargets: [],
    });
    expect(open).toHaveBeenCalledWith(
      "https://sheet.example/1",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("returns a failed result when an individual popup is blocked", () => {
    const open = vi.fn().mockReturnValue(null);

    const result = openCompletionAction(
      "pdf",
      {
        pdfLink: "https://pdf.example/solo",
      },
      {
        open,
        location: {
          origin: "https://reca.example",
        },
      }
    );

    expect(result).toEqual({
      state: "failed",
      message:
        "No pudimos abrir el recurso. Revisa el bloqueador de popups o intenta de nuevo.",
      openedTargets: [],
      failedTargets: [
        {
          target: "pdf",
          reason: "popup_blocked",
        },
      ],
    });
  });

  it("returns a failed result when an individual URL is invalid", () => {
    const open = vi.fn();

    const result = openCompletionAction(
      "sheet",
      {
        sheetLink: "javascript:alert('xss')",
      },
      {
        open,
        location: {
          origin: "https://reca.example",
        },
      }
    );

    expect(result).toEqual({
      state: "failed",
      message: "No pudimos abrir el recurso porque el enlace no es válido.",
      openedTargets: [],
      failedTargets: [
        {
          target: "sheet",
          reason: "invalid_url",
        },
      ],
    });
    expect(open).not.toHaveBeenCalled();
  });
});
