import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2E_AUTH_BYPASS_COOKIE,
  E2E_AUTH_BYPASS_ENV,
} from "@/lib/auth/e2eBypass";
import { createEmptySeguimientosBaseValues } from "@/lib/seguimientos";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  saveSeguimientosBaseStage: vi.fn(),
  requireAppRole: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/seguimientosCase", () => ({
  saveSeguimientosBaseStage: mocks.saveSeguimientosBaseStage,
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

import { NextResponse } from "next/server";
import { POST } from "@/app/api/seguimientos/case/[caseId]/stage/base/route";

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

describe("POST /api/seguimientos/case/[caseId]/stage/base", () => {
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
      new Request("http://localhost/api/seguimientos/case/sheet-1/stage/base", {
        method: "POST",
        body: JSON.stringify({
          activeStageId: "base_process",
          baseValues: createEmptySeguimientosBaseValues(),
        }),
      }),
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
    mocks.saveSeguimientosBaseStage.mockResolvedValue({
      status: "ready",
      savedAt: "2026-04-21T12:00:00.000Z",
      hydration: {
        caseMeta: { caseId: "sheet-1" },
      },
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stage/base", {
        method: "POST",
        headers: {
          cookie: `${E2E_AUTH_BYPASS_COOKIE}=1`,
        },
        body: JSON.stringify({
          activeStageId: "base_process",
          baseValues: createEmptySeguimientosBaseValues(),
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      savedAt: "2026-04-21T12:00:00.000Z",
      hydration: {
        caseMeta: { caseId: "sheet-1" },
      },
    });
  });

  it("returns 400 for invalid payloads", async () => {
    const baseValues = createEmptySeguimientosBaseValues();
    baseValues.fecha_fin_contrato = "2026/04/23";

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stage/base", {
        method: "POST",
        body: JSON.stringify({
          activeStageId: "base_process",
          baseValues,
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      message: "Usa una fecha valida.",
      fieldPath: "baseValues.fecha_fin_contrato",
      issues: [
        {
          path: "baseValues.fecha_fin_contrato",
          message: "Usa una fecha valida.",
        },
      ],
    });
  });

  it("returns 200 for written_needs_reload after a successful write", async () => {
    mocks.saveSeguimientosBaseStage.mockResolvedValue({
      status: "written_needs_reload",
      savedAt: "2026-04-21T12:00:00.000Z",
      savedStageIds: ["base_process"],
      message: "Recarga antes de continuar.",
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stage/base", {
        method: "POST",
        body: JSON.stringify({
          activeStageId: "base_process",
          baseValues: createEmptySeguimientosBaseValues(),
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "written_needs_reload",
      savedAt: "2026-04-21T12:00:00.000Z",
      savedStageIds: ["base_process"],
      message: "Recarga antes de continuar.",
    });
  });

  it("returns 400 when the server reports an expired override grant", async () => {
    mocks.saveSeguimientosBaseStage.mockResolvedValue({
      status: "error",
      code: "override_expired",
      message: "Override vencido.",
      expiredOverrideStageIds: ["base_process"],
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stage/base", {
        method: "POST",
        body: JSON.stringify({
          activeStageId: "base_process",
          baseValues: createEmptySeguimientosBaseValues(),
          overrideGrant: {
            stageId: "base_process",
            token: "expired-base-grant",
          },
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      code: "override_expired",
      message: "Override vencido.",
      expiredOverrideStageIds: ["base_process"],
    });
  });

  it("returns 409 when the case changed in another session and forwards expectedCaseUpdatedAt", async () => {
    mocks.saveSeguimientosBaseStage.mockResolvedValue({
      status: "error",
      code: "case_conflict",
      message:
        "Este caso cambio en otra pestaña o sesion. Recargalo antes de guardar.",
      currentCaseUpdatedAt: "2026-04-22T10:05:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stage/base", {
        method: "POST",
        body: JSON.stringify({
          activeStageId: "base_process",
          baseValues: createEmptySeguimientosBaseValues(),
          expectedCaseUpdatedAt: "2026-04-22T10:00:00.000Z",
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(mocks.saveSeguimientosBaseStage).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "sheet-1",
        userId: "user-1",
        expectedCaseUpdatedAt: "2026-04-22T10:00:00.000Z",
      })
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      code: "case_conflict",
      message:
        "Este caso cambio en otra pestaña o sesion. Recargalo antes de guardar.",
      currentCaseUpdatedAt: "2026-04-22T10:05:00.000Z",
    });
  });
});
