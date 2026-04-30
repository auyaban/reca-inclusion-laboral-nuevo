import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  listCatalogoRecords: vi.fn(),
  createCatalogoRecord: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/catalogos/server", () => ({
  listCatalogoRecords: mocks.listCatalogoRecords,
  createCatalogoRecord: mocks.createCatalogoRecord,
}));

import { GET, POST } from "@/app/api/empresas/asesores/route";

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

describe("/api/empresas/asesores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(adminAuth);
  });

  it("returns 403 before listing when the user is not admin", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    });

    const response = await GET(
      new Request("http://localhost/api/empresas/asesores")
    );

    expect(response.status).toBe(403);
    expect(mocks.listCatalogoRecords).not.toHaveBeenCalled();
  });

  it("lists asesores with parsed params", async () => {
    mocks.listCatalogoRecords.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    });

    const response = await GET(
      new Request("http://localhost/api/empresas/asesores?q=carlos&sort=email")
    );

    expect(response.status).toBe(200);
    expect(mocks.listCatalogoRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "asesores",
        params: expect.objectContaining({ q: "carlos", sort: "email" }),
      })
    );
  });

  it("creates asesor records through the catalog server", async () => {
    mocks.createCatalogoRecord.mockResolvedValue({
      id: "1",
      nombre: "Carlos Ruiz",
    });

    const response = await POST(
      new Request("http://localhost/api/empresas/asesores", {
        method: "POST",
        body: JSON.stringify({ nombre: "Carlos Ruiz" }),
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.createCatalogoRecord).toHaveBeenCalledWith({
      kind: "asesores",
      input: { nombre: "Carlos Ruiz" },
    });
  });
});
