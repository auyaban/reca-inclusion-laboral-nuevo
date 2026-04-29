// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EmpresasListView from "@/components/empresas/EmpresasListView";

describe("EmpresasListView", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the empresas table with search and create action", () => {
    render(
      <EmpresasListView
        result={{
          items: [
            {
              id: "empresa-1",
              nombre_empresa: "ACME SAS",
              nit_empresa: "900123",
              ciudad_empresa: "Bogota",
              sede_empresa: "Principal",
              gestion: "RECA",
              profesional_asignado: "Sara Zambrano",
              asesor: "Carlos Ruiz",
              caja_compensacion: "Compensar",
              zona_empresa: "Centro",
              estado: "Activa",
              updated_at: "2026-04-28T15:00:00.000Z",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        }}
        params={{ q: "", estado: "", gestion: "", caja: "", zona: "", asesor: "" }}
        catalogFilters={{ estados: ["Activa"], gestores: ["RECA"], cajas: ["Compensar"], zonas: ["Centro"], asesores: ["Carlos Ruiz"] }}
      />
    );

    expect(screen.getByRole("link", { name: /Nueva empresa/i }).getAttribute("href")).toBe(
      "/hub/empresas/admin/empresas/nueva"
    );
    expect(screen.getByPlaceholderText(/Buscar por nombre/i)).toBeTruthy();
    expect(screen.getByText("ACME SAS")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Abrir ACME SAS/i }).getAttribute("href")).toBe(
      "/hub/empresas/admin/empresas/empresa-1"
    );
  });
});
