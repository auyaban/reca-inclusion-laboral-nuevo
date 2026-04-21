// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormCompletionActions } from "@/components/forms/shared/FormCompletionActions";

const { openCompletionActionMock } = vi.hoisted(() => ({
  openCompletionActionMock: vi.fn(),
}));

vi.mock("@/components/forms/shared/formCompletionActions.runtime", () => ({
  openCompletionAction: openCompletionActionMock,
}));

describe("FormCompletionActions behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears an old warning once a subsequent open succeeds", () => {
    openCompletionActionMock
      .mockReturnValueOnce({
        state: "failed",
        message:
          "No pudimos abrir el recurso. Revisa el bloqueador de popups o intenta de nuevo.",
        openedTargets: [],
        failedTargets: [{ target: "sheet", reason: "popup_blocked" }],
      })
      .mockReturnValueOnce({
        state: "completed",
        message: null,
        openedTargets: ["sheet"],
        failedTargets: [],
      });

    render(
      <FormCompletionActions
        links={{
          sheetLink: "https://sheet.example/1",
          pdfLink: "https://pdf.example/1",
        }}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ver acta en Google Sheets" })
    );
    expect(
      screen.getByText(
        "No pudimos abrir el recurso. Revisa el bloqueador de popups o intenta de nuevo."
      )
    ).not.toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Ver acta en Google Sheets" })
    );
    expect(
      screen.queryByText(
        "No pudimos abrir el recurso. Revisa el bloqueador de popups o intenta de nuevo."
      )
    ).toBeNull();
  });
});
