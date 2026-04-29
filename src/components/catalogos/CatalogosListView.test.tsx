// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CatalogosListView from "@/components/catalogos/CatalogosListView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("CatalogosListView", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders asesores columns, sorting links and create action", () => {
    render(
      <CatalogosListView
        kind="asesores"
        result={{
          items: [
            {
              id: "1",
              nombre: "Carlos Ruiz",
              email: "carlos@test.com",
              telefono: "3001234567",
              sede: "Centro",
              localidad: "Suba",
              gestor: "Laura Mora",
              deleted_at: null,
            },
          ],
          total: 1,
          page: 2,
          pageSize: 50,
          totalPages: 2,
        }}
        params={{
          q: "carlos",
          estado: "activos",
          sort: "nombre",
          direction: "asc",
          page: 2,
          pageSize: 50,
        }}
      />
    );

    expect(screen.getByText("Asesores")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Nuevo asesor/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Nombre/i }).getAttribute("href")).toContain(
      "direction=desc"
    );
    expect(screen.getByText("Carlos Ruiz")).toBeTruthy();
    expect(screen.getByText("Suba")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));
    expect(screen.getByDisplayValue("Carlos Ruiz")).toBeTruthy();
    expect(screen.getByDisplayValue("Centro")).toBeTruthy();
  });

  it("shows deleted badge and restore action for eliminated records", () => {
    render(
      <CatalogosListView
        kind="interpretes"
        result={{
          items: [
            {
              id: "1",
              nombre: "Laura Pérez",
              nombre_key: "laura pérez",
              deleted_at: "2026-04-29T12:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        }}
        params={{
          q: "",
          estado: "eliminados",
          sort: "nombre",
          direction: "asc",
          page: 1,
          pageSize: 50,
        }}
      />
    );

    expect(screen.getByText("Eliminado")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Restaurar/i })).toBeTruthy();
  });
});
