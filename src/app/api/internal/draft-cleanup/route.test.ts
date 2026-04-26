import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  trashDriveFile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createAdminClient,
}));

vi.mock("@/lib/google/drive", () => ({
  trashDriveFile: mocks.trashDriveFile,
}));

const ORIGINAL_ENV = process.env;

function createUserClient(
  user:
    | {
        id: string;
        email?: string | null;
        app_metadata?: Record<string, unknown>;
      }
    | null
) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
  };
}

function createSelectChain(rows: unknown[]) {
  const chain = {
    not: vi.fn(() => chain),
    in: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };

  return chain;
}

function createDeleteChain(rows: unknown[] = []) {
  const chain = {
    in: vi.fn(() => chain),
    not: vi.fn(() => chain),
    select: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };

  return chain;
}

function createUpdateChain() {
  const chain = {
    eq: vi.fn(() => chain),
    not: vi.fn(() => chain),
    in: vi.fn().mockResolvedValue({ error: null }),
  };

  return chain;
}

function installAdminClient(rows: unknown[] = [], deletedRows: unknown[] = rows) {
  const selectChain = createSelectChain(rows);
  const updateChain = createUpdateChain();
  const deleteChain = createDeleteChain(deletedRows);
  const table = {
    select: vi.fn(() => selectChain),
    update: vi.fn(() => updateChain),
    delete: vi.fn(() => deleteChain),
  };
  const admin = {
    from: vi.fn(() => table),
  };

  mocks.createAdminClient.mockReturnValue(admin);

  return { admin, table, selectChain, updateChain, deleteChain };
}

function buildCleanupRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
    user_id: "user-1",
    form_slug: "presentacion",
    updated_at: "2026-04-20T10:00:00.000Z",
    deleted_at: "2026-04-20T11:00:00.000Z",
    google_prewarm_cleanup_status: "pending",
    google_prewarm_cleanup_error: "timeout previo",
    google_prewarm: {
      spreadsheetId: "sheet-1",
      status: "ready",
    },
    ...overrides,
  };
}

describe("internal draft cleanup API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
    };
    mocks.createClient.mockResolvedValue(
      createUserClient({
        id: "admin-1",
        email: "admin@reca.test",
        app_metadata: { usuario_login: "aaron_vercel" },
      })
    );
    mocks.trashDriveFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = ORIGINAL_ENV;
  });

  it("rejects GET when the user is not authenticated", async () => {
    mocks.createClient.mockResolvedValue(createUserClient(null));

    const { GET } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await GET(new Request("http://localhost/api/internal/draft-cleanup"));

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "No autenticado.",
    });
  });

  it("rejects GET when the user is not the cleanup admin", async () => {
    mocks.createClient.mockResolvedValue(
      createUserClient({
        id: "user-1",
        email: "user@reca.test",
        app_metadata: { usuario_login: "otra_persona" },
      })
    );

    const { GET } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await GET(new Request("http://localhost/api/internal/draft-cleanup"));

    expect(response.status).toBe(403);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "No autorizado.",
    });
  });

  it("lists only soft-deleted drafts with pending or failed cleanup status", async () => {
    const { selectChain } = installAdminClient([buildCleanupRow()]);

    const { GET } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await GET(
      new Request("http://localhost/api/internal/draft-cleanup?limit=10")
    );

    expect(response.status).toBe(200);
    expect(selectChain.not).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(selectChain.in).toHaveBeenCalledWith("google_prewarm_cleanup_status", [
      "pending",
      "failed",
    ]);
    expect(selectChain.limit).toHaveBeenCalledWith(10);
    await expect(response.json()).resolves.toEqual({
      success: true,
      drafts: [
        {
          id: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
          userId: "user-1",
          formSlug: "presentacion",
          updatedAt: "2026-04-20T10:00:00.000Z",
          deletedAt: "2026-04-20T11:00:00.000Z",
          googlePrewarmCleanupStatus: "pending",
          googlePrewarmCleanupError: "timeout previo",
          spreadsheetId: "sheet-1",
        },
      ],
    });
  });

  it("lists eligible cleanup drafts globally across users", async () => {
    const otherUserRow = buildCleanupRow({
      id: "4f255e78-b0c7-4b8e-8a58-7fd385366e4b",
      user_id: "user-2",
      form_slug: "induccion-organizacional",
      google_prewarm_cleanup_status: "failed",
      google_prewarm_cleanup_error: "drive failed",
      google_prewarm: {
        spreadsheetId: "sheet-2",
        status: "ready",
      },
    });
    const { admin, selectChain } = installAdminClient([
      buildCleanupRow(),
      otherUserRow,
    ]);

    const { GET } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await GET(new Request("http://localhost/api/internal/draft-cleanup"));

    expect(response.status).toBe(200);
    expect(admin.from).toHaveBeenCalledWith("form_drafts");
    expect(selectChain.limit).toHaveBeenCalledWith(25);
    await expect(response.json()).resolves.toEqual({
      success: true,
      drafts: [
        expect.objectContaining({
          id: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
          userId: "user-1",
        }),
        expect.objectContaining({
          id: "4f255e78-b0c7-4b8e-8a58-7fd385366e4b",
          userId: "user-2",
        }),
      ],
    });
  });

  it.each([
    "http://localhost/api/internal/draft-cleanup?limit=abc",
    "http://localhost/api/internal/draft-cleanup?view=purgeable&olderThanDays=abc",
    "http://localhost/api/internal/draft-cleanup?view=unknown",
  ])("rejects invalid GET query params: %s", async (url) => {
    const { GET } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await GET(new Request(url));

    expect(response.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Parametros de consulta invalidos.",
    });
  });

  it("lists purgeable soft-deleted drafts with resolved cleanup status", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T12:00:00.000Z"));
    const row = buildCleanupRow({
      google_prewarm_cleanup_status: "trashed",
      google_prewarm_cleanup_error: null,
      deleted_at: "2026-03-20T11:00:00.000Z",
    });
    const { selectChain } = installAdminClient([row]);

    const { GET } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await GET(
      new Request(
        "http://localhost/api/internal/draft-cleanup?view=purgeable&limit=5&olderThanDays=30"
      )
    );

    expect(response.status).toBe(200);
    expect(selectChain.not).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(selectChain.in).toHaveBeenCalledWith("google_prewarm_cleanup_status", [
      "trashed",
      "skipped",
    ]);
    expect(selectChain.lte).toHaveBeenCalledWith(
      "deleted_at",
      "2026-03-27T12:00:00.000Z"
    );
    expect(selectChain.limit).toHaveBeenCalledWith(5);
    await expect(response.json()).resolves.toEqual({
      success: true,
      drafts: [
        {
          id: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
          userId: "user-1",
          formSlug: "presentacion",
          updatedAt: "2026-04-20T10:00:00.000Z",
          deletedAt: "2026-03-20T11:00:00.000Z",
          googlePrewarmCleanupStatus: "trashed",
          googlePrewarmCleanupError: null,
          spreadsheetId: "sheet-1",
        },
      ],
    });
  });

  it("retries Drive cleanup and marks matched drafts as trashed", async () => {
    const { table, updateChain } = installAdminClient([buildCleanupRow()]);

    const { POST } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await POST(
      new Request("http://localhost/api/internal/draft-cleanup", {
        method: "POST",
        body: JSON.stringify({
          draftIds: ["3f255e78-b0c7-4b8e-8a58-7fd385366e4a"],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.trashDriveFile).toHaveBeenCalledWith("sheet-1");
    expect(table.update).toHaveBeenCalledWith({
      google_prewarm_cleanup_status: "trashed",
      google_prewarm_cleanup_error: null,
    });
    expect(updateChain.eq).toHaveBeenCalledWith(
      "id",
      "3f255e78-b0c7-4b8e-8a58-7fd385366e4a"
    );
    expect(updateChain.not).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(updateChain.in).toHaveBeenCalledWith("google_prewarm_cleanup_status", [
      "pending",
      "failed",
    ]);
    await expect(response.json()).resolves.toEqual({
      success: true,
      matched: 1,
      processed: 1,
      remainingEstimate: 0,
      stoppedEarly: false,
      cappedToSafeLimit: false,
      results: [
        {
          draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
          cleanupStatus: "trashed",
          cleanupError: null,
          spreadsheetId: "sheet-1",
        },
      ],
    });
  });

  it("caps POST cleanup batches to a safe limit", async () => {
    const rows = Array.from({ length: 10 }, (_, index) =>
      buildCleanupRow({
        id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        google_prewarm: {
          spreadsheetId: `sheet-${index + 1}`,
          status: "ready",
        },
      })
    );
    const { selectChain } = installAdminClient(rows);

    const { POST } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await POST(
      new Request("http://localhost/api/internal/draft-cleanup", {
        method: "POST",
        body: JSON.stringify({ limit: 100 }),
      })
    );

    expect(response.status).toBe(200);
    expect(selectChain.limit).toHaveBeenCalledWith(10);
    expect(mocks.trashDriveFile).toHaveBeenCalledTimes(10);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      matched: 10,
      processed: 10,
      remainingEstimate: 0,
      stoppedEarly: false,
      cappedToSafeLimit: true,
    });
  });

  it("stops POST cleanup early when the global time budget is exhausted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T12:00:00.000Z"));
    const rows = Array.from({ length: 4 }, (_, index) =>
      buildCleanupRow({
        id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        google_prewarm: {
          spreadsheetId: `sheet-${index + 1}`,
          status: "ready",
        },
      })
    );
    installAdminClient(rows);
    mocks.trashDriveFile.mockReturnValue(new Promise(() => {}));

    const { POST } = await import("@/app/api/internal/draft-cleanup/route");
    const responsePromise = POST(
      new Request("http://localhost/api/internal/draft-cleanup", {
        method: "POST",
        body: JSON.stringify({ limit: 4 }),
      })
    );

    await vi.advanceTimersByTimeAsync(2_500);
    await vi.advanceTimersByTimeAsync(2_500);
    await vi.advanceTimersByTimeAsync(2_500);
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(mocks.trashDriveFile).toHaveBeenCalledTimes(3);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      matched: 4,
      processed: 3,
      remainingEstimate: 1,
      stoppedEarly: true,
      cappedToSafeLimit: false,
    });
  });

  it("keeps pending when the Drive retry times out", async () => {
    vi.useFakeTimers();
    installAdminClient([buildCleanupRow()]);
    mocks.trashDriveFile.mockReturnValue(new Promise(() => {}));

    const { POST } = await import("@/app/api/internal/draft-cleanup/route");
    const responsePromise = POST(
      new Request("http://localhost/api/internal/draft-cleanup", {
        method: "POST",
        body: JSON.stringify({ limit: 1 }),
      })
    );

    await vi.advanceTimersByTimeAsync(2_500);
    const response = await responsePromise;

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      matched: 1,
      processed: 1,
      remainingEstimate: 0,
      stoppedEarly: false,
      cappedToSafeLimit: false,
      results: [
        {
          draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
          cleanupStatus: "pending",
          cleanupError: "El cleanup de Drive quedo pendiente por timeout.",
          spreadsheetId: "sheet-1",
        },
      ],
    });
  });

  it("marks failed when Drive cleanup throws", async () => {
    const { table } = installAdminClient([buildCleanupRow()]);
    mocks.trashDriveFile.mockRejectedValue(new Error("drive-down"));

    const { POST } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await POST(
      new Request("http://localhost/api/internal/draft-cleanup", {
        method: "POST",
        body: JSON.stringify({ limit: 1 }),
      })
    );

    expect(response.status).toBe(200);
    expect(table.update).toHaveBeenCalledWith({
      google_prewarm_cleanup_status: "failed",
      google_prewarm_cleanup_error: "drive-down",
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      matched: 1,
      processed: 1,
      remainingEstimate: 0,
      stoppedEarly: false,
      cappedToSafeLimit: false,
      results: [
        {
          draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
          cleanupStatus: "failed",
          cleanupError: "drive-down",
          spreadsheetId: "sheet-1",
        },
      ],
    });
  });

  it("does not retry or update when no eligible drafts match", async () => {
    const { table } = installAdminClient([]);

    const { POST } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await POST(
      new Request("http://localhost/api/internal/draft-cleanup", {
        method: "POST",
        body: JSON.stringify({
          draftIds: ["3f255e78-b0c7-4b8e-8a58-7fd385366e4a"],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.trashDriveFile).not.toHaveBeenCalled();
    expect(table.update).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: true,
      matched: 0,
      processed: 0,
      remainingEstimate: 0,
      stoppedEarly: false,
      cappedToSafeLimit: false,
      results: [],
    });
  });

  it("rejects DELETE without explicit purge confirmation", async () => {
    installAdminClient();

    const { DELETE } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await DELETE(
      new Request("http://localhost/api/internal/draft-cleanup", {
        method: "DELETE",
        body: JSON.stringify({ limit: 10 }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Confirmacion de purga invalida.",
    });
  });

  it("purges only inspected soft-deleted drafts with resolved cleanup", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T12:00:00.000Z"));
    const row = buildCleanupRow({
      google_prewarm_cleanup_status: "skipped",
      google_prewarm_cleanup_error: null,
      deleted_at: "2026-03-01T11:00:00.000Z",
      google_prewarm: {
        spreadsheetId: null,
        status: "not_started",
      },
    });
    const { table, selectChain, deleteChain } = installAdminClient([row], [row]);

    const { DELETE } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await DELETE(
      new Request("http://localhost/api/internal/draft-cleanup", {
        method: "DELETE",
        body: JSON.stringify({
          confirm: "PURGE_SOFT_DELETED_DRAFTS",
          draftIds: ["3f255e78-b0c7-4b8e-8a58-7fd385366e4a"],
          olderThanDays: 30,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(selectChain.in).toHaveBeenCalledWith("google_prewarm_cleanup_status", [
      "trashed",
      "skipped",
    ]);
    expect(selectChain.in).toHaveBeenCalledWith("id", [
      "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
    ]);
    expect(table.delete).toHaveBeenCalled();
    expect(deleteChain.in).toHaveBeenCalledWith("id", [
      "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
    ]);
    expect(deleteChain.not).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(deleteChain.in).toHaveBeenCalledWith("google_prewarm_cleanup_status", [
      "trashed",
      "skipped",
    ]);
    await expect(response.json()).resolves.toEqual({
      success: true,
      matched: 1,
      purged: 1,
      drafts: [
        {
          id: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
          userId: "user-1",
          formSlug: "presentacion",
          updatedAt: "2026-04-20T10:00:00.000Z",
          deletedAt: "2026-03-01T11:00:00.000Z",
          googlePrewarmCleanupStatus: "skipped",
          googlePrewarmCleanupError: null,
          spreadsheetId: null,
        },
      ],
    });
  });

  it("does not purge when no eligible resolved drafts match", async () => {
    const { table } = installAdminClient([]);

    const { DELETE } = await import("@/app/api/internal/draft-cleanup/route");
    const response = await DELETE(
      new Request("http://localhost/api/internal/draft-cleanup", {
        method: "DELETE",
        body: JSON.stringify({
          confirm: "PURGE_SOFT_DELETED_DRAFTS",
          limit: 10,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(table.delete).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: true,
      matched: 0,
      purged: 0,
      drafts: [],
    });
  });
});
