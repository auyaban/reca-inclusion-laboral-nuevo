import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  E2E_AUTH_BYPASS_COOKIE,
  E2E_AUTH_BYPASS_ENV,
} from "@/lib/auth/e2eBypass";
import {
  createEmptySeguimientosBaseValues,
  createEmptySeguimientosFollowupValues,
} from "@/lib/seguimientos";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  saveSeguimientosDirtyStages: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/seguimientosCase", () => ({
  saveSeguimientosDirtyStages: mocks.saveSeguimientosDirtyStages,
}));

import { POST } from "@/app/api/seguimientos/case/[caseId]/stages/save/route";

describe("POST /api/seguimientos/case/[caseId]/stages/save", () => {
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
      new Request("http://localhost/api/seguimientos/case/sheet-1/stages/save", {
        method: "POST",
        body: JSON.stringify({
          activeStageId: "followup_1",
          companyType: "no_compensar",
          baseValues: createEmptySeguimientosBaseValues(),
          followupValuesByIndex: {
            1: createEmptySeguimientosFollowupValues(1),
          },
          dirtyStageIds: ["followup_1"],
        }),
      }),
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
    mocks.saveSeguimientosDirtyStages.mockResolvedValue({
      status: "ready",
      savedAt: "2026-04-21T12:00:00.000Z",
      savedStageIds: ["followup_1", "base_process"],
      hydration: {
        caseMeta: { caseId: "sheet-1" },
      },
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stages/save", {
        method: "POST",
        headers: {
          cookie: `${E2E_AUTH_BYPASS_COOKIE}=1`,
        },
        body: JSON.stringify({
          activeStageId: "followup_1",
          companyType: "no_compensar",
          baseValues: createEmptySeguimientosBaseValues(),
          followupValuesByIndex: {
            1: createEmptySeguimientosFollowupValues(1),
          },
          dirtyStageIds: ["followup_1"],
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      savedAt: "2026-04-21T12:00:00.000Z",
      savedStageIds: ["followup_1", "base_process"],
      hydration: {
        caseMeta: { caseId: "sheet-1" },
      },
    });
  });

  it("returns 400 for invalid payloads", async () => {
    const baseValues = createEmptySeguimientosBaseValues();
    baseValues.fecha_fin_contrato = "2026/04/23";

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stages/save", {
        method: "POST",
        body: JSON.stringify({
          activeStageId: "followup_1",
          companyType: "no_compensar",
          baseValues,
          followupValuesByIndex: {
            1: createEmptySeguimientosFollowupValues(1),
          },
          dirtyStageIds: ["followup_1"],
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      status: "error",
      message: "Usa una fecha valida.",
      fieldPath: "baseValues.fecha_fin_contrato",
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: "baseValues.fecha_fin_contrato",
          message: "Usa una fecha valida.",
        }),
      ]),
    });
  });

  it("returns 400 when the server requires an override grant", async () => {
    mocks.saveSeguimientosDirtyStages.mockResolvedValue({
      status: "error",
      code: "override_required",
      message: "Override requerido.",
      missingOverrideStageIds: ["followup_1"],
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stages/save", {
        method: "POST",
        body: JSON.stringify({
          activeStageId: "followup_1",
          companyType: "no_compensar",
          baseValues: createEmptySeguimientosBaseValues(),
          followupValuesByIndex: {
            1: createEmptySeguimientosFollowupValues(1),
          },
          dirtyStageIds: ["followup_1"],
          overrideGrants: [],
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      code: "override_required",
      message: "Override requerido.",
      missingOverrideStageIds: ["followup_1"],
    });
  });

  it("returns 400 when the server reports an expired override grant", async () => {
    mocks.saveSeguimientosDirtyStages.mockResolvedValue({
      status: "error",
      code: "override_expired",
      message: "Override vencido.",
      expiredOverrideStageIds: ["base_process"],
      missingOverrideStageIds: ["followup_1"],
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stages/save", {
        method: "POST",
        body: JSON.stringify({
          activeStageId: "followup_1",
          companyType: "no_compensar",
          baseValues: createEmptySeguimientosBaseValues(),
          followupValuesByIndex: {
            1: createEmptySeguimientosFollowupValues(1),
          },
          dirtyStageIds: ["base_process", "followup_1"],
          overrideGrants: [
            {
              stageId: "base_process",
              token: "expired-base-grant",
            },
          ],
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
      missingOverrideStageIds: ["followup_1"],
    });
  });

  it("returns 400 when the ficha inicial is incomplete for a followup save", async () => {
    mocks.saveSeguimientosDirtyStages.mockResolvedValue({
      status: "error",
      code: "base_stage_incomplete",
      message: "La ficha inicial debe estar completa antes de guardar seguimientos.",
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stages/save", {
        method: "POST",
        body: JSON.stringify({
          activeStageId: "followup_1",
          companyType: "no_compensar",
          baseValues: createEmptySeguimientosBaseValues(),
          followupValuesByIndex: {
            1: createEmptySeguimientosFollowupValues(1),
          },
          dirtyStageIds: ["followup_1"],
          overrideGrants: [],
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      code: "base_stage_incomplete",
      message: "La ficha inicial debe estar completa antes de guardar seguimientos.",
    });
  });

  it("returns 200 for written_needs_reload after coordinated save", async () => {
    mocks.saveSeguimientosDirtyStages.mockResolvedValue({
      status: "written_needs_reload",
      savedAt: "2026-04-21T12:00:00.000Z",
      savedStageIds: ["followup_1"],
      message: "Recarga antes de continuar.",
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stages/save", {
        method: "POST",
        body: JSON.stringify({
          activeStageId: "followup_1",
          companyType: "no_compensar",
          baseValues: createEmptySeguimientosBaseValues(),
          followupValuesByIndex: {
            1: createEmptySeguimientosFollowupValues(1),
          },
          dirtyStageIds: ["followup_1"],
          overrideGrants: [],
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "written_needs_reload",
      savedAt: "2026-04-21T12:00:00.000Z",
      savedStageIds: ["followup_1"],
      message: "Recarga antes de continuar.",
    });
  });

  it("returns 409 for stale case saves and forwards expectedCaseUpdatedAt", async () => {
    mocks.saveSeguimientosDirtyStages.mockResolvedValue({
      status: "error",
      code: "case_conflict",
      message:
        "Este caso cambio en otra pestaña o sesion. Recargalo antes de guardar.",
      currentCaseUpdatedAt: "2026-04-22T10:05:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost/api/seguimientos/case/sheet-1/stages/save", {
        method: "POST",
        body: JSON.stringify({
          activeStageId: "followup_1",
          companyType: "no_compensar",
          baseValues: createEmptySeguimientosBaseValues(),
          followupValuesByIndex: {
            1: createEmptySeguimientosFollowupValues(1),
          },
          dirtyStageIds: ["followup_1"],
          overrideGrants: [],
          expectedCaseUpdatedAt: "2026-04-22T10:00:00.000Z",
        }),
      }),
      { params: Promise.resolve({ caseId: "sheet-1" }) }
    );

    expect(mocks.saveSeguimientosDirtyStages).toHaveBeenCalledWith(
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
