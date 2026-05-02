import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2E_AUTH_BYPASS_COOKIE,
  E2E_AUTH_BYPASS_ENV,
} from "@/lib/auth/e2eBypass";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  refreshSeguimientosResultSummary: vi.fn(),
  requireAppRole: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/seguimientosCase", () => ({
  refreshSeguimientosResultSummary: mocks.refreshSeguimientosResultSummary,
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

import { NextResponse } from "next/server";
import { POST } from "@/app/api/seguimientos/case/[caseId]/result/refresh/route";

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

describe("POST /api/seguimientos/case/[caseId]/result/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({});
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.requireAppRole.mockResolvedValue({
      ok: false as const,
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
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
      error: "No autenticado.",
    });
  });

  it("allows the E2E auth bypass cookie", async () => {
    vi.stubEnv(E2E_AUTH_BYPASS_ENV, "1");
    mocks.requireAppRole.mockResolvedValue(
      stubOkAuthorization("e2e-bypass-user")
    );
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

  it("returns 200 for written_needs_reload after repaired summary writes", async () => {
    mocks.refreshSeguimientosResultSummary.mockResolvedValue({
      status: "written_needs_reload",
      caseId: "sheet-1",
      message:
        "El consolidado se reparo en Google Sheets. Recarga Seguimientos antes de continuar.",
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

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "written_needs_reload",
      caseId: "sheet-1",
      message:
        "El consolidado se reparo en Google Sheets. Recarga Seguimientos antes de continuar.",
    });
  });
});
