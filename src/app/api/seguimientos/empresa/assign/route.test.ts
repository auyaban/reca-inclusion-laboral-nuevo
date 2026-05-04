import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveSeguimientosRouteActor: vi.fn(),
  getUsuarioRecaByCedula: vi.fn(),
  upsertUsuariosRecaRows: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/seguimientosRouteActor", () => ({
  resolveSeguimientosRouteActor: mocks.resolveSeguimientosRouteActor,
}));

vi.mock("@/lib/usuariosRecaServer", () => ({
  getUsuarioRecaByCedula: mocks.getUsuarioRecaByCedula,
  upsertUsuariosRecaRows: mocks.upsertUsuariosRecaRows,
}));

vi.mock("@/lib/usuariosReca", () => ({
  normalizeCedulaUsuario: (cedula: string) => cedula.trim(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { NextResponse } from "next/server";
import { PUT } from "@/app/api/seguimientos/empresa/assign/route";

function stubOkActor(userId = "user-1") {
  return {
    ok: true as const,
    userId,
  };
}

function stubForbiddenActor() {
  return {
    ok: false as const,
    response: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
  };
}

function assignRequest(body: Record<string, unknown>) {
  return new Request(
    "http://localhost/api/seguimientos/empresa/assign",
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
}

type EmpresaLookupRow = {
  id: string;
  nombre_empresa: string | null;
  nit_empresa: string | null;
  ciudad_empresa?: string | null;
  sede_empresa?: string | null;
  zona_empresa?: string | null;
};

function stubEmpresaLookup(rows: EmpresaLookupRow[] | string | null) {
  const data =
    typeof rows === "string"
      ? [{ id: "empresa-1", nombre_empresa: rows, nit_empresa: "900123456-1" }]
      : rows;
  let currentNit = "";
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((_field: string, value: string) => {
      currentNit = value;
      return chain;
    }),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn().mockImplementation(async () => ({
      data: (data ?? []).filter((row) => row.nit_empresa === currentNit),
      error: null,
    })),
    maybeSingle: vi.fn().mockImplementation(async () => {
      const matches = (data ?? []).filter((row) => row.nit_empresa === currentNit);
      return {
        data:
          matches.length === 1
            ? { nombre_empresa: matches[0]?.nombre_empresa ?? null }
            : null,
        error: matches.length > 1 ? { message: "multiple rows" } : null,
      };
    }),
  };
  mocks.createClient.mockResolvedValue({
    from: vi.fn(() => chain),
  });
}

describe("PUT /api/seguimientos/empresa/assign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSeguimientosRouteActor.mockResolvedValue(stubOkActor());
    stubEmpresaLookup("Empresa Uno SAS");
  });

  it("returns 403 when role is not allowed", async () => {
    mocks.resolveSeguimientosRouteActor.mockResolvedValue(stubForbiddenActor());

    const response = await PUT(
      assignRequest({
        cedula: "1001234567",
        nit_empresa: "900123456-1",
      })
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid payloads", async () => {
    const response = await PUT(assignRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      status: "error",
    });
  });

  it("returns 404 when the vinculado does not exist in usuarios_reca", async () => {
    mocks.getUsuarioRecaByCedula.mockResolvedValue(null);

    const response = await PUT(
      assignRequest({
        cedula: "1001234567",
        nit_empresa: "900123456-1",
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      status: "error",
      message:
        "No se encontró el vinculado en usuarios_reca. Créalo primero desde el registro de oferentes.",
    });
    expect(mocks.upsertUsuariosRecaRows).not.toHaveBeenCalled();
  });

  it("returns 409 when the vinculado already has another active empresa_nit populated", async () => {
    mocks.getUsuarioRecaByCedula.mockResolvedValue({
      cedula_usuario: "1001234567",
      empresa_nit: "900999999-9",
      empresa_nombre: "Otra Empresa SAS",
    });
    stubEmpresaLookup([
      {
        id: "empresa-1",
        nit_empresa: "900123456-1",
        nombre_empresa: "Empresa Uno SAS",
      },
      {
        id: "empresa-existing",
        nit_empresa: "900999999-9",
        nombre_empresa: "Otra Empresa SAS",
      },
    ]);

    const response = await PUT(
      assignRequest({
        cedula: "1001234567",
        nit_empresa: "900123456-1",
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      status: "error",
      message: "El vinculado ya tiene una empresa asignada.",
    });
    expect(mocks.upsertUsuariosRecaRows).not.toHaveBeenCalled();
  });

  it("returns 422 when the NIT does not match an active empresa", async () => {
    mocks.getUsuarioRecaByCedula.mockResolvedValue({
      cedula_usuario: "1001234567",
      empresa_nit: null,
      empresa_nombre: null,
    });
    stubEmpresaLookup([]);

    const response = await PUT(
      assignRequest({
        cedula: "1001234567",
        nit_empresa: "999999999-9",
      })
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      status: "error",
      message: "Empresa no encontrada. Verifica el NIT.",
    });
    expect(mocks.upsertUsuariosRecaRows).not.toHaveBeenCalled();
  });

  it("returns 200 and assigns empresa when vinculado exists without empresa", async () => {
    mocks.getUsuarioRecaByCedula.mockResolvedValue({
      cedula_usuario: "1001234567",
      empresa_nit: null,
      empresa_nombre: null,
    });
    stubEmpresaLookup([
      {
        id: "empresa-1",
        nit_empresa: "900123456-1",
        nombre_empresa: "Empresa Uno SAS",
      },
    ]);
    mocks.upsertUsuariosRecaRows.mockResolvedValue(1);

    const response = await PUT(
      assignRequest({
        cedula: "1001234567",
        nit_empresa: "900123456-1",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "assigned",
    });
    expect(mocks.upsertUsuariosRecaRows).toHaveBeenCalledWith([
      {
        cedula_usuario: "1001234567",
        empresa_nit: "900123456-1",
        empresa_nombre: "Empresa Uno SAS",
      },
    ]);
  });

  it("returns 200 when vinculado has empty empresa_nit string", async () => {
    mocks.getUsuarioRecaByCedula.mockResolvedValue({
      cedula_usuario: "1001234567",
      empresa_nit: "",
      empresa_nombre: "",
    });
    stubEmpresaLookup([
      {
        id: "empresa-1",
        nit_empresa: "800555123-0",
        nombre_empresa: "Nueva Empresa Ltda",
      },
    ]);
    mocks.upsertUsuariosRecaRows.mockResolvedValue(1);

    const response = await PUT(
      assignRequest({
        cedula: "1001234567",
        nit_empresa: "800555123-0",
      })
    );

    expect(response.status).toBe(200);
  });

  it("returns 200 and updates empresa_nombre when the same NIT has duplicate active options", async () => {
    mocks.getUsuarioRecaByCedula.mockResolvedValue({
      cedula_usuario: "1001234567",
      empresa_nit: "900123456-1",
      empresa_nombre: "Empresa Anterior SAS",
    });
    stubEmpresaLookup([
      {
        id: "empresa-1",
        nit_empresa: "900123456-1",
        nombre_empresa: "Empresa Uno SAS",
      },
      {
        id: "empresa-2",
        nit_empresa: "900123456-1",
        nombre_empresa: "Empresa Dos SAS",
      },
    ]);
    mocks.upsertUsuariosRecaRows.mockResolvedValue(1);

    const response = await PUT(
      assignRequest({
        cedula: "1001234567",
        nit_empresa: "900123456-1",
        empresa_nombre: "Empresa Dos SAS",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "assigned",
    });
    expect(mocks.upsertUsuariosRecaRows).toHaveBeenCalledWith([
      {
        cedula_usuario: "1001234567",
        empresa_nit: "900123456-1",
        empresa_nombre: "Empresa Dos SAS",
      },
    ]);
  });

  it("returns 422 when empresa_nombre is not in the active catalog for that NIT", async () => {
    mocks.getUsuarioRecaByCedula.mockResolvedValue({
      cedula_usuario: "1001234567",
      empresa_nit: "900123456-1",
      empresa_nombre: "Empresa Uno SAS",
    });
    stubEmpresaLookup([
      {
        id: "empresa-1",
        nit_empresa: "900123456-1",
        nombre_empresa: "Empresa Uno SAS",
      },
    ]);

    const response = await PUT(
      assignRequest({
        cedula: "1001234567",
        nit_empresa: "900123456-1",
        empresa_nombre: "Empresa Fantasma SAS",
      })
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      status: "error",
      message: "La empresa seleccionada no pertenece al catalogo activo del NIT.",
    });
    expect(mocks.upsertUsuariosRecaRows).not.toHaveBeenCalled();
  });

  it("allows replacing an existing NIT that has no active catalog rows", async () => {
    mocks.getUsuarioRecaByCedula.mockResolvedValue({
      cedula_usuario: "1001234567",
      empresa_nit: "900000000",
      empresa_nombre: "Empresa Inactiva SAS",
    });
    stubEmpresaLookup([
      {
        id: "empresa-1",
        nit_empresa: "900123456-1",
        nombre_empresa: "Empresa Uno SAS",
      },
    ]);
    mocks.upsertUsuariosRecaRows.mockResolvedValue(1);

    const response = await PUT(
      assignRequest({
        cedula: "1001234567",
        nit_empresa: "900123456-1",
        empresa_nombre: "Empresa Uno SAS",
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.upsertUsuariosRecaRows).toHaveBeenCalledWith([
      {
        cedula_usuario: "1001234567",
        empresa_nit: "900123456-1",
        empresa_nombre: "Empresa Uno SAS",
      },
    ]);
  });
});
