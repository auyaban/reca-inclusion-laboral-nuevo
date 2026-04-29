import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  getProfesionalDetail: vi.fn(),
  updateProfesional: vi.fn(),
  deleteProfesional: vi.fn(),
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
    getProfesionalDetail: mocks.getProfesionalDetail,
    updateProfesional: mocks.updateProfesional,
    deleteProfesional: mocks.deleteProfesional,
  };
});

import { DELETE, GET, PUT } from "@/app/api/empresas/profesionales/[id]/route";

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

describe("/api/empresas/profesionales/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(adminAuth);
  });

  it("returns 401 before reading a professional when there is no session", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autenticado." }, { status: 401 }),
    });

    const response = await GET(
      new Request("http://localhost/api/empresas/profesionales/7"),
      routeContext("7")
    );

    expect(response.status).toBe(401);
    expect(mocks.getProfesionalDetail).not.toHaveBeenCalled();
  });

  it("returns 403 before deleting when the current user is not admin", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    });

    const response = await DELETE(
      new Request("http://localhost/api/empresas/profesionales/7", {
        method: "DELETE",
        body: JSON.stringify({ comentario: "Retiro autorizado por gerencia." }),
      }),
      routeContext("7")
    );

    expect(response.status).toBe(403);
    expect(mocks.deleteProfesional).not.toHaveBeenCalled();
  });

  it("returns a professional detail for admin users", async () => {
    mocks.getProfesionalDetail.mockResolvedValue({
      id: 7,
      nombre_profesional: "Sara Zambrano",
    });

    const response = await GET(
      new Request("http://localhost/api/empresas/profesionales/7"),
      routeContext("7")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 7,
      nombre_profesional: "Sara Zambrano",
    });
  });

  it("updates a professional with the admin actor", async () => {
    mocks.updateProfesional.mockResolvedValue({
      id: 7,
      nombre_profesional: "Sara Zambrano",
    });

    const response = await PUT(
      new Request("http://localhost/api/empresas/profesionales/7", {
        method: "PUT",
        body: JSON.stringify({
          accessMode: "catalogo",
          nombre_profesional: "Sara Zambrano",
          correo_profesional: "",
          programa: "",
          antiguedad: "",
          usuario_login: "",
          roles: [],
        }),
      }),
      routeContext("7")
    );

    expect(response.status).toBe(200);
    expect(mocks.updateProfesional).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        actor: expect.objectContaining({ usuarioLogin: "aaron_vercel" }),
      })
    );
  });

  it("soft deletes through the server cascade and returns released empresas", async () => {
    mocks.deleteProfesional.mockResolvedValue({
      deleted: true,
      releasedEmpresas: 2,
    });

    const response = await DELETE(
      new Request("http://localhost/api/empresas/profesionales/7", {
        method: "DELETE",
        body: JSON.stringify({ comentario: "Retiro autorizado por gerencia." }),
      }),
      routeContext("7")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deleted: true,
      releasedEmpresas: 2,
    });
    expect(mocks.deleteProfesional).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        comentario: "Retiro autorizado por gerencia.",
        actor: expect.objectContaining({ usuarioLogin: "aaron_vercel" }),
      })
    );
  });
});
