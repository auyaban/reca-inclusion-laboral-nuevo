import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  listProyecciones: vi.fn(),
  createProyeccion: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/proyecciones/server", () => ({
  listProyecciones: mocks.listProyecciones,
  createProyeccion: mocks.createProyeccion,
}));

import { GET, POST } from "@/app/api/proyecciones/route";

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

describe("/api/proyecciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(profesionalAuth);
    mocks.listProyecciones.mockResolvedValue({ items: [] });
    mocks.createProyeccion.mockResolvedValue({
      ok: true,
      code: "created",
      message: "Proyeccion creada.",
      data: { id: "11111111-1111-4111-8111-111111111111" },
    });
  });

  it.each([
    ["401", 401, "No autenticado."],
    ["403", 403, "No autorizado."],
  ])("returns %s before listing or creating", async (_label, status, message) => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: message }, { status }),
    });

    const getResponse = await GET(new Request("http://localhost/api/proyecciones"));
    const postResponse = await POST(
      new Request("http://localhost/api/proyecciones", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(getResponse.status).toBe(status);
    expect(postResponse.status).toBe(status);
    expect(getResponse.headers.get("Cache-Control")).toBe("private, no-store");
    expect(postResponse.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.listProyecciones).not.toHaveBeenCalled();
    expect(mocks.createProyeccion).not.toHaveBeenCalled();
  });

  it("lists projections with parsed filters and no-store headers", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/proyecciones?from=2026-05-04T00:00:00.000Z&to=2026-05-11T00:00:00.000Z&includeInterpreter=false"
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.requireAppRole).toHaveBeenCalledWith([
      "inclusion_empresas_admin",
      "inclusion_empresas_profesional",
    ]);
    expect(mocks.listProyecciones).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "2026-05-04T00:00:00.000Z",
        to: "2026-05-11T00:00:00.000Z",
        includeInterpreter: false,
      })
    );
  });

  it("creates a projection with actor context", async () => {
    const response = await POST(
      new Request("http://localhost/api/proyecciones", {
        method: "POST",
        body: JSON.stringify({
          empresaId: "11111111-1111-4111-8111-111111111111",
          serviceKey: "inclusive_selection",
          inicioAt: "2026-05-04T14:00:00.000Z",
          duracionMinutos: 90,
          modalidad: "presencial",
          cantidadPersonas: 4,
          requiresInterpreter: true,
          interpreterCount: 2,
          interpreterProjectedHours: 3,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.createProyeccion).toHaveBeenCalledWith({
      actor: {
        userId: "auth-user-1",
        profesionalId: 7,
        nombre: "Sara Zambrano",
      },
      payload: expect.objectContaining({
        serviceKey: "inclusive_selection",
        requiresInterpreter: true,
      }),
    });
  });

  it("returns fieldErrors for invalid create payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/proyecciones", {
        method: "POST",
        body: JSON.stringify({
          empresaId: "11111111-1111-4111-8111-111111111111",
          serviceKey: "program_presentation",
          inicioAt: "2026-05-04T14:00:00.000Z",
          duracionMinutos: 90,
          modalidad: "presencial",
          requiresInterpreter: true,
          interpreterCount: 1,
          interpreterProjectedHours: 2,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.fieldErrors.interpreterExceptionReason).toBeDefined();
    expect(mocks.createProyeccion).not.toHaveBeenCalled();
  });

  it("rejects interpreter service as a main projection", async () => {
    const response = await POST(
      new Request("http://localhost/api/proyecciones", {
        method: "POST",
        body: JSON.stringify({
          empresaId: "11111111-1111-4111-8111-111111111111",
          serviceKey: "interpreter_service",
          inicioAt: "2026-05-04T14:00:00.000Z",
          duracionMinutos: 90,
          modalidad: "todas_las_modalidades",
          requiresInterpreter: false,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.fieldErrors.serviceKey).toBeDefined();
    expect(mocks.createProyeccion).not.toHaveBeenCalled();
  });
});
