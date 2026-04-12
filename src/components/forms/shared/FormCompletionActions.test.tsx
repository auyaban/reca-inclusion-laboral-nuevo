import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FormCompletionActions } from "@/components/forms/shared/FormCompletionActions";
import { openCompletionAction } from "@/components/forms/shared/formCompletionActions.runtime";

describe("FormCompletionActions", () => {
  it("renders all available actions when both links exist", () => {
    const html = renderToStaticMarkup(
      <FormCompletionActions
        links={{
          sheetLink: "https://sheet.example/1",
          pdfLink: "https://pdf.example/1",
        }}
      />
    );

    expect(html).toContain("Abrir acta y PDF");
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

    expect(html).not.toContain("Abrir acta y PDF");
    expect(html).not.toContain("Ver acta en Google Sheets");
    expect(html).toContain("Ver PDF en Drive");
  });

  it("opens the sheet in a new tab and keeps the PDF in the current tab", () => {
    const open = vi.fn().mockReturnValue({});
    const replace = vi.fn();
    const assign = vi.fn();

    const result = openCompletionAction(
      "both",
      {
        sheetLink: "https://sheet.example/1",
        pdfLink: "https://pdf.example/1",
      },
      {
        open,
        close: vi.fn(),
        setTimeout: vi.fn() as Window["setTimeout"],
        opener: null,
        location: {
          origin: "https://reca.example",
          assign: assign as Location["assign"],
          replace: replace as Location["replace"],
        },
      }
    );

    expect(result).toEqual({ error: null });
    expect(open).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(
      "https://sheet.example/1",
      "_blank",
      "noopener,noreferrer"
    );
    expect(replace).toHaveBeenCalledWith("https://pdf.example/1");
    expect(assign).not.toHaveBeenCalled();
  });

  it("falls back to same-tab navigation for individual actions when the popup is blocked", () => {
    const open = vi.fn().mockReturnValue(null);
    const close = vi.fn();
    const assign = vi.fn();
    const replace = vi.fn();

    const result = openCompletionAction(
      "pdf",
      {
        pdfLink: "https://pdf.example/solo",
      },
      {
        open,
        close,
        setTimeout: vi.fn() as Window["setTimeout"],
        opener: null,
        location: {
          origin: "https://reca.example",
          assign: assign as Location["assign"],
          replace: replace as Location["replace"],
        },
      }
    );

    expect(result).toEqual({ error: null });
    expect(open).toHaveBeenCalledWith(
      "https://pdf.example/solo",
      "_blank",
      "noopener,noreferrer"
    );
    expect(assign).toHaveBeenCalledWith("https://pdf.example/solo");
    expect(replace).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it("returns an inline warning when the combined action is blocked by the browser", () => {
    const open = vi.fn().mockReturnValue(null);

    const result = openCompletionAction(
      "both",
      {
        sheetLink: "https://sheet.example/1",
        pdfLink: "https://pdf.example/1",
      },
      {
        open,
        close: vi.fn(),
        setTimeout: vi.fn() as Window["setTimeout"],
        opener: null,
        location: {
          origin: "https://reca.example",
          assign: vi.fn() as Location["assign"],
          replace: vi.fn() as Location["replace"],
        },
      }
    );

    expect(result.error).toContain("Permite popups");
  });
});
