import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  suggestProfesionalUsuarioLogin: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/profesionales/server", () => ({
  suggestProfesionalUsuarioLogin: mocks.suggestProfesionalUsuarioLogin,
}));

import { GET } from "@/app/api/empresas/profesionales/login-sugerido/route";

describe("/api/empresas/profesionales/login-sugerido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue({
      ok: true,
      context: {
        user: { id: "auth-user-1" },
        profile: { id: 1, displayName: "Aaron Vercel", usuarioLogin: "aaron_vercel" },
        roles: ["inclusion_empresas_admin"],
      },
    });
  });

  it("returns a suggested readonly usuario_login", async () => {
    mocks.suggestProfesionalUsuarioLogin.mockResolvedValue("marlop2");

    const response = await GET(
      new Request(
        "http://localhost/api/empresas/profesionales/login-sugerido?nombre=Maria%20Lopez&excludeId=7"
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ usuarioLogin: "marlop2" });
    expect(mocks.suggestProfesionalUsuarioLogin).toHaveBeenCalledWith({
      nombre: "Maria Lopez",
      excludeId: 7,
    });
  });

  it("returns 403 for non-admin users", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    });

    const response = await GET(
      new Request(
        "http://localhost/api/empresas/profesionales/login-sugerido?nombre=Maria%20Lopez"
      )
    );

    expect(response.status).toBe(403);
    expect(mocks.suggestProfesionalUsuarioLogin).not.toHaveBeenCalled();
  });
});
