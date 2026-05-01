// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EmpresaLifecyclePage from "@/app/hub/empresas/[id]/ciclo-vida/page";
import { notFound, redirect } from "next/navigation";
import { EmpresaServerError } from "@/lib/empresas/server";

const mocks = vi.hoisted(() => ({
  getCurrentUserContext: vi.fn(),
  getEmpresaLifecycleTree: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));

vi.mock("@/lib/auth/roles", () => ({
  getCurrentUserContext: mocks.getCurrentUserContext,
}));

vi.mock("@/lib/empresas/lifecycle-tree-server", () => ({
  getEmpresaLifecycleTree: mocks.getEmpresaLifecycleTree,
}));

vi.mock("@/components/empresas/EmpresaLifecycleTreeView", () => ({
  default: ({ tree }: { tree: { empresa: { nombreEmpresa: string | null } } }) => (
    <section data-testid="lifecycle-tree-view">
      {tree.empresa.nombreEmpresa}
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

const tree = {
  empresa: {
    id: "empresa-1",
    nombreEmpresa: "Empresa Propia",
    nitEmpresa: "9001",
    cajaCompensacion: "Compensar",
    companyType: "compensar",
  },
  summary: {
    companyStages: 1,
    profiles: 0,
    people: 0,
    archivedBranches: 0,
    unclassifiedEvidence: 0,
    dataQualityWarnings: 0,
  },
  companyStages: [],
  profileBranches: [],
  peopleWithoutProfile: [],
  archivedBranches: [],
  unclassifiedEvidence: [],
  dataQualityWarnings: [],
  generatedAt: "2026-04-30T12:00:00.000Z",
};

describe("EmpresaLifecyclePage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("redirects users without an operational empresas role", async () => {
    mocks.getCurrentUserContext.mockResolvedValue({
      ok: true,
      user: { id: "auth-user-1", email: "sara@reca.test" },
      profile: baseProfile,
      roles: [],
    });

    await expect(
      EmpresaLifecyclePage({ params: Promise.resolve({ id: "empresa-1" }) })
    ).rejects.toThrow("NEXT_REDIRECT:/hub");

    expect(redirect).toHaveBeenCalledWith("/hub");
    expect(mocks.getEmpresaLifecycleTree).not.toHaveBeenCalled();
  });

  it("redirects temporary-password users before loading lifecycle data", async () => {
    mocks.getCurrentUserContext.mockResolvedValue({
      ok: true,
      user: { id: "auth-user-1", email: "sara@reca.test" },
      profile: { ...baseProfile, authPasswordTemp: true },
      roles: ["inclusion_empresas_profesional"],
    });

    await expect(
      EmpresaLifecyclePage({ params: Promise.resolve({ id: "empresa-1" }) })
    ).rejects.toThrow("NEXT_REDIRECT:/auth/cambiar-contrasena-temporal");

    expect(redirect).toHaveBeenCalledWith("/auth/cambiar-contrasena-temporal");
    expect(mocks.getEmpresaLifecycleTree).not.toHaveBeenCalled();
  });

  it("loads the lifecycle tree server-side for operational users", async () => {
    mocks.getCurrentUserContext.mockResolvedValue({
      ok: true,
      user: { id: "auth-user-1", email: "sara@reca.test" },
      profile: baseProfile,
      roles: ["inclusion_empresas_profesional"],
    });
    mocks.getEmpresaLifecycleTree.mockResolvedValue(tree);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(
      await EmpresaLifecyclePage({
        params: Promise.resolve({ id: "empresa-1" }),
      })
    );

    expect(mocks.getEmpresaLifecycleTree).toHaveBeenCalledWith({
      empresaId: "empresa-1",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("lifecycle-tree-view").textContent).toBe(
      "Empresa Propia"
    );
    expect(screen.getByRole("heading", { name: "Empresa Propia" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver al detalle" }).getAttribute("href")).toBe(
      "/hub/empresas/empresa-1"
    );
    fetchSpy.mockRestore();
  });

  it("returns not found when the lifecycle tree cannot load an active empresa", async () => {
    mocks.getCurrentUserContext.mockResolvedValue({
      ok: true,
      user: { id: "auth-user-1", email: "sara@reca.test" },
      profile: baseProfile,
      roles: ["inclusion_empresas_profesional"],
    });
    mocks.getEmpresaLifecycleTree.mockRejectedValue(
      new EmpresaServerError(404, "Empresa no encontrada.")
    );

    await expect(
      EmpresaLifecyclePage({ params: Promise.resolve({ id: "empresa-404" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });
});
