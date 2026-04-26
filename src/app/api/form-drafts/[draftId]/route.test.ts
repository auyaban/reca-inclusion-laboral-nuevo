import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  readDraftGooglePrewarm: vi.fn(),
  trashDriveFile: vi.fn(),
  softDeleteMaybeSingle: vi.fn(),
  cleanupUpdateFinalEq: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/drafts/serverDraftPrewarm", () => ({
  readDraftGooglePrewarm: mocks.readDraftGooglePrewarm,
}));

vi.mock("@/lib/google/drive", () => ({
  trashDriveFile: mocks.trashDriveFile,
}));

describe("DELETE /api/form-drafts/[draftId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.softDeleteMaybeSingle.mockResolvedValue({
      data: { id: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" },
      error: null,
    });
    mocks.trashDriveFile.mockResolvedValue(undefined);
    mocks.cleanupUpdateFinalEq.mockResolvedValue({ error: null });
    mocks.updateMock.mockImplementation((payload: Record<string, unknown>) => {
      if ("deleted_at" in payload) {
        return {
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: mocks.softDeleteMaybeSingle,
                }),
              }),
            }),
          }),
        };
      }

      return {
        eq: vi.fn().mockReturnValue({
          eq: mocks.cleanupUpdateFinalEq,
        }),
      };
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
    mocks.readDraftGooglePrewarm.mockResolvedValue({
      state: {
        spreadsheetId: "sheet-1",
        status: "finalized",
      },
    });

    const { DELETE } = await import("@/app/api/form-drafts/[draftId]/route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.updateMock).toHaveBeenCalledWith({
      deleted_at: expect.any(String),
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
    mocks.readDraftGooglePrewarm.mockResolvedValue({
      state: {
        spreadsheetId: "sheet-1",
        status: "ready",
      },
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
    mocks.readDraftGooglePrewarm.mockResolvedValue({
      state: {
        spreadsheetId: "sheet-1",
        status: "ready",
      },
    });
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

  it("treats missing drafts as a successful not_found delete", async () => {
    mocks.readDraftGooglePrewarm.mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/form-drafts/[draftId]/route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ draftId: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.trashDriveFile).not.toHaveBeenCalled();
    expect(mocks.softDeleteMaybeSingle).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: true,
      deleted: false,
      driveCleanup: "not_found",
    });
  });
});
