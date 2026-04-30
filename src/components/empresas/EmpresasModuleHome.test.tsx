// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EmpresasModuleHome from "@/components/empresas/EmpresasModuleHome";

describe("EmpresasModuleHome", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the admin backoffice sections with all E2C modules enabled", () => {
    render(<EmpresasModuleHome isAdmin newCount={0} />);

    expect(screen.getByTestId("backoffice-page-header")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Empresas/i }).getAttribute("href")).toBe(
      "/hub/empresas/admin/empresas"
    );
    expect(
      screen.getByRole("link", { name: /Profesionales/i }).getAttribute("href")
    ).toBe("/hub/empresas/admin/profesionales");
    expect(screen.getByRole("link", { name: /Asesores/i }).getAttribute("href")).toBe(
      "/hub/empresas/admin/asesores"
    );
    expect(screen.getByRole("link", { name: /Gestores/i }).getAttribute("href")).toBe(
      "/hub/empresas/admin/gestores"
    );
    expect(
      screen.getByRole("link", { name: /Intérpretes/i }).getAttribute("href")
    ).toBe("/hub/empresas/admin/interpretes");
    expect(screen.queryByText("Próximamente")).toBeNull();
  });

  it("shows the professional operational home for non-admin professionals", () => {
    render(<EmpresasModuleHome isAdmin={false} newCount={2} />);

    expect(screen.queryByRole("link", { name: /^Empresas$/i })).toBeNull();
    expect(
      screen.getByRole("link", { name: /Mis empresas/i }).getAttribute("href")
    ).toBe("/hub/empresas/mis");
    expect(screen.getByText(/2 empresas nuevas/i)).toBeTruthy();
    expect(screen.getByText(/Calendario/i)).toBeTruthy();
  });
});
