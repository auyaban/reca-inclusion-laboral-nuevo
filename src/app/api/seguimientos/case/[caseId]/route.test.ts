import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2E_AUTH_BYPASS_COOKIE,
  E2E_AUTH_BYPASS_ENV,
} from "@/lib/auth/e2eBypass";
import { SeguimientosServerError } from "@/lib/seguimientosServerErrors";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getSeguimientosCaseHydrationByCaseId: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/seguimientosCase", () => ({
  getSeguimientosCaseHydrationByCaseId: mocks.getSeguimientosCaseHydrationByCaseId,
}));

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe("GET /api/seguimientos/case/[caseId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
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
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { GET } = await import("@/app/api/seguimientos/case/[caseId]/route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ caseId: "sheet-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "No autenticado",
    });
    expect(mocks.getSeguimientosCaseHydrationByCaseId).not.toHaveBeenCalled();
  });

  it("allows retrieval through the server-side E2E auth bypass cookie", async () => {
    vi.stubEnv(E2E_AUTH_BYPASS_ENV, "1");
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
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
