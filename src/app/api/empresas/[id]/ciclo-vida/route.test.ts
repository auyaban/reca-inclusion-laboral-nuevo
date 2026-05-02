import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmpresaServerError } from "@/lib/empresas/server";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  getEmpresaLifecycleTree: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/empresas/lifecycle-tree-server", () => ({
  getEmpresaLifecycleTree: mocks.getEmpresaLifecycleTree,
}));

import { GET } from "@/app/api/empresas/[id]/ciclo-vida/route";

const profesionalAuth = {
  ok: true,
  context: {
    user: { id: "auth-user-1", email: "sara@reca.test" },
    profile: {
      id: 7,
      authUserId: "auth-user-1",
      displayName: "Sara Zambrano",
      usuarioLogin: "sara",
      email: "sara@reca.test",
      authPasswordTemp: false,
    },
    roles: ["inclusion_empresas_profesional"],
  },
};

describe("/api/empresas/[id]/ciclo-vida", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(profesionalAuth);
    mocks.getEmpresaLifecycleTree.mockResolvedValue({
      empresa: {
        id: "empresa-1",
        nombreEmpresa: "Empresa Demo",
        nitEmpresa: "900123456-1",
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
    });
  });

  it.each([
    ["401", 401, "No autenticado."],
    ["403", 403, "No autorizado."],
  ])("returns %s before loading lifecycle data", async (_label, status, message) => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: message }, { status }),
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "empresa-1" }),
    });

    expect(response.status).toBe(status);
    expect(mocks.getEmpresaLifecycleTree).not.toHaveBeenCalled();
  });

  it("returns the lifecycle tree with private no-store headers", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "empresa-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(body.empresa).toEqual(
      expect.objectContaining({
        id: "empresa-1",
        nombreEmpresa: "Empresa Demo",
        companyType: "compensar",
      })
    );
    expect(mocks.getEmpresaLifecycleTree).toHaveBeenCalledWith({
      empresaId: "empresa-1",
    });
  });

  it("maps deleted or missing companies to 404", async () => {
    mocks.getEmpresaLifecycleTree.mockRejectedValue(
      new EmpresaServerError(404, "Empresa no encontrada.")
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "empresa-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Empresa no encontrada." });
  });
});
