import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  readDraftGooglePrewarm: vi.fn(),
  trashDriveFile: vi.fn(),
  deleteMaybeSingle: vi.fn(),
  softDeleteIs: vi.fn(),
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
    mocks.deleteMaybeSingle.mockResolvedValue({
      data: { id: "3f255e78-b0c7-4b8e-8a58-7fd385366e4a" },
      error: null,
    });
    mocks.softDeleteIs.mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: mocks.deleteMaybeSingle,
                }),
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: mocks.softDeleteIs,
            }),
          }),
        }),
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
    expect(mocks.trashDriveFile).toHaveBeenCalledWith("sheet-1");
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
    expect(mocks.softDeleteIs).toHaveBeenCalledOnce();
    expect(mocks.deleteMaybeSingle).not.toHaveBeenCalled();
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
    expect(mocks.deleteMaybeSingle).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: true,
      deleted: false,
      driveCleanup: "not_found",
    });
  });
});
