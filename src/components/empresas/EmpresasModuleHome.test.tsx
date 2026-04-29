// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EmpresasModuleHome from "@/components/empresas/EmpresasModuleHome";

describe("EmpresasModuleHome", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the admin backoffice sections with Empresas and Profesionales enabled", () => {
    render(<EmpresasModuleHome isAdmin />);

    expect(screen.getByTestId("backoffice-page-header")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Empresas/i }).getAttribute("href")).toBe(
      "/hub/empresas/admin/empresas"
    );
    expect(
      screen.getByRole("link", { name: /Profesionales/i }).getAttribute("href")
    ).toBe("/hub/empresas/admin/profesionales");
    expect(screen.getByText("Asesores")).toBeTruthy();
    expect(screen.getByText("Gestores")).toBeTruthy();
    expect(screen.getByText("Intérpretes")).toBeTruthy();
    expect(screen.getAllByText("Próximamente")).toHaveLength(3);
  });

  it("does not expose the admin backoffice for non-admin users", () => {
    render(<EmpresasModuleHome isAdmin={false} />);

    expect(screen.queryByRole("link", { name: /Empresas/i })).toBeNull();
    expect(screen.getByText(/Módulo operativo en preparación/i)).toBeTruthy();
  });
});
