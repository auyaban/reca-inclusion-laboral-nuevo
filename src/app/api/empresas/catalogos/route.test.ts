import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  getEmpresaCatalogos: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/empresas/server", () => ({
  getEmpresaCatalogos: mocks.getEmpresaCatalogos,
}));

describe("/api/empresas/catalogos", () => {
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

  it("returns catalog options for the empresa form", async () => {
    mocks.getEmpresaCatalogos.mockResolvedValue({
      profesionales: [{ id: 7, nombre: "Sara Zambrano", correo: "sara@reca.test" }],
      asesores: [{ nombre: "Carlos Ruiz", email: "carlos@test.com" }],
      zonasCompensar: ["Chapinero", "Soacha"],
      filtros: { zonas: [], estados: [], gestores: [] },
    });
    const { GET } = await import("@/app/api/empresas/catalogos/route");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profesionales: [{ id: 7, nombre: "Sara Zambrano", correo: "sara@reca.test" }],
      asesores: [{ nombre: "Carlos Ruiz", email: "carlos@test.com" }],
      zonasCompensar: ["Chapinero", "Soacha"],
      filtros: { zonas: [], estados: [], gestores: [] },
    });
  });

  it("returns 401 when there is no authenticated user", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autenticado." }, { status: 401 }),
    });
    const { GET } = await import("@/app/api/empresas/catalogos/route");

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.getEmpresaCatalogos).not.toHaveBeenCalled();
  });
});
