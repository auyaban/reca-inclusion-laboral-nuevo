// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfesionalesListView from "@/components/profesionales/ProfesionalesListView";

const { routerPush } = vi.hoisted(() => ({
  routerPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

const emptyResult = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 50,
  totalPages: 0,
};

describe("ProfesionalesListView", () => {
  afterEach(() => {
    cleanup();
    routerPush.mockClear();
  });

  it("links the new professional action to the create page", () => {
    render(
      <ProfesionalesListView
        result={emptyResult}
        params={{ q: "", estado: "activos" }}
      />
    );

    expect(
      screen.getByRole("link", { name: /Nuevo profesional/i }).getAttribute("href")
    ).toBe("/hub/empresas/admin/profesionales/nuevo");
  });

  it("applies the estado filter immediately and resets to the first page", async () => {
    render(
      <ProfesionalesListView
        result={{ ...emptyResult, page: 3 }}
        params={{ q: "sara", estado: "activos" }}
      />
    );

    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "eliminados" },
    });

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith(
        "?q=sara&estado=eliminados&page=1&pageSize=50"
      );
    });
  });

  it("disables browser autocomplete on the search input", () => {
    render(
      <ProfesionalesListView
        result={emptyResult}
        params={{ q: "", estado: "activos" }}
      />
    );

    expect(
      screen
        .getByPlaceholderText("Nombre, correo, usuario o programa")
        .getAttribute("autocomplete")
    ).toBe("off");
  });
});
