// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EmpresasPage from "@/app/hub/empresas/page";
import { redirect } from "next/navigation";

const mocks = vi.hoisted(() => ({
  getCurrentUserContext: vi.fn(),
  countMisEmpresasNuevas: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));

vi.mock("@/lib/auth/roles", () => ({
  getCurrentUserContext: mocks.getCurrentUserContext,
}));

vi.mock("@/lib/empresas/lifecycle-queries", () => ({
  countMisEmpresasNuevas: mocks.countMisEmpresasNuevas,
}));

vi.mock("@/components/empresas/EmpresasModuleHome", () => ({
  default: ({
    isAdmin,
    newCount,
  }: {
    isAdmin: boolean;
    newCount: number;
  }) => (
    <section data-testid="empresas-module">
      {isAdmin ? "admin" : `profesional:${newCount}`}
    </section>
  ),
}));

const baseProfile = {
  id: 7,
  authUserId: "auth-user-1",
  displayName: "Sara Zambrano",
  usuarioLogin: "sara",
  email: "sara@reca.test",
  authPasswordTemp: false,
};

describe("EmpresasPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("redirects authenticated users without empresas roles back to the hub", async () => {
    mocks.getCurrentUserContext.mockResolvedValue({
      ok: true,
      user: { id: "auth-user-1", email: "sara@reca.test" },
      profile: baseProfile,
      roles: [],
    });

    await expect(EmpresasPage()).rejects.toThrow("NEXT_REDIRECT:/hub");
    expect(redirect).toHaveBeenCalledWith("/hub");
  });

  it("renders the backoffice module for inclusion empresas admins", async () => {
    mocks.getCurrentUserContext.mockResolvedValue({
      ok: true,
      user: { id: "auth-user-1", email: "admin@reca.test" },
      profile: baseProfile,
      roles: ["inclusion_empresas_admin"],
    });

    render(await EmpresasPage());

    expect(screen.getByTestId("empresas-module").textContent).toBe("admin");
    expect(mocks.countMisEmpresasNuevas).not.toHaveBeenCalled();
  });

  it("renders the professional home with the new assignment count", async () => {
    mocks.getCurrentUserContext.mockResolvedValue({
      ok: true,
      user: { id: "auth-user-1", email: "sara@reca.test" },
      profile: baseProfile,
      roles: ["inclusion_empresas_profesional"],
    });
    mocks.countMisEmpresasNuevas.mockResolvedValue(3);

    render(await EmpresasPage());

    expect(screen.getByTestId("empresas-module").textContent).toBe(
      "profesional:3"
    );
    expect(mocks.countMisEmpresasNuevas).toHaveBeenCalledWith({
      userId: "auth-user-1",
      profesionalId: 7,
      nombre: "Sara Zambrano",
    });
  });
});
