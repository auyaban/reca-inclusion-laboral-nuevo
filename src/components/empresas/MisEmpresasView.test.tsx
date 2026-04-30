// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MisEmpresasView from "@/components/empresas/MisEmpresasView";

const params = {
  q: "",
  estado: "",
  nuevas: false,
  page: 1,
  pageSize: 25,
  sort: "ultimoFormato" as const,
  direction: "desc" as const,
};

describe("MisEmpresasView", () => {
  it("renders the new-company alert, lightweight table and detail links in a new tab", () => {
    render(
      <MisEmpresasView
        params={params}
        result={{
          items: [
            {
              id: "empresa-1",
              nombreEmpresa: "Empresa Propia",
              nitEmpresa: "9001",
              estado: "Activa",
              updatedAt: "2026-04-29T10:00:00.000Z",
              profesionalAsignadoId: 7,
              profesionalAsignado: "Sara Zambrano",
              assignmentStatus: "tuya",
              ultimoFormatoAt: "2026-04-29T12:00:00.000Z",
              ultimoFormatoNombre: "Presentación",
              esNueva: true,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 25,
          totalPages: 1,
          newCount: 2,
        }}
      />
    );

    expect(
      screen
        .getByRole("link", { name: /2 empresas nuevas/i })
        .getAttribute("href")
    ).toEqual(expect.stringContaining("nuevas=true"));
    expect(screen.getByRole("columnheader", { name: /Último formato/i })).toBeTruthy();
    expect(screen.getByText("Presentación")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Abrir Empresa Propia/i }).getAttribute("target")
    ).toBe("_blank");
  });
});
