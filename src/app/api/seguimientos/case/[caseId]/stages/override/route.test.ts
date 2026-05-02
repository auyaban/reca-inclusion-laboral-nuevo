import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2E_AUTH_BYPASS_COOKIE,
  E2E_AUTH_BYPASS_ENV,
} from "@/lib/auth/e2eBypass";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  grantSeguimientosStageOverride: vi.fn(),
  requireAppRole: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/seguimientosCase", () => ({
  grantSeguimientosStageOverride: mocks.grantSeguimientosStageOverride,
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

import { NextResponse } from "next/server";
import { POST } from "@/app/api/seguimientos/case/[caseId]/stages/override/route";

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

describe("POST /api/seguimientos/case/[caseId]/stages/override", () => {
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
      new Request("http://localhost/api/seguimientos/case/sheet-1/stages/override", {
        method: "POST",
        body: JSON.stringify({
          stageIds: ["followup_1"],
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "No autenticado.",
    });
  });

  it("returns 400 for invalid payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stages/override", {
        method: "POST",
        body: JSON.stringify({
          stageIds: ["final_result"],
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      status: "error",
    });
  });

  it("allows the E2E auth bypass cookie", async () => {
    vi.stubEnv(E2E_AUTH_BYPASS_ENV, "1");
    mocks.requireAppRole.mockResolvedValue(
      stubOkAuthorization("e2e-bypass-user")
    );
    mocks.grantSeguimientosStageOverride.mockResolvedValue({
      status: "ready",
      grants: [
        {
          stageId: "followup_1",
          token: "token-followup-1",
          expiresAt: "2026-04-21T12:05:00.000Z",
        },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stages/override", {
        method: "POST",
        headers: {
          cookie: `${E2E_AUTH_BYPASS_COOKIE}=1`,
        },
        body: JSON.stringify({
          stageIds: ["followup_1"],
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      grants: [
        {
          stageId: "followup_1",
          token: "token-followup-1",
          expiresAt: "2026-04-21T12:05:00.000Z",
        },
      ],
    });
  });
});
