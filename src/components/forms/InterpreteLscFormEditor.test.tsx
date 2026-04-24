// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useInterpreteLscFormStateMock } = vi.hoisted(() => ({
  useInterpreteLscFormStateMock: vi.fn(),
}));

vi.mock("@/hooks/useInterpreteLscFormState", () => ({
  useInterpreteLscFormState: useInterpreteLscFormStateMock,
}));

vi.mock("@/components/forms/interpreteLsc/InterpreteLscFormPresenter", () => ({
  InterpreteLscFormPresenter: (props: {
    shell?: { loadingOverlay?: unknown };
  }) => (
    <div data-testid="editor-root">
      Interprete LSC presenter
      <span>{props.shell?.loadingOverlay ? "overlay:on" : "overlay:off"}</span>
    </div>
  ),
}));

import InterpreteLscFormEditor from "@/components/forms/InterpreteLscFormEditor";

describe("InterpreteLscFormEditor", () => {
  beforeEach(() => {
    useInterpreteLscFormStateMock.mockReset();
  });

  it("keeps the editor root mounted across hydration-style rerenders", () => {
    const editingWithOverlay = {
      mode: "editing",
      presenterProps: {
        shell: {
          title: "Interprete LSC",
          onBack: vi.fn(),
          navItems: [],
          activeSectionId: "company",
          onSectionSelect: vi.fn(),
          loadingOverlay: <div>Recuperando acta</div>,
        },
      },
    } as const;

    const editingWithoutOverlay = {
      ...editingWithOverlay,
      presenterProps: {
        ...editingWithOverlay.presenterProps,
        shell: {
          ...editingWithOverlay.presenterProps.shell,
          loadingOverlay: null,
        },
      },
    } as const;

    useInterpreteLscFormStateMock
      .mockReturnValueOnce(editingWithOverlay)
      .mockReturnValueOnce(editingWithOverlay)
      .mockReturnValueOnce(editingWithoutOverlay);

    const { rerender } = render(<InterpreteLscFormEditor />);
    const firstRoot = screen.getByTestId("editor-root");

    expect(screen.getByText("overlay:on")).not.toBeNull();
    expect(screen.queryByTestId("long-form-loading-state")).toBeNull();

    rerender(<InterpreteLscFormEditor />);
    expect(screen.getByTestId("editor-root")).toBe(firstRoot);
    expect(screen.queryByTestId("long-form-loading-state")).toBeNull();

    rerender(<InterpreteLscFormEditor />);
    expect(screen.getByTestId("editor-root")).toBe(firstRoot);
    expect(screen.getByText("overlay:off")).not.toBeNull();
    expect(screen.queryByTestId("long-form-loading-state")).toBeNull();
  });
});
