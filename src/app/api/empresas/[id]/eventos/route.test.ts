import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  listEmpresaEventos: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/empresas/server", () => ({
  listEmpresaEventos: mocks.listEmpresaEventos,
}));

describe("/api/empresas/[id]/eventos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue({
      ok: true,
      context: {
        user: { id: "auth-user-1", email: "sara@reca.test" },
        profile: { id: 7, displayName: "Sara Zambrano" },
        roles: ["inclusion_empresas_admin"],
      },
    });
  });

  it("returns recent events for admin users", async () => {
    mocks.listEmpresaEventos.mockResolvedValue([
      { id: "event-1", tipo: "creacion", resumen: "Empresa creada" },
    ]);
    const { GET } = await import("@/app/api/empresas/[id]/eventos/route");

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "empresa-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [{ id: "event-1", tipo: "creacion", resumen: "Empresa creada" }],
    });
  });

  it("returns 403 when the current user does not have the admin role", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    });
    const { GET } = await import("@/app/api/empresas/[id]/eventos/route");

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "empresa-1" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.listEmpresaEventos).not.toHaveBeenCalled();
  });
});
