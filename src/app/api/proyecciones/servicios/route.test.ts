import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  listCachedProyeccionServicios: vi.fn(),
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
    listCachedProyeccionServicios: mocks.listCachedProyeccionServicios,
  };
});

import { GET } from "@/app/api/proyecciones/servicios/route";

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

describe("/api/proyecciones/servicios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(profesionalAuth);
    mocks.listCachedProyeccionServicios.mockResolvedValue({
      items: [{ serviceKey: "program_presentation", nombre: "Presentacion" }],
    });
  });

  it("returns projectable services with no-store headers", async () => {
    const response = await GET(new Request("http://localhost/api/proyecciones/servicios"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(body.items[0].serviceKey).toBe("program_presentation");
    expect(mocks.listCachedProyeccionServicios).toHaveBeenCalledOnce();
  });

  it("does not query services when authorization fails", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    });

    const response = await GET(new Request("http://localhost/api/proyecciones/servicios"));

    expect(response.status).toBe(403);
    expect(mocks.listCachedProyeccionServicios).not.toHaveBeenCalled();
  });
});
