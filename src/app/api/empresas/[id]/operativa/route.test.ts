import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  getEmpresaOperativaDetail: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/empresas/lifecycle-queries", () => ({
  getEmpresaOperativaDetail: mocks.getEmpresaOperativaDetail,
}));

import { GET } from "@/app/api/empresas/[id]/operativa/route";

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

describe("/api/empresas/[id]/operativa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(profesionalAuth);
    mocks.getEmpresaOperativaDetail.mockResolvedValue({
      id: "empresa-1",
      nombreEmpresa: "Empresa Propia",
      assignmentStatus: "tuya",
    });
  });

  it.each([
    ["401", 401, "No autenticado."],
    ["403", 403, "No autorizado."],
  ])("returns %s before loading details", async (_label, status, message) => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: message }, { status }),
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "empresa-1" }),
    });

    expect(response.status).toBe(status);
    expect(mocks.getEmpresaOperativaDetail).not.toHaveBeenCalled();
  });

  it("returns the read-only operational detail for the authenticated actor", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "empresa-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: "empresa-1",
      nombreEmpresa: "Empresa Propia",
      assignmentStatus: "tuya",
    });
    expect(mocks.getEmpresaOperativaDetail).toHaveBeenCalledWith({
      empresaId: "empresa-1",
      actor: {
        userId: "auth-user-1",
        profesionalId: 7,
        nombre: "Sara Zambrano",
      },
    });
  });
});
