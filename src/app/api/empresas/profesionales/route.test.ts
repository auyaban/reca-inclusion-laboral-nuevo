import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  listProfesionales: vi.fn(),
  createProfesional: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/profesionales/server", () => ({
  listProfesionales: mocks.listProfesionales,
  createProfesional: mocks.createProfesional,
}));

import { GET, POST } from "@/app/api/empresas/profesionales/route";

const adminAuth = {
  ok: true,
  context: {
    user: { id: "auth-user-1", email: "aaron@reca.test" },
    profile: {
      id: 1,
      authUserId: "auth-user-1",
      displayName: "Aaron Vercel",
      usuarioLogin: "aaron_vercel",
      email: "aaron@reca.test",
    },
    roles: ["inclusion_empresas_admin"],
  },
};

describe("/api/empresas/profesionales", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(adminAuth);
  });

  it("returns 401 when there is no authenticated user", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autenticado." }, { status: 401 }),
    });

    const response = await GET(
      new Request("http://localhost/api/empresas/profesionales")
    );

    expect(response.status).toBe(401);
    expect(mocks.listProfesionales).not.toHaveBeenCalled();
  });

  it("returns 403 when the current user is not an Admin Inclusión", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    });

    const response = await GET(
      new Request("http://localhost/api/empresas/profesionales")
    );

    expect(response.status).toBe(403);
    expect(mocks.listProfesionales).not.toHaveBeenCalled();
  });

  it("lists professionals with parsed query params", async () => {
    mocks.listProfesionales.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    });

    const response = await GET(
      new Request("http://localhost/api/empresas/profesionales?q=sara&estado=activos")
    );

    expect(response.status).toBe(200);
    expect(mocks.listProfesionales).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ q: "sara", estado: "activos" }),
      })
    );
  });

  it("creates an auth professional and returns the temporary password once", async () => {
    mocks.createProfesional.mockResolvedValue({
      profesional: { id: 10, nombre_profesional: "Sara Zambrano" },
      temporaryPassword: "Temp123!",
    });

    const response = await POST(
      new Request("http://localhost/api/empresas/profesionales", {
        method: "POST",
        body: JSON.stringify({
          accessMode: "auth",
          nombre_profesional: "Sara Zambrano",
          correo_profesional: "sara@reca.test",
          usuario_login: "sara",
          roles: ["inclusion_empresas_profesional"],
        }),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      temporaryPassword: "Temp123!",
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
