import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  cancelProyeccion: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/proyecciones/server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/proyecciones/server")>(
    "@/lib/proyecciones/server"
  );
  return {
    ...actual,
    cancelProyeccion: mocks.cancelProyeccion,
  };
});

import { POST } from "@/app/api/proyecciones/[id]/cancelar/route";

const projectionId = "11111111-1111-4111-8111-111111111111";
const routeContext = { params: Promise.resolve({ id: projectionId }) };

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

describe("/api/proyecciones/[id]/cancelar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(profesionalAuth);
    mocks.cancelProyeccion.mockResolvedValue({
      ok: true,
      code: "cancelled",
      message: "Proyeccion cancelada.",
      data: { id: projectionId },
    });
  });

  it("cancels a projection with actor context", async () => {
    const response = await POST(
      new Request(`http://localhost/api/proyecciones/${projectionId}/cancelar`, {
        method: "POST",
        body: JSON.stringify({ comentario: "Cambio de agenda" }),
      }),
      routeContext
    );

    expect(response.status).toBe(200);
    expect(mocks.cancelProyeccion).toHaveBeenCalledWith({
      id: projectionId,
      actor: expect.objectContaining({ profesionalId: 7 }),
      comentario: "Cambio de agenda",
    });
  });

  it("returns 404 for invalid route ids before cancelling", async () => {
    const invalidContext = { params: Promise.resolve({ id: "not-a-uuid" }) };

    const response = await POST(
      new Request("http://localhost/api/proyecciones/not-a-uuid/cancelar", {
        method: "POST",
        body: JSON.stringify({ comentario: "Cambio" }),
      }),
      invalidContext
    );

    expect(response.status).toBe(404);
    expect(mocks.cancelProyeccion).not.toHaveBeenCalled();
  });

  it.each([
    ["401", 401, "No autenticado."],
    ["403", 403, "No autorizado."],
  ])("returns %s before cancelling", async (_label, status, message) => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: message }, { status }),
    });

    const response = await POST(
      new Request(`http://localhost/api/proyecciones/${projectionId}/cancelar`, {
        method: "POST",
        body: JSON.stringify({ comentario: "Cambio" }),
      }),
      routeContext
    );

    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.cancelProyeccion).not.toHaveBeenCalled();
  });
});
