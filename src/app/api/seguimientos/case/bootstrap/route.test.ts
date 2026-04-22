import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2E_AUTH_BYPASS_COOKIE,
  E2E_AUTH_BYPASS_ENV,
} from "@/lib/auth/e2eBypass";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  bootstrapSeguimientosCase: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/seguimientosCase", () => ({
  bootstrapSeguimientosCase: mocks.bootstrapSeguimientosCase,
}));

import { POST } from "@/app/api/seguimientos/case/bootstrap/route";

describe("POST /api/seguimientos/case/bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: mocks.getUser,
      },
    });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/bootstrap", {
        method: "POST",
        body: JSON.stringify({ cedula: "1001234567" }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "No autenticado",
    });
    expect(mocks.bootstrapSeguimientosCase).not.toHaveBeenCalled();
  });

  it("allows bootstrap through the server-side E2E auth bypass cookie", async () => {
    vi.stubEnv(E2E_AUTH_BYPASS_ENV, "1");
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
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
