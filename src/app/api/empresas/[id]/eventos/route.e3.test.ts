import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  listEmpresaEventosOperativos: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/empresas/lifecycle-queries", () => ({
  listEmpresaEventosOperativos: mocks.listEmpresaEventosOperativos,
}));

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

describe("/api/empresas/[id]/eventos E3.2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(profesionalAuth);
  });

  it("uses operational roles and returns paginated sanitized events", async () => {
    mocks.listEmpresaEventosOperativos.mockResolvedValue({
      items: [
        {
          id: "event-1",
          tipo: "nota",
          actorNombre: "Sara Zambrano",
          createdAt: "2026-04-29T12:00:00.000Z",
          resumen: "Nota: Seguimiento.",
          detalle: "Seguimiento.",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    const { GET } = await import("@/app/api/empresas/[id]/eventos/route");

    const response = await GET(
      new Request("http://localhost/api/empresas/empresa-1/eventos?tipo=nota"),
      { params: Promise.resolve({ id: "empresa-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.requireAppRole).toHaveBeenCalledWith([
      "inclusion_empresas_admin",
      "inclusion_empresas_profesional",
    ]);
    expect(mocks.listEmpresaEventosOperativos).toHaveBeenCalledWith({
      empresaId: "empresa-1",
      params: expect.objectContaining({ tipo: "nota", page: 1, pageSize: 20 }),
    });
    expect(body.items[0]).toEqual(
      expect.objectContaining({
        actorNombre: "Sara Zambrano",
        createdAt: "2026-04-29T12:00:00.000Z",
      })
    );
    expect(body.items[0]).not.toHaveProperty("payload");
    expect(body.total).toBe(1);
  });

  it.each([
    ["401", 401, "No autenticado."],
    ["403", 403, "No autorizado."],
  ])(
    "returns %s without querying events when authorization fails",
    async (_label, status, message) => {
      mocks.requireAppRole.mockResolvedValue({
        ok: false,
        response: Response.json({ error: message }, { status }),
      });
      const { GET } = await import("@/app/api/empresas/[id]/eventos/route");

      const response = await GET(new Request("http://localhost"), {
        params: Promise.resolve({ id: "empresa-1" }),
      });

      expect(response.status).toBe(status);
      expect(mocks.listEmpresaEventosOperativos).not.toHaveBeenCalled();
    }
  );
});
