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

const resultWithItem = {
  items: [
    {
      id: 1,
      nombre_profesional: "Sara Zambrano",
      correo_profesional: "sara.zambrano@recacolombia.org",
      programa: "Inclusión Laboral",
      antiguedad: 2,
      usuario_login: "sarzam",
      auth_user_id: "auth-user-1",
      auth_password_temp: false,
      deleted_at: null,
      roles: ["inclusion_empresas_profesional" as const],
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
  totalPages: 1,
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
        params={{
          q: "",
          estado: "activos",
          sort: "nombre_profesional",
          direction: "asc",
        }}
      />
    );

    expect(screen.getByTestId("backoffice-page-header")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Nuevo profesional/i }).getAttribute("href")
    ).toBe("/hub/empresas/admin/profesionales/nuevo");
  });

  it("applies the estado filter immediately and resets to the first page", async () => {
    render(
      <ProfesionalesListView
        result={{ ...emptyResult, page: 3 }}
        params={{
          q: "sara",
          estado: "activos",
          sort: "correo_profesional",
          direction: "desc",
        }}
      />
    );

    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "eliminados" },
    });

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith(
        "?q=sara&estado=eliminados&sort=correo_profesional&direction=desc&page=1&pageSize=50"
      );
    });
  });

  it("disables browser autocomplete on the search input", () => {
    render(
      <ProfesionalesListView
        result={emptyResult}
        params={{
          q: "",
          estado: "activos",
          sort: "nombre_profesional",
          direction: "asc",
        }}
      />
    );

    expect(
      screen
        .getByPlaceholderText("Nombre, correo, usuario o programa")
        .getAttribute("autocomplete")
    ).toBe("off");
  });

  it("renders sortable headers that toggle direction and reset pagination", () => {
    render(
      <ProfesionalesListView
        result={{ ...resultWithItem, page: 2 }}
        params={{
          q: "sara",
          estado: "todos",
          sort: "nombre_profesional",
          direction: "asc",
        }}
      />
    );

    expect(
      screen.getByRole("link", { name: /Nombre orden ascendente/i }).getAttribute("href")
    ).toBe(
      "?q=sara&estado=todos&sort=nombre_profesional&direction=desc&page=1&pageSize=50"
    );

    expect(
      screen.getByRole("link", { name: /Correo ordenar/i }).getAttribute("href")
    ).toBe(
      "?q=sara&estado=todos&sort=correo_profesional&direction=asc&page=1&pageSize=50"
    );
  });
});
