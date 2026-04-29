import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  listEmpresaPool: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/empresas/lifecycle-queries", () => ({
  listEmpresaPool: mocks.listEmpresaPool,
}));

import { GET } from "@/app/api/empresas/pool/route";

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

describe("/api/empresas/pool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(profesionalAuth);
  });

  it("lists the claim pool with assignment filters", async () => {
    mocks.listEmpresaPool.mockResolvedValue({
      items: [
        {
          id: "empresa-1",
          nombreEmpresa: "Empresa Libre",
          assignmentStatus: "libre",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });

    const response = await GET(
      new Request("http://localhost/api/empresas/pool?asignacion=libres")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0].assignmentStatus).toBe("libre");
    expect(mocks.listEmpresaPool).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: expect.objectContaining({ profesionalId: 7 }),
        params: expect.objectContaining({ asignacion: "libres" }),
      })
    );
  });

  it.each([
    ["401", 401, "No autenticado."],
    ["403", 403, "No autorizado."],
  ])(
    "returns %s without touching the pool query when authorization fails",
    async (_label, status, message) => {
      mocks.requireAppRole.mockResolvedValue({
        ok: false,
        response: Response.json({ error: message }, { status }),
      });

      const response = await GET(new Request("http://localhost/api/empresas/pool"));

      expect(response.status).toBe(status);
      expect(mocks.listEmpresaPool).not.toHaveBeenCalled();
    }
  );
});
