import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2E_AUTH_BYPASS_COOKIE,
  E2E_AUTH_BYPASS_ENV,
} from "@/lib/auth/e2eBypass";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  bootstrapSeguimientosCase: vi.fn(),
  requireAppRole: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/seguimientosCase", () => ({
  bootstrapSeguimientosCase: mocks.bootstrapSeguimientosCase,
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

import { NextResponse } from "next/server";
import { POST } from "@/app/api/seguimientos/case/bootstrap/route";

function stubOkAuthorization(userId = "user-1") {
  return {
    ok: true as const,
    context: {
      user: { id: userId, email: null },
      profile: {
        id: 1,
        authUserId: userId,
        displayName: "Test",
        usuarioLogin: null,
        email: null,
        authPasswordTemp: false,
      },
      roles: ["inclusion_empresas_admin"],
    },
  };
}

describe("POST /api/seguimientos/case/bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({});
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false as const,
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/bootstrap", {
        method: "POST",
        body: JSON.stringify({ cedula: "1001234567" }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "No autenticado.",
    });
    expect(mocks.bootstrapSeguimientosCase).not.toHaveBeenCalled();
  });

  it("allows bootstrap through the server-side E2E auth bypass cookie", async () => {
    vi.stubEnv(E2E_AUTH_BYPASS_ENV, "1");
    mocks.requireAppRole.mockResolvedValue(
      stubOkAuthorization("e2e-bypass-user")
    );
    mocks.bootstrapSeguimientosCase.mockResolvedValue({
      status: "ready",
      hydration: {
        caseMeta: { caseId: "sheet-1" },
      },
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/bootstrap", {
        method: "POST",
        headers: {
          cookie: `${E2E_AUTH_BYPASS_COOKIE}=1`,
        },
        body: JSON.stringify({ cedula: "1001234567" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      hydration: {
        caseMeta: { caseId: "sheet-1" },
      },
    });
  });

  it("returns 403 when role is ods_operador", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false as const,
      response: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/bootstrap", {
        method: "POST",
        body: JSON.stringify({ cedula: "1001234567" }),
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "No autorizado.",
    });
  });

  it("returns 200 for ready bootstrap results", async () => {
    mocks.bootstrapSeguimientosCase.mockResolvedValue({
      status: "ready",
      hydration: {
        caseMeta: {
          caseId: "sheet-1",
          updatedAt: "2026-05-04T10:00:00.000Z",
        },
        empresaSnapshot: {
          id: "empresa-1",
          nombre_empresa: "Empresa Uno SAS",
          nit_empresa: "900123456",
        },
      },
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/bootstrap", {
        method: "POST",
        body: JSON.stringify({ cedula: "1001234567" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ready",
      hydration: {
        caseMeta: {
          caseId: "sheet-1",
          updatedAt: "2026-05-04T10:00:00.000Z",
        },
        empresaSnapshot: {
          id: "empresa-1",
          nombre_empresa: "Empresa Uno SAS",
          nit_empresa: "900123456",
        },
      },
    });
  });

  it("returns 400 for invalid payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/bootstrap", {
        method: "POST",
        body: JSON.stringify({ cedula: "" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      message: "La cédula es obligatoria.",
    });
  });

  it("returns 409 for resolution_required results", async () => {
    mocks.bootstrapSeguimientosCase.mockResolvedValue({
      status: "resolution_required",
      reason: "company_type",
      context: {
        empresa_nombre: "Empresa Uno SAS",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/bootstrap", {
        method: "POST",
        body: JSON.stringify({ cedula: "1001234567" }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      status: "resolution_required",
      reason: "company_type",
      context: {
        empresa_nombre: "Empresa Uno SAS",
      },
    });
  });

  it("returns 200 for empresa assignment bootstrap results", async () => {
    mocks.bootstrapSeguimientosCase.mockResolvedValue({
      status: "requires_empresa_assignment",
      cedula: "1001234567",
      nombreVinculado: "Ana Perez",
      initialNit: "900000000",
      message:
        "El NIT 900000000 registrado en el vinculado no esta en el catalogo activo.",
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/bootstrap", {
        method: "POST",
        body: JSON.stringify({ cedula: "1001234567" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "requires_empresa_assignment",
      cedula: "1001234567",
      initialNit: "900000000",
    });
  });

  it("returns 200 for duplicate empresa disambiguation bootstrap results", async () => {
    mocks.bootstrapSeguimientosCase.mockResolvedValue({
      status: "requires_disambiguation",
      cedula: "1001234567",
      nombreVinculado: "Ana Perez",
      nit: "900123456",
      options: [
        {
          id: "empresa-1",
          nombre_empresa: "Empresa Uno SAS",
          nit_empresa: "900123456",
        },
      ],
      preselectedEmpresaId: "empresa-1",
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/bootstrap", {
        method: "POST",
        body: JSON.stringify({ cedula: "1001234567" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "requires_disambiguation",
      cedula: "1001234567",
      nit: "900123456",
      preselectedEmpresaId: "empresa-1",
    });
  });

  it("maps bootstrap_in_progress to 409", async () => {
    mocks.bootstrapSeguimientosCase.mockResolvedValue({
      status: "error",
      code: "bootstrap_in_progress",
      message: "busy",
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/bootstrap", {
        method: "POST",
        body: JSON.stringify({ cedula: "1001234567" }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      code: "bootstrap_in_progress",
      message: "busy",
    });
  });

  it("maps google_storage_quota_exceeded to 503", async () => {
    mocks.bootstrapSeguimientosCase.mockResolvedValue({
      status: "error",
      code: "google_storage_quota_exceeded",
      message: "quota",
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/bootstrap", {
        method: "POST",
        body: JSON.stringify({ cedula: "1001234567" }),
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      code: "google_storage_quota_exceeded",
      message: "quota",
    });
  });

  it("maps case_bootstrap_storage_failed to 502", async () => {
    mocks.bootstrapSeguimientosCase.mockResolvedValue({
      status: "error",
      code: "case_bootstrap_storage_failed",
      message: "storage",
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/bootstrap", {
        method: "POST",
        body: JSON.stringify({ cedula: "1001234567" }),
      })
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      code: "case_bootstrap_storage_failed",
      message: "storage",
    });
  });
});
