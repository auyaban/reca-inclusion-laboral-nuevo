import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2E_AUTH_BYPASS_COOKIE,
  E2E_AUTH_BYPASS_ENV,
} from "@/lib/auth/e2eBypass";
import { SeguimientosServerError } from "@/lib/seguimientosServerErrors";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getSeguimientosCaseHydrationByCaseId: vi.fn(),
  requireAppRole: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/seguimientosCase", () => ({
  getSeguimientosCaseHydrationByCaseId: mocks.getSeguimientosCaseHydrationByCaseId,
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

import { NextResponse } from "next/server";

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

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe("GET /api/seguimientos/case/[caseId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.createClient.mockResolvedValue({});
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization());
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false as const,
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    });

    const { GET } = await import("@/app/api/seguimientos/case/[caseId]/route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ caseId: "sheet-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "No autenticado.",
    });
    expect(mocks.getSeguimientosCaseHydrationByCaseId).not.toHaveBeenCalled();
  });

  it("allows retrieval through the server-side E2E auth bypass cookie", async () => {
    vi.stubEnv(E2E_AUTH_BYPASS_ENV, "1");
    mocks.requireAppRole.mockResolvedValue(
      stubOkAuthorization("e2e-bypass-user")
    );
    mocks.getSeguimientosCaseHydrationByCaseId.mockResolvedValue({
      caseMeta: { caseId: "sheet-1" },
      workflow: { activeStageId: "base_process" },
    });

    const { GET } = await import("@/app/api/seguimientos/case/[caseId]/route");
    const response = await GET(
      new Request("http://localhost", {
        headers: {
          cookie: `${E2E_AUTH_BYPASS_COOKIE}=1`,
        },
      }),
      {
        params: Promise.resolve({ caseId: "sheet-1" }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      hydration: {
        caseMeta: { caseId: "sheet-1" },
        workflow: { activeStageId: "base_process" },
      },
    });
  });

  it("returns 500 when the case cannot be reconstructed", async () => {
    mocks.getSeguimientosCaseHydrationByCaseId.mockRejectedValue(
      new Error("drive-down")
    );

    const { GET } = await import("@/app/api/seguimientos/case/[caseId]/route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ caseId: "sheet-1" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      message: "No se pudo reconstruir el caso solicitado.",
    });
  });

  it("returns 409 when the case requires reclaim by cedula", async () => {
    mocks.getSeguimientosCaseHydrationByCaseId.mockRejectedValue(
      new SeguimientosServerError(
        "case_reclaim_required",
        "Reclaim required",
        409
      )
    );

    const { GET } = await import("@/app/api/seguimientos/case/[caseId]/route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ caseId: "sheet-1" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      code: "case_reclaim_required",
      message: "Reclaim required",
    });
  });
});
