import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2E_AUTH_BYPASS_COOKIE,
  E2E_AUTH_BYPASS_ENV,
} from "@/lib/auth/e2eBypass";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  refreshSeguimientosResultSummary: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/seguimientosCase", () => ({
  refreshSeguimientosResultSummary: mocks.refreshSeguimientosResultSummary,
}));

import { POST } from "@/app/api/seguimientos/case/[caseId]/result/refresh/route";

describe("POST /api/seguimientos/case/[caseId]/result/refresh", () => {
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

  it("returns 401 when unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await POST(
      new Request(
        "http://localhost/api/seguimientos/case/sheet-1/result/refresh",
        {
          method: "POST",
        }
      ),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "No autenticado",
    });
  });

  it("allows the E2E auth bypass cookie", async () => {
    vi.stubEnv(E2E_AUTH_BYPASS_ENV, "1");
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mocks.refreshSeguimientosResultSummary.mockResolvedValue({
      status: "ready",
      refreshedAt: "2026-04-21T12:00:00.000Z",
      hydration: {
        caseMeta: { caseId: "sheet-1" },
        summary: {
          formulaIntegrity: "healthy",
        },
      },
    });

    const response = await POST(
      new Request(
        "http://localhost/api/seguimientos/case/sheet-1/result/refresh",
        {
          method: "POST",
          headers: {
            cookie: `${E2E_AUTH_BYPASS_COOKIE}=1`,
          },
        }
      ),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      refreshedAt: "2026-04-21T12:00:00.000Z",
      hydration: {
        caseMeta: { caseId: "sheet-1" },
        summary: {
          formulaIntegrity: "healthy",
        },
      },
    });
  });
});
