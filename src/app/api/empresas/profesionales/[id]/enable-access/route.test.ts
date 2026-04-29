import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
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
    requireAppRole: vi.fn(),
    enableProfesionalAccess: vi.fn(),
  };
});

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/profesionales/server", () => ({
  ProfesionalServerError: mocks.ProfesionalServerError,
  enableProfesionalAccess: mocks.enableProfesionalAccess,
}));

import { POST } from "@/app/api/empresas/profesionales/[id]/enable-access/route";

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

const routeContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

const validBody = {
  correo_profesional: "sara.zambrano",
  roles: ["inclusion_empresas_profesional"],
};

describe("/api/empresas/profesionales/[id]/enable-access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(adminAuth);
  });

  it("returns the temporary password once when access is enabled", async () => {
    mocks.enableProfesionalAccess.mockResolvedValue({
      profesional: { id: 7, auth_user_id: "auth-user-7" },
      temporaryPassword: "Temp123!Segura",
    });

    const response = await POST(
      new Request("http://localhost/api/empresas/profesionales/7/enable-access", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
      routeContext("7")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({
      temporaryPassword: "Temp123!Segura",
    });
    expect(mocks.enableProfesionalAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          correo_profesional: "sara.zambrano@recacolombia.org",
        }),
      })
    );
  });

  it("returns 409 before mutating when the Auth user is linked elsewhere", async () => {
    mocks.enableProfesionalAccess.mockRejectedValue(
      new mocks.ProfesionalServerError(
        409,
        "Ese correo ya está vinculado a otro profesional activo."
      )
    );

    const response = await POST(
      new Request("http://localhost/api/empresas/profesionales/7/enable-access", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
      routeContext("7")
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Ese correo ya está vinculado a otro profesional activo.",
    });
  });
});
