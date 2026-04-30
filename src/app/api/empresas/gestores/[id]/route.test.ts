import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  getCatalogoRecord: vi.fn(),
  updateCatalogoRecord: vi.fn(),
  deleteCatalogoRecord: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/catalogos/server", () => ({
  getCatalogoRecord: mocks.getCatalogoRecord,
  updateCatalogoRecord: mocks.updateCatalogoRecord,
  deleteCatalogoRecord: mocks.deleteCatalogoRecord,
}));

import { DELETE, GET, PUT } from "@/app/api/empresas/gestores/[id]/route";

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

const context = {
  params: Promise.resolve({ id: "gestor-1" }),
};

describe("/api/empresas/gestores/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(adminAuth);
  });

  it("returns 404 when the gestor does not exist", async () => {
    mocks.getCatalogoRecord.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/empresas/gestores/gestor-1"),
      context
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Registro no encontrado.",
    });
  });

  it("updates gestor records through the catalog server", async () => {
    mocks.updateCatalogoRecord.mockResolvedValue({
      id: "gestor-1",
      nombre: "Laura Mora",
    });

    const response = await PUT(
      new Request("http://localhost/api/empresas/gestores/gestor-1", {
        method: "PUT",
        body: JSON.stringify({ nombre: "Laura Mora" }),
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(mocks.updateCatalogoRecord).toHaveBeenCalledWith({
      kind: "gestores",
      id: "gestor-1",
      input: { nombre: "Laura Mora" },
    });
  });

  it("soft deletes gestor records through the catalog server", async () => {
    mocks.deleteCatalogoRecord.mockResolvedValue({
      id: "gestor-1",
      nombre: "Laura Mora",
      deleted_at: "2026-04-29T12:00:00.000Z",
    });

    const response = await DELETE(
      new Request("http://localhost/api/empresas/gestores/gestor-1", {
        method: "DELETE",
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(mocks.deleteCatalogoRecord).toHaveBeenCalledWith({
      kind: "gestores",
      id: "gestor-1",
    });
  });
});
