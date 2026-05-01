import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAppRole: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { NextResponse } from "next/server";
import { resolveSeguimientosRouteActor } from "@/lib/seguimientosRouteActor";
import { POST as BootstrapPOST } from "@/app/api/seguimientos/case/bootstrap/route";
import { GET as CaseGET } from "@/app/api/seguimientos/case/[caseId]/route";
import { POST as BaseStagePOST } from "@/app/api/seguimientos/case/[caseId]/stage/base/route";
import { POST as StagesSavePOST } from "@/app/api/seguimientos/case/[caseId]/stages/save/route";
import { POST as StagesOverridePOST } from "@/app/api/seguimientos/case/[caseId]/stages/override/route";
import { POST as ResultRefreshPOST } from "@/app/api/seguimientos/case/[caseId]/result/refresh/route";
import { POST as PdfExportPOST } from "@/app/api/seguimientos/case/[caseId]/pdf/export/route";

function stubOkAuthorization(userId = "user-1", role: "inclusion_empresas_admin" | "inclusion_empresas_profesional" = "inclusion_empresas_admin") {
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
      roles: [role] as const,
    },
  };
}

function stubForbiddenAuthorization() {
  return {
    ok: false as const,
    response: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
  };
}

function stubUnauthenticatedAuthorization() {
  return {
    ok: false as const,
    response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
  };
}

const ALLOWED_ROLES = [
  "inclusion_empresas_admin",
  "inclusion_empresas_profesional",
] as const;
const FORBIDDEN_ROLES = ["ods_operador"] as const;

function authWithRole(role: string) {
  return {
    ...stubOkAuthorization(),
    context: {
      ...stubOkAuthorization().context,
      roles: [role] as unknown as readonly ("inclusion_empresas_admin" | "inclusion_empresas_profesional" | "ods_operador")[],
    },
  };
}

function jsonPost(body: unknown) {
  return new Request("http://localhost/api/seguimientos/case/bootstrap", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function emptyBodyPost() {
  return new Request("http://localhost/api/seguimientos/case/bootstrap", {
    method: "POST",
    body: "{}",
  });
}

describe("resolveSeguimientosRouteActor", () => {
  it("returns ok with userId for inclusion_empresas_admin", async () => {
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization("admin-1"));

    const actor = await resolveSeguimientosRouteActor(
      new Request("http://localhost"),
      {}
    );

    expect(actor.ok).toBe(true);
    if (actor.ok) {
      expect(actor.userId).toBe("admin-1");
    }
    expect(mocks.requireAppRole).toHaveBeenCalledWith([
      "inclusion_empresas_admin",
      "inclusion_empresas_profesional",
    ]);
  });

  it("returns ok with userId for inclusion_empresas_profesional", async () => {
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization("prof-1", "inclusion_empresas_profesional"));

    const actor = await resolveSeguimientosRouteActor(
      new Request("http://localhost"),
      {}
    );

    expect(actor.ok).toBe(true);
    if (actor.ok) {
      expect(actor.userId).toBe("prof-1");
    }
  });

  it("returns not ok with 403 for ods_operador", async () => {
    mocks.requireAppRole.mockResolvedValue(stubForbiddenAuthorization());

    const actor = await resolveSeguimientosRouteActor(
      new Request("http://localhost"),
      {}
    );

    expect(actor.ok).toBe(false);
    if (!actor.ok) {
      expect(actor.response.status).toBe(403);
    }
  });
});

describe("POST /api/seguimientos/case/bootstrap", () => {
  it("returns 403 when role is ods_operador", async () => {
    mocks.requireAppRole.mockResolvedValue(stubForbiddenAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await BootstrapPOST(emptyBodyPost());

    expect(response.status).toBe(403);
  });

  it("returns not-403/401 when role is inclusion_empresas_admin", async () => {
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await BootstrapPOST(emptyBodyPost());

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });

  it("returns not-403/401 when role is inclusion_empresas_profesional", async () => {
    mocks.requireAppRole.mockResolvedValue(
      stubOkAuthorization("user-1", "inclusion_empresas_profesional")
    );
    mocks.createClient.mockResolvedValue({});

    const response = await BootstrapPOST(emptyBodyPost());

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });
});

function stubCaseParams() {
  return Promise.resolve({ caseId: "sheet-1" });
}

describe("GET /api/seguimientos/case/[caseId]", () => {
  it("returns 403 when role is ods_operador", async () => {
    mocks.requireAppRole.mockResolvedValue(stubForbiddenAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await CaseGET(
      emptyBodyPost(),
      { params: stubCaseParams() }
    );

    expect(response.status).toBe(403);
  });

  it("returns not-403/401 when role is inclusion_empresas_admin", async () => {
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await CaseGET(
      emptyBodyPost(),
      { params: stubCaseParams() }
    );

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });

  it("returns not-403/401 when role is inclusion_empresas_profesional", async () => {
    mocks.requireAppRole.mockResolvedValue(
      stubOkAuthorization("user-1", "inclusion_empresas_profesional")
    );
    mocks.createClient.mockResolvedValue({});

    const response = await CaseGET(
      emptyBodyPost(),
      { params: stubCaseParams() }
    );

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });
});

describe("POST /api/seguimientos/case/[caseId]/stage/base", () => {
  it("returns 403 when role is ods_operador", async () => {
    mocks.requireAppRole.mockResolvedValue(stubForbiddenAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await BaseStagePOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).toBe(403);
  });

  it("returns not-403/401 when role is inclusion_empresas_admin", async () => {
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await BaseStagePOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });

  it("returns not-403/401 when role is inclusion_empresas_profesional", async () => {
    mocks.requireAppRole.mockResolvedValue(
      stubOkAuthorization("user-1", "inclusion_empresas_profesional")
    );
    mocks.createClient.mockResolvedValue({});

    const response = await BaseStagePOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });
});

describe("POST /api/seguimientos/case/[caseId]/stages/save", () => {
  it("returns 403 when role is ods_operador", async () => {
    mocks.requireAppRole.mockResolvedValue(stubForbiddenAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await StagesSavePOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).toBe(403);
  });

  it("returns not-403/401 when role is inclusion_empresas_admin", async () => {
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await StagesSavePOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });

  it("returns not-403/401 when role is inclusion_empresas_profesional", async () => {
    mocks.requireAppRole.mockResolvedValue(
      stubOkAuthorization("user-1", "inclusion_empresas_profesional")
    );
    mocks.createClient.mockResolvedValue({});

    const response = await StagesSavePOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });
});

describe("POST /api/seguimientos/case/[caseId]/stages/override", () => {
  it("returns 403 when role is ods_operador", async () => {
    mocks.requireAppRole.mockResolvedValue(stubForbiddenAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await StagesOverridePOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).toBe(403);
  });

  it("returns not-403/401 when role is inclusion_empresas_admin", async () => {
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await StagesOverridePOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });

  it("returns not-403/401 when role is inclusion_empresas_profesional", async () => {
    mocks.requireAppRole.mockResolvedValue(
      stubOkAuthorization("user-1", "inclusion_empresas_profesional")
    );
    mocks.createClient.mockResolvedValue({});

    const response = await StagesOverridePOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });
});

describe("POST /api/seguimientos/case/[caseId]/result/refresh", () => {
  it("returns 403 when role is ods_operador", async () => {
    mocks.requireAppRole.mockResolvedValue(stubForbiddenAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await ResultRefreshPOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).toBe(403);
  });

  it("returns not-403/401 when role is inclusion_empresas_admin", async () => {
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await ResultRefreshPOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });

  it("returns not-403/401 when role is inclusion_empresas_profesional", async () => {
    mocks.requireAppRole.mockResolvedValue(
      stubOkAuthorization("user-1", "inclusion_empresas_profesional")
    );
    mocks.createClient.mockResolvedValue({});

    const response = await ResultRefreshPOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });
});

describe("POST /api/seguimientos/case/[caseId]/pdf/export", () => {
  it("returns 403 when role is ods_operador", async () => {
    mocks.requireAppRole.mockResolvedValue(stubForbiddenAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await PdfExportPOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).toBe(403);
  });

  it("returns not-403/401 when role is inclusion_empresas_admin", async () => {
    mocks.requireAppRole.mockResolvedValue(stubOkAuthorization());
    mocks.createClient.mockResolvedValue({});

    const response = await PdfExportPOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });

  it("returns not-403/401 when role is inclusion_empresas_profesional", async () => {
    mocks.requireAppRole.mockResolvedValue(
      stubOkAuthorization("user-1", "inclusion_empresas_profesional")
    );
    mocks.createClient.mockResolvedValue({});

    const response = await PdfExportPOST(emptyBodyPost(), {
      params: stubCaseParams(),
    });

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });
});
