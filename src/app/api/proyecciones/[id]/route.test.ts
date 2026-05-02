import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  getProyeccion: vi.fn(),
  updateProyeccion: vi.fn(),
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
    getProyeccion: mocks.getProyeccion,
    updateProyeccion: mocks.updateProyeccion,
  };
});

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

describe("/api/proyecciones/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(profesionalAuth);
    mocks.getProyeccion.mockResolvedValue({ id: projectionId });
    mocks.updateProyeccion.mockResolvedValue({
      ok: true,
      code: "updated",
      message: "Proyeccion actualizada.",
      data: { id: projectionId },
    });
  });

  it("gets a projection by id", async () => {
    const { GET } = await import("@/app/api/proyecciones/[id]/route");

    const response = await GET(
      new Request(`http://localhost/api/proyecciones/${projectionId}`),
      routeContext
    );

    expect(response.status).toBe(200);
    expect(mocks.getProyeccion).toHaveBeenCalledWith(projectionId);
  });

  it("updates a projection with actor context", async () => {
    const { PATCH } = await import("@/app/api/proyecciones/[id]/route");

    const response = await PATCH(
      new Request(`http://localhost/api/proyecciones/${projectionId}`, {
        method: "PATCH",
        body: JSON.stringify({
          serviceKey: "follow_up",
          duracionMinutos: 45,
          numeroSeguimiento: 2,
        }),
      }),
      routeContext
    );

    expect(response.status).toBe(200);
    expect(mocks.updateProyeccion).toHaveBeenCalledWith({
      id: projectionId,
      actor: expect.objectContaining({ profesionalId: 7 }),
      payload: expect.objectContaining({
        serviceKey: "follow_up",
        numeroSeguimiento: 2,
      }),
    });
  });

  it("passes interpreter fields when adding interpreter support", async () => {
    const { PATCH } = await import("@/app/api/proyecciones/[id]/route");

    const response = await PATCH(
      new Request(`http://localhost/api/proyecciones/${projectionId}`, {
        method: "PATCH",
        body: JSON.stringify({
          serviceKey: "inclusive_selection",
          requiresInterpreter: true,
          interpreterCount: 2,
          interpreterProjectedHours: 3,
          cantidadPersonas: 4,
        }),
      }),
      routeContext
    );

    expect(response.status).toBe(200);
    expect(mocks.updateProyeccion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: projectionId,
        payload: expect.objectContaining({
          requiresInterpreter: true,
          interpreterCount: 2,
          interpreterProjectedHours: 3,
        }),
      })
    );
  });

  it("passes interpreter removal to the transactional update", async () => {
    const { PATCH } = await import("@/app/api/proyecciones/[id]/route");

    const response = await PATCH(
      new Request(`http://localhost/api/proyecciones/${projectionId}`, {
        method: "PATCH",
        body: JSON.stringify({
          requiresInterpreter: false,
        }),
      }),
      routeContext
    );

    expect(response.status).toBe(200);
    expect(mocks.updateProyeccion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: projectionId,
        payload: expect.objectContaining({
          requiresInterpreter: false,
        }),
      })
    );
  });

  it("maps already cancelled business errors from update", async () => {
    const { ProyeccionServerError } = await import("@/lib/proyecciones/server");
    mocks.updateProyeccion.mockRejectedValue(
      new ProyeccionServerError({
        status: 409,
        code: "already_cancelled",
        message: "La proyeccion ya esta cancelada.",
      })
    );
    const { PATCH } = await import("@/app/api/proyecciones/[id]/route");

    const response = await PATCH(
      new Request(`http://localhost/api/proyecciones/${projectionId}`, {
        method: "PATCH",
        body: JSON.stringify({ duracionMinutos: 45 }),
      }),
      routeContext
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("already_cancelled");
  });

  it("returns 404 for invalid route ids before hitting the database", async () => {
    const { GET, PATCH } = await import("@/app/api/proyecciones/[id]/route");
    const invalidContext = { params: Promise.resolve({ id: "not-a-uuid" }) };

    const getResponse = await GET(
      new Request("http://localhost/api/proyecciones/not-a-uuid"),
      invalidContext
    );
    const patchResponse = await PATCH(
      new Request("http://localhost/api/proyecciones/not-a-uuid", {
        method: "PATCH",
        body: JSON.stringify({ duracionMinutos: 45 }),
      }),
      invalidContext
    );

    expect(getResponse.status).toBe(404);
    expect(patchResponse.status).toBe(404);
    expect(mocks.getProyeccion).not.toHaveBeenCalled();
    expect(mocks.updateProyeccion).not.toHaveBeenCalled();
  });

  it.each([
    ["401", 401, "No autenticado."],
    ["403", 403, "No autorizado."],
  ])("returns %s before accessing projection", async (_label, status, message) => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: message }, { status }),
    });
    const { GET, PATCH } = await import("@/app/api/proyecciones/[id]/route");

    const getResponse = await GET(
      new Request(`http://localhost/api/proyecciones/${projectionId}`),
      routeContext
    );
    const patchResponse = await PATCH(
      new Request(`http://localhost/api/proyecciones/${projectionId}`, {
        method: "PATCH",
        body: JSON.stringify({ duracionMinutos: 45 }),
      }),
      routeContext
    );

    expect(getResponse.status).toBe(status);
    expect(patchResponse.status).toBe(status);
    expect(getResponse.headers.get("Cache-Control")).toBe("private, no-store");
    expect(patchResponse.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.getProyeccion).not.toHaveBeenCalled();
    expect(mocks.updateProyeccion).not.toHaveBeenCalled();
  });
});
