import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  listMisEmpresas: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/empresas/lifecycle-queries", () => ({
  listMisEmpresas: mocks.listMisEmpresas,
}));

import { GET } from "@/app/api/empresas/mias/route";

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

describe("/api/empresas/mias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(profesionalAuth);
  });

  it.each([
    ["401", 401, "No autenticado."],
    ["403", 403, "No autorizado."],
  ])(
    "returns %s authorization responses without listing empresas",
    async (_label, status, message) => {
      mocks.requireAppRole.mockResolvedValue({
        ok: false,
        response: Response.json({ error: message }, { status }),
      });

      const response = await GET(new Request("http://localhost/api/empresas/mias"));

      expect(response.status).toBe(status);
      expect(mocks.listMisEmpresas).not.toHaveBeenCalled();
    }
  );

  it("lists current professional empresas with parsed params", async () => {
    mocks.listMisEmpresas.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 0,
    });

    const response = await GET(
      new Request("http://localhost/api/empresas/mias?q=acme&pageSize=500")
    );

    expect(response.status).toBe(200);
    expect(mocks.requireAppRole).toHaveBeenCalledWith([
      "inclusion_empresas_admin",
      "inclusion_empresas_profesional",
    ]);
    expect(mocks.listMisEmpresas).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: expect.objectContaining({
          userId: "auth-user-1",
          profesionalId: 7,
          nombre: "Sara Zambrano",
        }),
        params: expect.objectContaining({ q: "acme", pageSize: 50 }),
      })
    );
  });
});
