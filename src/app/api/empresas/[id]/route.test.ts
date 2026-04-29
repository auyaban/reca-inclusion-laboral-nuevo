import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  getEmpresaDetail: vi.fn(),
  updateEmpresa: vi.fn(),
  deleteEmpresa: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/empresas/server", () => ({
  getEmpresaDetail: mocks.getEmpresaDetail,
  updateEmpresa: mocks.updateEmpresa,
  deleteEmpresa: mocks.deleteEmpresa,
}));

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

describe("/api/empresas/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(adminAuth);
  });

  it("returns 404 when the empresa does not exist", async () => {
    mocks.getEmpresaDetail.mockResolvedValue(null);
    const { GET } = await import("@/app/api/empresas/[id]/route");

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "empresa-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 when the current user does not have the admin role", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    });
    const { GET } = await import("@/app/api/empresas/[id]/route");

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "empresa-1" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.getEmpresaDetail).not.toHaveBeenCalled();
  });

  it("updates an empresa with the admin actor", async () => {
    mocks.updateEmpresa.mockResolvedValue({ id: "empresa-1", nombre_empresa: "ACME" });
    const { PUT } = await import("@/app/api/empresas/[id]/route");

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({
          nombre_empresa: "ACME",
          gestion: "RECA",
          estado: "En Proceso",
          previous_estado: "En Proceso",
        }),
      }),
      { params: Promise.resolve({ id: "empresa-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.updateEmpresa).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "empresa-1",
        input: expect.objectContaining({
          nombre_empresa: "Acme",
          gestion: "RECA",
          estado: "En Proceso",
        }),
        actor: expect.objectContaining({ userId: "auth-user-1" }),
      })
    );
  });

  it("normalizes update payloads before calling the server layer", async () => {
    mocks.updateEmpresa.mockResolvedValue({ id: "empresa-1", nombre_empresa: "Acme Sas" });
    const { PUT } = await import("@/app/api/empresas/[id]/route");

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({
          nombre_empresa: "  acme   sas  ",
          nit_empresa: "900.123.456 - 7",
          ciudad_empresa: "\u200bbogota   norte\u200b",
          caja_compensacion: " compensar ",
          gestion: "compensar",
          estado: " pausada ",
          previous_estado: "Pausada",
        }),
      }),
      { params: Promise.resolve({ id: "empresa-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.updateEmpresa).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "empresa-1",
        input: expect.objectContaining({
          nombre_empresa: "Acme Sas",
          nit_empresa: "900123456-7",
          ciudad_empresa: "Bogota Norte",
          caja_compensacion: "Compensar",
          gestion: "COMPENSAR",
          estado: "Pausada",
        }),
      })
    );
  });

  it("returns 400 when update receives an invalid nit", async () => {
    const { PUT } = await import("@/app/api/empresas/[id]/route");

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({
          nombre_empresa: "ACME",
          nit_empresa: "900$123",
          gestion: "RECA",
          estado: "En Proceso",
          previous_estado: "En Proceso",
        }),
      }),
      { params: Promise.resolve({ id: "empresa-1" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.updateEmpresa).not.toHaveBeenCalled();
  });

  it("soft deletes an empresa with an optional comment", async () => {
    mocks.deleteEmpresa.mockResolvedValue({ deleted: true });
    const { DELETE } = await import("@/app/api/empresas/[id]/route");

    const response = await DELETE(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ comentario: "Duplicada" }),
      }),
      { params: Promise.resolve({ id: "empresa-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.deleteEmpresa).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "empresa-1",
        comentario: "Duplicada",
      })
    );
  });
});
