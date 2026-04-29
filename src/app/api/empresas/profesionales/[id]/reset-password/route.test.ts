import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  resetProfesionalPassword: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/profesionales/server", () => {
  class ProfesionalServerError extends Error {
    constructor(
      public readonly status: number,
      message: string
    ) {
      super(message);
    }
  }

  return {
    ProfesionalServerError,
    resetProfesionalPassword: mocks.resetProfesionalPassword,
  };
});

import { POST } from "@/app/api/empresas/profesionales/[id]/reset-password/route";

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
      authPasswordTemp: false,
    },
    roles: ["inclusion_empresas_admin"],
  },
};

describe("/api/empresas/profesionales/[id]/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(adminAuth);
  });

  it("returns a no-store response with the new temporary password", async () => {
    mocks.resetProfesionalPassword.mockResolvedValue({
      temporaryPassword: "Temp123!Segura",
    });

    const response = await POST(
      new Request("http://localhost/api/empresas/profesionales/7/reset-password", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "7" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      temporaryPassword: "Temp123!Segura",
    });
    expect(mocks.resetProfesionalPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        actor: expect.objectContaining({ usuarioLogin: "aaron_vercel" }),
      })
    );
  });

  it("does not reset passwords for users without the admin role", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    });

    const response = await POST(
      new Request("http://localhost/api/empresas/profesionales/7/reset-password", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "7" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.resetProfesionalPassword).not.toHaveBeenCalled();
  });
});
