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
});

describe("openCompletionAction", () => {
  it("closes the current tab after opening an individual resource when the tab is closable", () => {
    const open = vi.fn().mockReturnValue({});
    const close = vi.fn();
    const setTimeout = vi.fn() as Window["setTimeout"];
    const focus = vi.fn();

    const result = openCompletionAction(
      "sheet",
      {
        sheetLink: "https://sheet.example/1",
      },
      {
        open,
        close,
        setTimeout,
        opener: {
          closed: false,
          focus,
          location: { href: "https://reca.example/hub" },
        },
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
    expect(setTimeout).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });

  it("shows an informational message when an individual resource opens but the tab cannot be closed", () => {
    const open = vi.fn().mockReturnValue({});

    const result = openCompletionAction(
      "pdf",
      {
        pdfLink: "https://pdf.example/solo",
      },
      {
        open,
        close: vi.fn(),
        setTimeout: vi.fn() as Window["setTimeout"],
        opener: null,
        location: {
          origin: "https://reca.example",
        },
      }
    );

    expect(result).toEqual({
      state: "opened_but_not_closable",
      message:
        "El recurso se abrió, pero esta pestaña no se pudo cerrar automáticamente. Puedes cerrarla manualmente.",
      openedTargets: ["pdf"],
      failedTargets: [],
    });
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
        close: vi.fn(),
        setTimeout: vi.fn() as Window["setTimeout"],
        opener: null,
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
        close: vi.fn(),
        setTimeout: vi.fn() as Window["setTimeout"],
        opener: null,
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

  it("closes the current tab only when both resources open successfully", () => {
    const open = vi.fn().mockReturnValue({});
    const setTimeout = vi.fn() as Window["setTimeout"];

    const result = openCompletionAction(
      "both",
      {
        sheetLink: "https://sheet.example/1",
        pdfLink: "https://pdf.example/1",
      },
      {
        open,
        close: vi.fn(),
        setTimeout,
        opener: {
          closed: false,
          focus: vi.fn(),
          location: { href: "https://reca.example/hub" },
        },
        location: {
          origin: "https://reca.example",
        },
      }
    );

    expect(result).toEqual({
      state: "completed",
      message: null,
      openedTargets: ["sheet", "pdf"],
      failedTargets: [],
    });
    expect(open).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledOnce();
  });

  it("returns a partial result when the first resource opens and the second popup is blocked", () => {
    const open = vi
      .fn()
      .mockReturnValueOnce({})
      .mockReturnValueOnce(null);

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
        opener: {
          closed: false,
          focus: vi.fn(),
          location: { href: "https://reca.example/hub" },
        },
        location: {
          origin: "https://reca.example",
        },
      }
    );

    expect(result).toEqual({
      state: "partial",
      message:
        "Abrimos el acta, pero no pudimos abrir el PDF. Revisa el bloqueador de popups o intenta de nuevo.",
      openedTargets: ["sheet"],
      failedTargets: [
        {
          target: "pdf",
          reason: "popup_blocked",
        },
      ],
    });
  });

  it("returns a partial result when one combined URL is invalid", () => {
    const open = vi.fn().mockReturnValue({});

    const result = openCompletionAction(
      "both",
      {
        sheetLink: "https://sheet.example/1",
        pdfLink: "javascript:alert('xss')",
      },
      {
        open,
        close: vi.fn(),
        setTimeout: vi.fn() as Window["setTimeout"],
        opener: {
          closed: false,
          focus: vi.fn(),
          location: { href: "https://reca.example/hub" },
        },
        location: {
          origin: "https://reca.example",
        },
      }
    );

    expect(result).toEqual({
      state: "partial",
      message:
        "Abrimos el acta, pero no pudimos abrir el PDF porque el enlace no es válido.",
      openedTargets: ["sheet"],
      failedTargets: [
        {
          target: "pdf",
          reason: "invalid_url",
        },
      ],
    });
  });
});
