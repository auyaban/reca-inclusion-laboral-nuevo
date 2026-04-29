import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  listEmpresas: vi.fn(),
  createEmpresa: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/empresas/server", () => ({
  listEmpresas: mocks.listEmpresas,
  createEmpresa: mocks.createEmpresa,
}));

import { GET, POST } from "@/app/api/empresas/route";

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

const validEmpresaPayload = {
  nombre_empresa: "ACME SAS",
  nit_empresa: "900123",
  direccion_empresa: "Calle 80",
  ciudad_empresa: "Bogota",
  sede_empresa: "Principal",
  zona_empresa: "Chapinero",
  responsable_visita: "Sandra Pachon",
  contacto_empresa: "Sandra Pachon",
  cargo: "Gerente",
  telefono_empresa: "300 123 4567",
  correo_1: "sandra@reca.co",
  caja_compensacion: "Compensar",
  asesor: "Carlos Ruiz",
  correo_asesor: "carlos@example.com",
  gestion: "RECA",
  estado: "En Proceso",
  profesional_asignado_id: 7,
};

describe("/api/empresas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(adminAuth);
  });

  it("returns 403 when the current user is not an Empresas admin", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autorizado." }, { status: 403 }),
    });

    const response = await GET(new Request("http://localhost/api/empresas"));

    expect(response.status).toBe(403);
    expect(mocks.listEmpresas).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no authenticated user", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autenticado." }, { status: 401 }),
    });

    const response = await GET(new Request("http://localhost/api/empresas"));

    expect(response.status).toBe(401);
    expect(mocks.listEmpresas).not.toHaveBeenCalled();
  });

  it("lists empresas with parsed query params", async () => {
    mocks.listEmpresas.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    });

    const response = await GET(
      new Request("http://localhost/api/empresas?q=acme&pageSize=50")
    );

    expect(response.status).toBe(200);
    expect(mocks.listEmpresas).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ q: "acme", pageSize: 50 }),
      })
    );
  });

  it("creates an empresa and records the admin actor", async () => {
    mocks.createEmpresa.mockResolvedValue({
      id: "empresa-1",
      nombre_empresa: "ACME SAS",
    });

    const response = await POST(
      new Request("http://localhost/api/empresas", {
        method: "POST",
        body: JSON.stringify({
          ...validEmpresaPayload,
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.createEmpresa).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          nombre_empresa: "Acme Sas",
          gestion: "RECA",
          estado: "En Proceso",
          telefono_empresa: "3001234567",
        }),
        actor: expect.objectContaining({
          userId: "auth-user-1",
          profesionalId: 7,
          nombre: "Sara Zambrano",
        }),
      })
    );
  });

  it("normalizes write payloads before calling the server layer", async () => {
    mocks.createEmpresa.mockResolvedValue({
      id: "empresa-1",
      nombre_empresa: "Acme Sas",
    });

    const response = await POST(
      new Request("http://localhost/api/empresas", {
        method: "POST",
        body: JSON.stringify({
          nombre_empresa: "  acme   sas  ",
          nit_empresa: "900.123.456 - 7",
          direccion_empresa: "calle 80",
          ciudad_empresa: "\u200bbogota   norte\u200b",
          sede_empresa: "principal",
          zona_empresa: "chapinero",
          responsable_visita: "sandra pachon",
          contacto_empresa: "sandra pachon",
          cargo: "gerente",
          telefono_empresa: "300 123 4567",
          correo_1: "sandra@reca.co",
          caja_compensacion: " no compensar ",
          asesor: "carlos ruiz",
          correo_asesor: "carlos@example.com",
          gestion: "reca",
          estado: " activa ",
          profesional_asignado_id: 7,
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.createEmpresa).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          nombre_empresa: "Acme Sas",
          nit_empresa: "900123456-7",
          ciudad_empresa: "Bogota Norte",
          direccion_empresa: "Calle 80",
          sede_empresa: "Principal",
          zona_empresa: "Chapinero",
          responsable_visita: "Sandra Pachon",
          telefono_empresa: "3001234567",
          caja_compensacion: "No Compensar",
          asesor: "Carlos Ruiz",
          gestion: "RECA",
          estado: "Activa",
        }),
      })
    );
  });

  it("returns 400 with field errors for missing required empresa fields", async () => {
    const response = await POST(
      new Request("http://localhost/api/empresas", {
        method: "POST",
        body: JSON.stringify({
          nombre_empresa: "ACME SAS",
          gestion: "RECA",
          estado: "En Proceso",
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.fieldErrors).toEqual(
      expect.objectContaining({
        nit_empresa: expect.arrayContaining(["El NIT es obligatorio."]),
        profesional_asignado_id: expect.arrayContaining([
          "Selecciona un profesional asignado.",
        ]),
      })
    );
    expect(mocks.createEmpresa).not.toHaveBeenCalled();
  });

  it("returns 400 for nit values with letters", async () => {
    const response = await POST(
      new Request("http://localhost/api/empresas", {
        method: "POST",
        body: JSON.stringify({
          ...validEmpresaPayload,
          nit_empresa: "900-ABC",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createEmpresa).not.toHaveBeenCalled();
  });
});
