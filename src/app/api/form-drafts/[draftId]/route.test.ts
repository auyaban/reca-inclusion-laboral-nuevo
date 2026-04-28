import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  findDraftPrewarmCleanupBlocker: vi.fn(),
  trashDriveFile: vi.fn(),
  softDeleteMaybeSingle: vi.fn(),
  cleanupUpdateMaybeSingle: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/google/drive", () => ({
  trashDriveFile: mocks.trashDriveFile,
}));

vi.mock("@/lib/finalization/requests", () => ({
  findDraftPrewarmCleanupBlocker: mocks.findDraftPrewarmCleanupBlocker,
}));

function buildDeletedDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
    form_slug: "presentacion",
    google_prewarm_status: "ready",
    google_prewarm_lease_owner: null,
    google_prewarm_lease_expires_at: null,
    google_prewarm: {
      spreadsheetId: "sheet-1",
      status: "ready",
    },
    ...overrides,
  };
}

function createUpdateChain(maybeSingle: ReturnType<typeof vi.fn>) {
  const selectBuilder = {
    maybeSingle,
  };
  const chain = {
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    select: vi.fn(() => selectBuilder),
  };

  return chain;
}

describe("DELETE /api/form-drafts/[draftId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.softDeleteMaybeSingle.mockResolvedValue({
      data: buildDeletedDraft(),
      error: null,
    });
    mocks.trashDriveFile.mockResolvedValue(undefined);
    mocks.findDraftPrewarmCleanupBlocker.mockResolvedValue(null);
    mocks.cleanupUpdateMaybeSingle.mockResolvedValue({
      data: { id: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" },
      error: null,
    });
    mocks.updateMock.mockImplementation((payload: Record<string, unknown>) => {
      if ("deleted_at" in payload) {
        return createUpdateChain(mocks.softDeleteMaybeSingle);
      }

      return createUpdateChain(mocks.cleanupUpdateMaybeSingle);
    });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        update: mocks.updateMock,
      }),
    });
  });

  it("skips Drive cleanup for finalized drafts", async () => {
    mocks.softDeleteMaybeSingle.mockResolvedValue({
      data: buildDeletedDraft({
        google_prewarm_status: "finalized",
        google_prewarm: {
        spreadsheetId: "sheet-1",
        status: "finalized",
        },
      }),
      error: null,
    });

    const { DELETE } = await import("@/app/api/form-drafts/[draftId]/route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.updateMock).toHaveBeenNthCalledWith(1, {
      deleted_at: expect.any(String),
      google_prewarm_cleanup_status: "pending",
      google_prewarm_cleanup_error: null,
    });
    expect(mocks.updateMock).toHaveBeenNthCalledWith(2, {
      google_prewarm_cleanup_status: "skipped",
      google_prewarm_cleanup_error: null,
    });
    expect(mocks.trashDriveFile).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: true,
      deleted: true,
      driveCleanup: "skipped",
    });
  });

  it("moves provisional spreadsheets to trash before deleting the draft", async () => {
    const { DELETE } = await import("@/app/api/form-drafts/[draftId]/route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.updateMock).toHaveBeenNthCalledWith(1, {
      deleted_at: expect.any(String),
      google_prewarm_cleanup_status: "pending",
      google_prewarm_cleanup_error: null,
    });
    expect(mocks.trashDriveFile).toHaveBeenCalledWith("sheet-1");
    expect(mocks.updateMock).toHaveBeenNthCalledWith(2, {
      google_prewarm_cleanup_status: "trashed",
      google_prewarm_cleanup_error: null,
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      deleted: true,
      driveCleanup: "trashed",
    });
  });

  it("keeps cleanup metadata when Drive cleanup fails", async () => {
    mocks.trashDriveFile.mockRejectedValue(new Error("drive-down"));

    const { DELETE } = await import("@/app/api/form-drafts/[draftId]/route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.softDeleteMaybeSingle).toHaveBeenCalledOnce();
    expect(mocks.updateMock).toHaveBeenNthCalledWith(2, {
      google_prewarm_cleanup_status: "failed",
      google_prewarm_cleanup_error: "drive-down",
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      deleted: true,
      driveCleanup: "failed",
    });
  });

  it("leaves cleanup pending when the prewarm lease is active", async () => {
    mocks.softDeleteMaybeSingle.mockResolvedValue({
      data: buildDeletedDraft({
        google_prewarm_lease_expires_at: new Date(
          Date.now() + 60_000
        ).toISOString(),
      }),
      error: null,
    });

    const { DELETE } = await import("@/app/api/form-drafts/[draftId]/route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.trashDriveFile).not.toHaveBeenCalled();
    expect(mocks.updateMock).toHaveBeenNthCalledWith(2, {
      google_prewarm_cleanup_status: "pending",
      google_prewarm_cleanup_error: "active_lease",
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      deleted: true,
      driveCleanup: "pending",
    });
  });

  it("leaves cleanup pending when an active finalization references the draft", async () => {
    mocks.findDraftPrewarmCleanupBlocker.mockResolvedValue({
      blocker: "active_finalization_identity",
      idempotency_key: "key",
      status: "processing",
      stage: "spreadsheet.prepared",
    });

    const { DELETE } = await import("@/app/api/form-drafts/[draftId]/route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.findDraftPrewarmCleanupBlocker).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "presentacion",
        userId: "user-1",
        identityKey: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a",
        spreadsheetId: "sheet-1",
      })
    );
    expect(mocks.trashDriveFile).not.toHaveBeenCalled();
    expect(mocks.updateMock).toHaveBeenNthCalledWith(2, {
      google_prewarm_cleanup_status: "pending",
      google_prewarm_cleanup_error: "active_finalization_identity",
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      deleted: true,
      driveCleanup: "pending",
    });
  });

  it("leaves cleanup pending when an active finalization references the spreadsheet", async () => {
    mocks.findDraftPrewarmCleanupBlocker.mockResolvedValue({
      blocker: "active_finalization_spreadsheet",
      idempotency_key: "key",
      status: "succeeded",
      stage: "succeeded",
    });

    const { DELETE } = await import("@/app/api/form-drafts/[draftId]/route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.trashDriveFile).not.toHaveBeenCalled();
    expect(mocks.updateMock).toHaveBeenNthCalledWith(2, {
      google_prewarm_cleanup_status: "pending",
      google_prewarm_cleanup_error: "active_finalization_spreadsheet",
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      deleted: true,
      driveCleanup: "pending",
    });
  });

  it("keeps delete successful and cleanup pending when the guard query fails", async () => {
    mocks.findDraftPrewarmCleanupBlocker.mockRejectedValue(new Error("db-down"));

    const { DELETE } = await import("@/app/api/form-drafts/[draftId]/route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.trashDriveFile).not.toHaveBeenCalled();
    expect(mocks.updateMock).toHaveBeenNthCalledWith(2, {
      google_prewarm_cleanup_status: "pending",
      google_prewarm_cleanup_error: "cleanup_guard_failed",
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      deleted: true,
      driveCleanup: "pending",
    });
  });

  it("treats missing drafts as a successful not_found delete", async () => {
    mocks.softDeleteMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const { DELETE } = await import("@/app/api/form-drafts/[draftId]/route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.trashDriveFile).not.toHaveBeenCalled();
    expect(mocks.softDeleteMaybeSingle).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({
      success: true,
      deleted: false,
      driveCleanup: "not_found",
    });
  });
});
