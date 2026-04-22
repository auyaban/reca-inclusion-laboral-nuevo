import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2E_AUTH_BYPASS_COOKIE,
  E2E_AUTH_BYPASS_ENV,
} from "@/lib/auth/e2eBypass";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  grantSeguimientosStageOverride: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/seguimientosCase", () => ({
  grantSeguimientosStageOverride: mocks.grantSeguimientosStageOverride,
}));

import { POST } from "@/app/api/seguimientos/case/[caseId]/stages/override/route";

describe("POST /api/seguimientos/case/[caseId]/stages/override", () => {
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
      error: "No autenticado",
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
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
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
