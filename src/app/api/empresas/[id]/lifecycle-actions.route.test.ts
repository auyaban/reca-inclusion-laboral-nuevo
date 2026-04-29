import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  reclamarEmpresa: vi.fn(),
  soltarEmpresa: vi.fn(),
  cambiarEstadoEmpresaOperativo: vi.fn(),
  agregarEmpresaNota: vi.fn(),
  EmpresaLifecycleError: class MockEmpresaLifecycleError extends Error {
    status: number;
    code: string;

    constructor(options: { status: number; code: string; message: string }) {
      super(options.message);
      this.name = "EmpresaLifecycleError";
      this.status = options.status;
      this.code = options.code;
    }
  },
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/empresas/lifecycle-server", () => ({
  EmpresaLifecycleError: mocks.EmpresaLifecycleError,
  reclamarEmpresa: mocks.reclamarEmpresa,
  soltarEmpresa: mocks.soltarEmpresa,
  cambiarEstadoEmpresaOperativo: mocks.cambiarEstadoEmpresaOperativo,
  agregarEmpresaNota: mocks.agregarEmpresaNota,
}));

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

const routeContext = { params: Promise.resolve({ id: "empresa-1" }) };

const actionRoutes = [
  {
    label: "reclamar",
    importRoute: () => import("@/app/api/empresas/[id]/reclamar/route"),
    body: { comentario: "seguimiento" },
    mock: mocks.reclamarEmpresa,
  },
  {
    label: "soltar",
    importRoute: () => import("@/app/api/empresas/[id]/soltar/route"),
    body: { comentario: "seguimiento" },
    mock: mocks.soltarEmpresa,
  },
  {
    label: "estado",
    importRoute: () => import("@/app/api/empresas/[id]/estado/route"),
    body: { estado: "Activa", comentario: "seguimiento" },
    mock: mocks.cambiarEstadoEmpresaOperativo,
  },
  {
    label: "notas",
    importRoute: () => import("@/app/api/empresas/[id]/notas/route"),
    body: { contenido: "seguimiento" },
    mock: mocks.agregarEmpresaNota,
  },
];

describe("empresa lifecycle action routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(profesionalAuth);
    mocks.reclamarEmpresa.mockResolvedValue({
      ok: true,
      code: "claimed",
      message: "Empresa reclamada.",
      data: { empresaId: "empresa-1" },
    });
    mocks.soltarEmpresa.mockResolvedValue({
      ok: true,
      code: "released",
      message: "Empresa soltada.",
      data: { empresaId: "empresa-1" },
    });
    mocks.cambiarEstadoEmpresaOperativo.mockResolvedValue({
      ok: true,
      code: "state_changed",
      message: "Estado actualizado.",
      data: { empresaId: "empresa-1" },
    });
    mocks.agregarEmpresaNota.mockResolvedValue({
      ok: true,
      code: "note_added",
      message: "Nota guardada.",
      data: { empresaId: "empresa-1" },
    });
  });

  it("reclama una empresa with the authenticated professional actor", async () => {
    const { POST } = await import("@/app/api/empresas/[id]/reclamar/route");

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ comentario: "  seguimiento requerido  " }),
      }),
      routeContext
    );

    expect(response.status).toBe(200);
    expect(mocks.requireAppRole).toHaveBeenCalledWith([
      "inclusion_empresas_admin",
      "inclusion_empresas_profesional",
    ]);
    expect(mocks.reclamarEmpresa).toHaveBeenCalledWith({
      empresaId: "empresa-1",
      actor: {
        userId: "auth-user-1",
        profesionalId: 7,
        nombre: "Sara Zambrano",
      },
      comentario: "seguimiento requerido",
    });
  });

  it.each([
    ["401", 401, "No autenticado."],
    ["403", 403, "No autorizado."],
  ])(
    "returns %s authorization responses before mutating lifecycle records",
    async (_label, status, message) => {
      mocks.requireAppRole.mockResolvedValue({
        ok: false,
        response: Response.json({ error: message }, { status }),
      });

      for (const route of actionRoutes) {
        vi.clearAllMocks();
        mocks.requireAppRole.mockResolvedValue({
          ok: false,
          response: Response.json({ error: message }, { status }),
        });
        const { POST } = await route.importRoute();

        const response = await POST(
          new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify(route.body),
          }),
          routeContext
        );

        expect(response.status).toBe(status);
        expect(route.mock).not.toHaveBeenCalled();
      }
    }
  );

  it("maps lifecycle business errors to status and code", async () => {
    mocks.reclamarEmpresa.mockRejectedValue(
      new mocks.EmpresaLifecycleError({
        status: 400,
        code: "comment_required",
        message: "Agrega un comentario para continuar.",
      })
    );
    const { POST } = await import("@/app/api/empresas/[id]/reclamar/route");

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      routeContext
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "Agrega un comentario para continuar.",
      code: "comment_required",
    });
  });

  it("rejects invalid soltar, estado and nota payloads with fieldErrors", async () => {
    const [{ POST: soltar }, { POST: estado }, { POST: notas }] = await Promise.all([
      import("@/app/api/empresas/[id]/soltar/route"),
      import("@/app/api/empresas/[id]/estado/route"),
      import("@/app/api/empresas/[id]/notas/route"),
    ]);

    const soltarResponse = await soltar(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ comentario: " " }),
      }),
      routeContext
    );
    const estadoResponse = await estado(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ estado: "SENA", comentario: "comentario" }),
      }),
      routeContext
    );
    const notaResponse = await notas(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ contenido: " " }),
      }),
      routeContext
    );

    expect(soltarResponse.status).toBe(400);
    expect(estadoResponse.status).toBe(400);
    expect(notaResponse.status).toBe(400);
    expect((await soltarResponse.json()).fieldErrors.comentario).toBeDefined();
    expect((await estadoResponse.json()).fieldErrors.estado).toBeDefined();
    expect((await notaResponse.json()).fieldErrors.contenido).toBeDefined();
    expect(mocks.soltarEmpresa).not.toHaveBeenCalled();
    expect(mocks.cambiarEstadoEmpresaOperativo).not.toHaveBeenCalled();
    expect(mocks.agregarEmpresaNota).not.toHaveBeenCalled();
  });
});
