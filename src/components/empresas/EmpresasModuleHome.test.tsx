// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EmpresasModuleHome from "@/components/empresas/EmpresasModuleHome";

describe("EmpresasModuleHome", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the admin backoffice sections with only Empresas enabled", () => {
    render(<EmpresasModuleHome isAdmin />);

    expect(screen.getByRole("link", { name: /Empresas/i }).getAttribute("href")).toBe(
      "/hub/empresas/admin/empresas"
    );
    expect(screen.getByText("Profesionales")).toBeTruthy();
    expect(screen.getByText("Asesores")).toBeTruthy();
    expect(screen.getByText("Gestores")).toBeTruthy();
    expect(screen.getByText("Interpretes")).toBeTruthy();
    expect(screen.getAllByText("Próximamente")).toHaveLength(4);
  });

  it("does not expose the admin backoffice for non-admin users", () => {
    render(<EmpresasModuleHome isAdmin={false} />);

    expect(screen.queryByRole("link", { name: /Empresas/i })).toBeNull();
    expect(screen.getByText(/Módulo operativo en preparación/i)).toBeTruthy();
  });
});
