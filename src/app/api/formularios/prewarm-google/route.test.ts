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
}));

vi.mock("@/lib/security/prewarmRateLimit", () => ({
  enforcePrewarmRateLimit: mocks.enforcePrewarmRateLimit,
}));

describe("POST /api/formularios/prewarm-google", () => {
  const originalMaster = process.env.GOOGLE_SHEETS_MASTER_ID;
  const originalFolder = process.env.GOOGLE_DRIVE_FOLDER_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_SHEETS_MASTER_ID = "master-1";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "folder-1";

    mocks.isFinalizationFormSlug.mockReturnValue(true);
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(true);
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    });
  });

  afterEach(() => {
    if (originalMaster === undefined) {
      delete process.env.GOOGLE_SHEETS_MASTER_ID;
    } else {
      process.env.GOOGLE_SHEETS_MASTER_ID = originalMaster;
    }

    if (originalFolder === undefined) {
      delete process.env.GOOGLE_DRIVE_FOLDER_ID;
    } else {
      process.env.GOOGLE_DRIVE_FOLDER_ID = originalFolder;
    }
  });

  it("returns 429 and retry-after when the rate limit blocks", async () => {
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
        body: JSON.stringify({
          formSlug: "evaluacion",
          empresa: { nombre_empresa: "Empresa Demo" },
          draft_identity: {
            draft_id: "draft-1",
            local_draft_session_id: "session-1",
          },
          prewarm_hint: {
            bundleKey: "evaluacion",
            structureSignature: '{"asistentesCount":1}',
            variantKey: "default",
            repeatedCounts: { asistentes: 1 },
            provisionalName: "BORRADOR - EVALUACION",
          },
        }),
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("7");
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      status: "throttled",
      retryAfterSeconds: 7,
    });
  });

  it("returns 409 with fallback Retry-After when another request still owns the lease", async () => {
    mocks.enforcePrewarmRateLimit.mockResolvedValue({
      allowed: true,
      backend: "memory",
      remaining: 5,
    });
    mocks.prepareDraftSpreadsheet.mockResolvedValue({
      kind: "busy",
      prewarmStatus: "busy",
      prewarmReused: false,
      prewarmStructureSignature: '{"asistentesCount":1}',
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
        body: JSON.stringify({
          formSlug: "evaluacion",
          empresa: { nombre_empresa: "Empresa Demo" },
          draft_identity: {
            draft_id: "draft-1",
            local_draft_session_id: "session-1",
          },
          prewarm_hint: {
            bundleKey: "evaluacion",
            structureSignature: '{"asistentesCount":1}',
            variantKey: "default",
            repeatedCounts: { asistentes: 1 },
            provisionalName: "BORRADOR - EVALUACION",
          },
        }),
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
});
