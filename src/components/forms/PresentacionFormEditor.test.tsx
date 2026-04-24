// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePresentacionFormStateMock } = vi.hoisted(() => ({
  usePresentacionFormStateMock: vi.fn(),
}));

vi.mock("@/hooks/usePresentacionFormState", () => ({
  usePresentacionFormState: usePresentacionFormStateMock,
}));

vi.mock("@/components/forms/presentacion/PresentacionFormPresenter", () => ({
  PresentacionFormPresenter: (props: {
    shell?: { loadingOverlay?: unknown };
  }) => (
    <div data-testid="editor-root">
      Presentacion presenter
      <span>{props.shell?.loadingOverlay ? "overlay:on" : "overlay:off"}</span>
    </div>
  ),
}));

import PresentacionFormEditor from "@/components/forms/PresentacionFormEditor";

describe("PresentacionFormEditor", () => {
  beforeEach(() => {
    usePresentacionFormStateMock.mockReset();
  });

  it("keeps the editor root mounted across hydration-style rerenders", () => {
    const editingWithOverlay = {
      mode: "editing",
      presenterProps: {
        shell: {
          title: "Presentacion",
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

    usePresentacionFormStateMock
      .mockReturnValueOnce(editingWithOverlay)
      .mockReturnValueOnce(editingWithOverlay)
      .mockReturnValueOnce(editingWithoutOverlay);

    const { rerender } = render(<PresentacionFormEditor />);
    const firstRoot = screen.getByTestId("editor-root");

    expect(screen.getByText("overlay:on")).not.toBeNull();
    expect(screen.queryByTestId("long-form-loading-state")).toBeNull();

    rerender(<PresentacionFormEditor />);
    expect(screen.getByTestId("editor-root")).toBe(firstRoot);
    expect(screen.queryByTestId("long-form-loading-state")).toBeNull();

    rerender(<PresentacionFormEditor />);
    expect(screen.getByTestId("editor-root")).toBe(firstRoot);
    expect(screen.getByText("overlay:off")).not.toBeNull();
    expect(screen.queryByTestId("long-form-loading-state")).toBeNull();
  });
});
