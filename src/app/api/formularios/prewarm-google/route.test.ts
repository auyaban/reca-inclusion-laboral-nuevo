import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  prepareDraftSpreadsheet: vi.fn(),
  isFinalizationFormSlug: vi.fn(),
  isFinalizationPrewarmEnabled: vi.fn(),
  enforcePrewarmRateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/google/draftSpreadsheet", () => ({
  prepareDraftSpreadsheet: mocks.prepareDraftSpreadsheet,
}));

vi.mock("@/lib/finalization/formRegistry", () => ({
  isFinalizationFormSlug: mocks.isFinalizationFormSlug,
}));

vi.mock("@/lib/finalization/prewarmConfig", () => ({
  isFinalizationPrewarmEnabled: mocks.isFinalizationPrewarmEnabled,
  PREWARM_TEMPLATE_REVISIONS: {
    presentacion: "phase6-test",
    sensibilizacion: "phase6-test",
    evaluacion: "phase6-test",
    seleccion: "phase6-test",
    contratacion: "phase6-test",
    "condiciones-vacante": "phase6-test",
    "induccion-organizacional": "phase6-test",
    "induccion-operativa": "phase6-test",
    "interprete-lsc": "phase6-test",
  },
}));

vi.mock("@/lib/security/prewarmRateLimit", () => ({
  enforcePrewarmRateLimit: mocks.enforcePrewarmRateLimit,
}));

const defaultDraftFormData = {
  tipo_visita: "Presentacion",
  asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
};
const defaultEmpresaSnapshot = {
  nombre_empresa: "Empresa Canonica",
  nit_empresa: "123",
};

function buildRequestBody(
  overrides: {
    empresaNombre?: string;
    formSlug?: string;
    prewarmHint?: Record<string, unknown>;
  } = {}
) {
  const formSlug = overrides.formSlug ?? "presentacion";

  return {
    formSlug,
    empresa: { nombre_empresa: overrides.empresaNombre ?? "Empresa Demo" },
    draft_identity: {
      draft_id: "draft-1",
      local_draft_session_id: "session-1",
    },
    prewarm_hint: {
      bundleKey: formSlug,
      structureSignature: '{"client":"ignored"}',
      variantKey: "default",
      repeatedCounts: { asistentes: 999 },
      provisionalName: "CLIENT CONTROLLED NAME",
      ...overrides.prewarmHint,
    },
  };
}

function createSupabaseMock(options: {
  draftFormData?: unknown;
  draftRow?: { data?: unknown; empresa_snapshot?: unknown } | null;
  draftError?: { message?: string } | null;
  empresaSnapshot?: unknown;
  user?: { id: string } | null;
} = {}) {
  const draftQuery = {
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(),
  };
  draftQuery.eq.mockReturnValue(draftQuery);
  draftQuery.is.mockReturnValue(draftQuery);
  draftQuery.maybeSingle.mockResolvedValue({
    data:
      options.draftRow === null
        ? null
        : (options.draftRow ?? {
            data: options.draftFormData ?? defaultDraftFormData,
            empresa_snapshot: options.empresaSnapshot ?? defaultEmpresaSnapshot,
          }),
    error: options.draftError ?? null,
  });

  const draftSelect = vi.fn(() => draftQuery);
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user ?? { id: "user-1" } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table !== "form_drafts") {
        throw new Error(`Unexpected table ${table}`);
      }

      return { select: draftSelect };
    }),
  };

  mocks.createClient.mockResolvedValue(supabase);

  return { draftQuery, draftSelect, supabase };
}

function mockPreparedResult(overrides: Record<string, unknown> = {}) {
  mocks.prepareDraftSpreadsheet.mockResolvedValue({
    kind: "prepared",
    resolution: "cold",
    spreadsheetId: "sheet-1",
    companyFolderId: "folder-empresa",
    activeSheetName: "1. PRESENTACION DEL PROGRAMA IL",
    activeSheetId: 42,
    sheetLink: "https://sheet-1",
    prewarmStatus: "ready",
    prewarmReused: false,
    prewarmStructureSignature:
      '{"asistentesCount":1,"templateRevision":"phase6-test","variantKey":"presentacion"}',
    summary: {
      folderId: "folder-empresa",
      spreadsheetId: "sheet-1",
      bundleKey: "presentacion",
      structureSignature:
        '{"asistentesCount":1,"templateRevision":"phase6-test","variantKey":"presentacion"}',
      activeSheetName: "1. PRESENTACION DEL PROGRAMA IL",
      updatedAt: "2026-04-23T00:00:00.000Z",
    },
    stateSnapshot: null,
    structuralMutation: { writes: [] },
    timing: {
      requestId: "req-1",
      startedAt: "2026-04-23T00:00:00.000Z",
      totalMs: 10,
      steps: [],
    },
    ...overrides,
  });
}

describe("POST /api/formularios/prewarm-google", () => {
  const originalMaster = process.env.GOOGLE_SHEETS_MASTER_ID;
  const originalLscTemplate = process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID;
  const originalFolder = process.env.GOOGLE_DRIVE_FOLDER_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_SHEETS_MASTER_ID = "master-1";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "folder-1";

    mocks.isFinalizationFormSlug.mockReturnValue(true);
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(true);
    createSupabaseMock();
    mocks.enforcePrewarmRateLimit.mockResolvedValue({
      allowed: true,
      backend: "memory",
      remaining: 5,
    });
    mockPreparedResult();
  });

  afterEach(() => {
    if (originalMaster === undefined) {
      delete process.env.GOOGLE_SHEETS_MASTER_ID;
    } else {
      process.env.GOOGLE_SHEETS_MASTER_ID = originalMaster;
    }

    if (originalLscTemplate === undefined) {
      delete process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID;
    } else {
      process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID = originalLscTemplate;
    }

    if (originalFolder === undefined) {
      delete process.env.GOOGLE_DRIVE_FOLDER_ID;
    } else {
      process.env.GOOGLE_DRIVE_FOLDER_ID = originalFolder;
    }
  });

  it("recalculates the hint from the canonical draft and ignores client counts", async () => {
    const { POST } = await import("@/app/api/formularios/prewarm-google/route");
    const response = await POST(
      new Request("http://localhost/api/formularios/prewarm-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.enforcePrewarmRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        structureSignature:
          '{"asistentesCount":1,"templateRevision":"phase6-test","variantKey":"presentacion"}',
      })
    );
    expect(mocks.prepareDraftSpreadsheet).toHaveBeenCalledWith(
      expect.objectContaining({
        hint: expect.objectContaining({
          repeatedCounts: { asistentes: 1 },
          structureSignature:
            '{"asistentesCount":1,"templateRevision":"phase6-test","variantKey":"presentacion"}',
          provisionalName: expect.not.stringContaining("CLIENT CONTROLLED"),
        }),
      })
    );
  });

  it("uses the canonical presentacion early attendee estimate for prewarm structure", async () => {
    createSupabaseMock({
      draftFormData: {
        tipo_visita: "Presentación",
        asistentes: [{ nombre: "Ana Perez", cargo: "Lider" }],
        prewarm_asistentes_estimados: 5,
      },
    });

    const { POST } = await import("@/app/api/formularios/prewarm-google/route");
    const response = await POST(
      new Request("http://localhost/api/formularios/prewarm-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.prepareDraftSpreadsheet).toHaveBeenCalledWith(
      expect.objectContaining({
        hint: expect.objectContaining({
          repeatedCounts: { asistentes: 5 },
          structureSignature:
            '{"asistentesCount":5,"templateRevision":"phase6-test","variantKey":"presentacion"}',
        }),
      })
    );
  });

  it("uses the canonical draft empresa for rate-limit and Google preparation", async () => {
    const { POST } = await import("@/app/api/formularios/prewarm-google/route");
    const response = await POST(
      new Request("http://localhost/api/formularios/prewarm-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildRequestBody({
            empresaNombre: "Empresa Spoof Cliente",
          })
        ),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.enforcePrewarmRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaKey: "Empresa Canonica",
      })
    );
    expect(mocks.prepareDraftSpreadsheet).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaNombre: "Empresa Canonica",
      })
    );
  });

  it("returns 429 and retry-after when the server-side rate limit blocks", async () => {
    mocks.enforcePrewarmRateLimit.mockResolvedValue({
      allowed: false,
      backend: "memory",
      error:
        "Demasiados intentos de preparar Google. Intenta de nuevo en unos segundos.",
      status: 429,
      retryAfterSeconds: 7,
    });

    const { POST } = await import("@/app/api/formularios/prewarm-google/route");
    const response = await POST(
      new Request("http://localhost/api/formularios/prewarm-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildRequestBody({
            prewarmHint: {
              structureSignature: '{"client":"still-ignored"}',
              repeatedCounts: { asistentes: 999 },
            },
          })
        ),
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("7");
    expect(mocks.enforcePrewarmRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        structureSignature:
          '{"asistentesCount":1,"templateRevision":"phase6-test","variantKey":"presentacion"}',
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      status: "throttled",
      retryAfterSeconds: 7,
    });
  });

  it("returns 409 with fallback Retry-After when another request still owns the lease", async () => {
    mocks.prepareDraftSpreadsheet.mockResolvedValue({
      kind: "busy",
      prewarmStatus: "busy",
      prewarmReused: false,
      prewarmStructureSignature:
        '{"asistentesCount":1,"templateRevision":"phase6-test","variantKey":"presentacion"}',
      timing: {
        requestId: "req-1",
        startedAt: "2026-04-20T00:00:00.000Z",
        totalMs: 10,
        steps: [],
      },
      leaseOwner: "req-2",
      leaseExpiresAt: null,
      summary: null,
    });

    const { POST } = await import("@/app/api/formularios/prewarm-google/route");
    const response = await POST(
      new Request("http://localhost/api/formularios/prewarm-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      })
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).toBe("5");
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      status: "busy",
      retryAfterSeconds: 5,
    });
  });

  it("does not call Google when the canonical draft is missing or soft-deleted", async () => {
    createSupabaseMock({ draftRow: null });

    const { POST } = await import("@/app/api/formularios/prewarm-google/route");
    const response = await POST(
      new Request("http://localhost/api/formularios/prewarm-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      })
    );

    expect(response.status).toBe(404);
    expect(mocks.enforcePrewarmRateLimit).not.toHaveBeenCalled();
    expect(mocks.prepareDraftSpreadsheet).not.toHaveBeenCalled();
  });

  it("filters the canonical draft by authenticated user before touching Google", async () => {
    const { draftQuery } = createSupabaseMock({ draftRow: null });

    const { POST } = await import("@/app/api/formularios/prewarm-google/route");
    const response = await POST(
      new Request("http://localhost/api/formularios/prewarm-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      })
    );

    expect(response.status).toBe(404);
    expect(draftQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.enforcePrewarmRateLimit).not.toHaveBeenCalled();
    expect(mocks.prepareDraftSpreadsheet).not.toHaveBeenCalled();
  });

  it("rejects presentacion prewarm above the server-side attendee cap", async () => {
    createSupabaseMock({
      draftFormData: {
        tipo_visita: "Presentacion",
        asistentes: Array.from({ length: 81 }, (_, index) => ({
          nombre: `Asistente ${index + 1}`,
          cargo: "Cargo",
        })),
      },
    });

    const { POST } = await import("@/app/api/formularios/prewarm-google/route");
    const response = await POST(
      new Request("http://localhost/api/formularios/prewarm-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: "prewarm_cap_exceeded",
      field: "asistentes",
      count: 81,
      max: 80,
    });
    expect(mocks.enforcePrewarmRateLimit).not.toHaveBeenCalled();
    expect(mocks.prepareDraftSpreadsheet).not.toHaveBeenCalled();
  });

  it("rejects non-presentacion prewarm above the server-side attendee caps", async () => {
    createSupabaseMock({
      draftFormData: {
        asistentes: Array.from({ length: 51 }, (_, index) => ({
          nombre: `Asistente ${index + 1}`,
          cargo: "Cargo",
        })),
      },
    });

    const { POST } = await import("@/app/api/formularios/prewarm-google/route");
    const response = await POST(
      new Request("http://localhost/api/formularios/prewarm-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildRequestBody({
            formSlug: "evaluacion",
            prewarmHint: {
              bundleKey: "evaluacion",
              repeatedCounts: { asistentes: 1 },
            },
          })
        ),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: "prewarm_cap_exceeded",
      field: "asistentes",
      count: 51,
      max: 50,
    });
    expect(mocks.enforcePrewarmRateLimit).not.toHaveBeenCalled();
    expect(mocks.prepareDraftSpreadsheet).not.toHaveBeenCalled();
  });

  it("uses the dedicated LSC template for interprete-lsc prewarm requests", async () => {
    delete process.env.GOOGLE_SHEETS_MASTER_ID;
    process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID = "lsc-template-1";
    createSupabaseMock({
      draftFormData: {
        oferentes: [
          { nombre_oferente: "Oferente 1", cedula: "123", proceso: "Ruta" },
        ],
        interpretes: [
          { nombre: "Interprete 1", hora_inicial: "08:00", hora_final: "10:00" },
        ],
        asistentes: [
          { nombre: "A1", cargo: "Profesional RECA" },
          { nombre: "A2", cargo: "Apoyo" },
        ],
      },
    });
    mockPreparedResult({
      activeSheetName: "Maestro",
      prewarmStructureSignature:
        '{"asistentesOverflow":0,"interpretesOverflow":0,"oferentesOverflow":0}',
      summary: {
        folderId: "folder-empresa",
        spreadsheetId: "sheet-1",
        bundleKey: "interprete-lsc",
        structureSignature:
          '{"asistentesOverflow":0,"interpretesOverflow":0,"oferentesOverflow":0}',
        activeSheetName: "Maestro",
        updatedAt: "2026-04-23T00:00:00.000Z",
      },
    });

    const { POST } = await import("@/app/api/formularios/prewarm-google/route");
    const response = await POST(
      new Request("http://localhost/api/formularios/prewarm-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildRequestBody({
            formSlug: "interprete-lsc",
            prewarmHint: {
              bundleKey: "interprete-lsc",
              structureSignature: '{"client":"ignored"}',
              repeatedCounts: { oferentes: 99, interpretes: 99, asistentes: 99 },
            },
          })
        ),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.prepareDraftSpreadsheet).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "interprete-lsc",
        masterTemplateId: "lsc-template-1",
        hint: expect.objectContaining({
          repeatedCounts: { oferentes: 1, interpretes: 1, asistentes: 2 },
        }),
      })
    );
  });
});
