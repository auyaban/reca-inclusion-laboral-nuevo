import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  listEmpresas: vi.fn(),
  createEmpresa: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/empresas/server", () => ({
  listEmpresas: mocks.listEmpresas,
  createEmpresa: mocks.createEmpresa,
}));

import { GET, POST } from "@/app/api/empresas/route";

const adminAuth = {
  ok: true,
  context: {
    user: { id: "auth-user-1", email: "sara@reca.test" },
    profile: {
      id: 7,
      authUserId: "auth-user-1",
      displayName: "Sara Zambrano",
      usuarioLogin: "sara",
      email: "sara@reca.test",
    },
    roles: ["inclusion_empresas_admin"],
  },
};

describe("/api/empresas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(adminAuth);
  });

  it("returns 403 when the current user is not an Empresas admin", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    });

    const response = await GET(new Request("http://localhost/api/empresas"));

    expect(response.status).toBe(403);
    expect(mocks.listEmpresas).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no authenticated user", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autenticado." }, { status: 401 }),
    });

    const response = await GET(new Request("http://localhost/api/empresas"));

    expect(response.status).toBe(401);
    expect(mocks.listEmpresas).not.toHaveBeenCalled();
  });

  it("lists empresas with parsed query params", async () => {
    mocks.listEmpresas.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    });

    const response = await GET(
      new Request("http://localhost/api/empresas?q=acme&pageSize=50")
    );

    expect(response.status).toBe(200);
    expect(mocks.listEmpresas).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ q: "acme", pageSize: 50 }),
      })
    );
  });

  it("creates an empresa and records the admin actor", async () => {
    mocks.createEmpresa.mockResolvedValue({
      id: "empresa-1",
      nombre_empresa: "ACME SAS",
    });

    const response = await POST(
      new Request("http://localhost/api/empresas", {
        method: "POST",
        body: JSON.stringify({
          nombre_empresa: "ACME SAS",
          gestion: "RECA",
          estado: "En Proceso",
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.createEmpresa).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: expect.objectContaining({
          userId: "auth-user-1",
          profesionalId: 7,
          nombre: "Sara Zambrano",
        }),
      })
    );
  });
});
