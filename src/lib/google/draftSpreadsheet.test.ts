import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSpreadsheetFile: vi.fn(),
  getOrCreateFolder: vi.fn(),
  sanitizeFileName: vi.fn(),
  trashDriveFile: vi.fn(),
  applyFormSheetMutation: vi.fn(),
  buildSpreadsheetSheetLink: vi.fn(),
  clearProtectedRanges: vi.fn(),
  hideSheets: vi.fn(),
  copySheetToSpreadsheet: vi.fn(),
  findMatchingSheet: vi.fn(),
  listSheets: vi.fn(),
  claimDraftGooglePrewarmLease: vi.fn(),
  createEmptyDraftGooglePrewarmState: vi.fn(),
  readDraftGooglePrewarm: vi.fn(),
  renewDraftGooglePrewarmLease: vi.fn(),
  releaseDraftGooglePrewarmLease: vi.fn(),
  updateDraftGooglePrewarm: vi.fn(),
  buildStructuralMutationForForm: vi.fn(),
  getPrewarmActiveSheetName: vi.fn(),
  getPrewarmBundleSheetNames: vi.fn(),
}));

vi.mock("@/lib/google/drive", () => ({
  createSpreadsheetFile: mocks.createSpreadsheetFile,
  getOrCreateFolder: mocks.getOrCreateFolder,
  sanitizeFileName: mocks.sanitizeFileName,
  trashDriveFile: mocks.trashDriveFile,
}));

vi.mock("@/lib/google/sheets", () => ({
  applyFormSheetMutation: mocks.applyFormSheetMutation,
  buildSpreadsheetSheetLink: mocks.buildSpreadsheetSheetLink,
  clearProtectedRanges: mocks.clearProtectedRanges,
  hideSheets: mocks.hideSheets,
}));

vi.mock("@/lib/google/companySpreadsheet", () => ({
  copySheetToSpreadsheet: mocks.copySheetToSpreadsheet,
  findMatchingSheet: mocks.findMatchingSheet,
  listSheets: mocks.listSheets,
}));

vi.mock("@/lib/drafts/serverDraftPrewarm", () => ({
  claimDraftGooglePrewarmLease: mocks.claimDraftGooglePrewarmLease,
  createEmptyDraftGooglePrewarmState: mocks.createEmptyDraftGooglePrewarmState,
  readDraftGooglePrewarm: mocks.readDraftGooglePrewarm,
  renewDraftGooglePrewarmLease: mocks.renewDraftGooglePrewarmLease,
  releaseDraftGooglePrewarmLease: mocks.releaseDraftGooglePrewarmLease,
  updateDraftGooglePrewarm: mocks.updateDraftGooglePrewarm,
}));

vi.mock("@/lib/finalization/prewarmRegistry", () => ({
  buildStructuralMutationForForm: mocks.buildStructuralMutationForForm,
  getPrewarmActiveSheetName: mocks.getPrewarmActiveSheetName,
  getPrewarmBundleSheetNames: mocks.getPrewarmBundleSheetNames,
}));

import { prepareDraftSpreadsheet } from "@/lib/google/draftSpreadsheet";

function buildEmptyState() {
  return {
    version: 1,
    folderId: null,
    spreadsheetId: null,
    provisionalName: null,
    bundleKey: null,
    structureSignature: null,
    activeSheetName: null,
    bundleSheetNames: [],
    status: "idle" as const,
    lastError: null,
    attemptCount: 0,
    lastRunTiming: null,
    lastSuccessfulTiming: null,
  };
}

function buildLeaseState(overrides: Record<string, unknown> = {}) {
  return {
    claimed: true,
    leaseOwner: "req-1",
    leaseExpiresAt: "2026-04-20T00:01:00.000Z",
    status: "idle",
    updatedAt: "2026-04-20T00:00:00.000Z",
    state: buildEmptyState(),
    ...overrides,
  };
}

describe("prepareDraftSpreadsheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sanitizeFileName.mockImplementation((value: string) => value);
    mocks.createEmptyDraftGooglePrewarmState.mockImplementation(buildEmptyState);
    mocks.buildStructuralMutationForForm.mockReturnValue({ writes: [] });
    mocks.getPrewarmActiveSheetName.mockReturnValue("2. EVALUACION");
    mocks.getPrewarmBundleSheetNames.mockReturnValue(["2. EVALUACION"]);
    mocks.findMatchingSheet.mockImplementation(
      (sheets: Array<{ title?: string; sheetId: number }>, sheetName: string) =>
        sheets.find((sheet) => sheet.title === sheetName) ?? null
    );
    mocks.buildSpreadsheetSheetLink.mockImplementation(
      (spreadsheetId: string, sheetId: number) =>
        `https://sheet/${spreadsheetId}#gid=${sheetId}`
    );
    mocks.claimDraftGooglePrewarmLease.mockResolvedValue(buildLeaseState());
    mocks.readDraftGooglePrewarm.mockResolvedValue(null);
    mocks.renewDraftGooglePrewarmLease.mockResolvedValue(buildLeaseState());
    mocks.releaseDraftGooglePrewarmLease.mockResolvedValue(true);
    mocks.updateDraftGooglePrewarm.mockImplementation(
      async ({ state, status, updatedAt }: { state: unknown; status: string; updatedAt: string }) => ({
        state: { ...(state as Record<string, unknown>), status },
        updatedAt,
      })
    );
    mocks.getOrCreateFolder.mockResolvedValue("folder-google");
    mocks.createSpreadsheetFile.mockResolvedValue({ fileId: "sheet-1" });
    mocks.copySheetToSpreadsheet.mockResolvedValue(undefined);
    mocks.clearProtectedRanges.mockResolvedValue(undefined);
    mocks.hideSheets.mockResolvedValue(new Map([["2. EVALUACION", 42]]));
    mocks.applyFormSheetMutation.mockResolvedValue(undefined);
    mocks.listSheets.mockResolvedValue([{ title: "2. EVALUACION", sheetId: 42 }]);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("preserves the original Google error when persisting failed state also fails", async () => {
    mocks.updateDraftGooglePrewarm.mockImplementation(
      async ({
        state,
        status,
        updatedAt,
      }: {
        state: unknown;
        status: string;
        updatedAt: string;
      }) => {
        if (status === "failed") {
          throw new Error("supabase-down");
        }

        return {
          state: { ...(state as Record<string, unknown>), status },
          updatedAt,
        };
      }
    );
    mocks.createSpreadsheetFile.mockRejectedValue(new Error("google-down"));

    await expect(
      prepareDraftSpreadsheet({
        supabase: { rpc: vi.fn() } as never,
        userId: "user-1",
        draftId: "draft-1",
        formSlug: "evaluacion",
        masterTemplateId: "master-1",
        sheetsFolderId: "folder-root",
        empresaNombre: "Empresa Demo",
        hint: {
          bundleKey: "evaluacion",
          structureSignature: '{"asistentesCount":1}',
          variantKey: "default",
          repeatedCounts: { asistentes: 1 },
          provisionalName: "BORRADOR - EVALUACION",
        },
        strictDraftPersistence: true,
      })
    ).rejects.toThrow("google-down");

    expect(console.error).toHaveBeenCalledWith(
      "[draft_spreadsheet.persist_failed_state] failed",
      expect.objectContaining({
        draftId: "draft-1",
        rootError: "google-down",
      })
    );
    expect(mocks.releaseDraftGooglePrewarmLease).toHaveBeenCalledOnce();
  });

  it("reuses the persisted folderId instead of querying Drive again", async () => {
    mocks.claimDraftGooglePrewarmLease.mockResolvedValue(
      buildLeaseState({
        state: {
          ...buildEmptyState(),
          folderId: "folder-persisted",
          status: "failed",
        },
      })
    );

    const result = await prepareDraftSpreadsheet({
      supabase: { rpc: vi.fn() } as never,
      userId: "user-1",
      draftId: "draft-1",
      formSlug: "evaluacion",
      masterTemplateId: "master-1",
      sheetsFolderId: "folder-root",
      empresaNombre: "Empresa Demo",
      hint: {
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        variantKey: "default",
        repeatedCounts: { asistentes: 1 },
        provisionalName: "BORRADOR - EVALUACION",
      },
      strictDraftPersistence: true,
    });

    expect(mocks.getOrCreateFolder).not.toHaveBeenCalled();
    expect(mocks.createSpreadsheetFile).toHaveBeenCalledWith(
      "BORRADOR - EVALUACION",
      "folder-persisted"
    );
    expect(result.kind).toBe("prepared");
    if (result.kind === "prepared") {
      expect(result.companyFolderId).toBe("folder-persisted");
    }
  });

  it("releases the lease only from finally and never clears it through persistence", async () => {
    await prepareDraftSpreadsheet({
      supabase: { rpc: vi.fn() } as never,
      userId: "user-1",
      draftId: "draft-1",
      formSlug: "evaluacion",
      masterTemplateId: "master-1",
      sheetsFolderId: "folder-root",
      empresaNombre: "Empresa Demo",
      hint: {
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        variantKey: "default",
        repeatedCounts: { asistentes: 1 },
        provisionalName: "BORRADOR - EVALUACION",
      },
      strictDraftPersistence: true,
    });

    expect(
      mocks.updateDraftGooglePrewarm.mock.calls.some(
        (call) => (call[0] as { clearLease?: boolean } | undefined)?.clearLease === true
      )
    ).toBe(false);
    expect(mocks.releaseDraftGooglePrewarmLease).toHaveBeenCalledTimes(1);
  });

  it("rebuilds after an incomplete waited candidate without re-validating the same ready spreadsheet in the polling loop", async () => {
    const readyState = {
      ...buildEmptyState(),
      folderId: "folder-persisted",
      spreadsheetId: "sheet-stale",
      bundleKey: "evaluacion",
      structureSignature: '{"asistentesCount":1}',
      activeSheetName: "2. EVALUACION",
      bundleSheetNames: ["2. EVALUACION"],
      status: "ready" as const,
    };
    mocks.claimDraftGooglePrewarmLease
      .mockResolvedValueOnce(
        buildLeaseState({
          claimed: false,
          leaseOwner: "req-2",
          state: {
            ...buildEmptyState(),
            folderId: "folder-persisted",
          },
        })
      )
      .mockResolvedValueOnce(
        buildLeaseState({
          state: readyState,
        })
      );
    mocks.readDraftGooglePrewarm.mockResolvedValue({
      state: readyState,
      updatedAt: "2026-04-20T00:00:10.000Z",
      leaseOwner: "req-2",
      leaseExpiresAt: "2026-04-20T00:01:00.000Z",
    });
    mocks.listSheets
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ title: "2. EVALUACION", sheetId: 42 }]);

    const result = await prepareDraftSpreadsheet({
      supabase: { rpc: vi.fn() } as never,
      userId: "user-1",
      draftId: "draft-1",
      formSlug: "evaluacion",
      masterTemplateId: "master-1",
      sheetsFolderId: "folder-root",
      empresaNombre: "Empresa Demo",
      hint: {
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        variantKey: "default",
        repeatedCounts: { asistentes: 1 },
        provisionalName: "BORRADOR - EVALUACION",
      },
      strictDraftPersistence: true,
    });

    expect(result.kind).toBe("prepared");
    if (result.kind === "prepared") {
      expect(result.resolution).toBe("after_incomplete");
    }
    expect(mocks.listSheets).toHaveBeenCalledTimes(2);
    expect(mocks.trashDriveFile).toHaveBeenCalledWith("sheet-stale");
  });

  it("renews the lease once around the bundle copy block instead of once per sheet", async () => {
    mocks.getPrewarmActiveSheetName.mockReturnValue("2. EVALUACION");
    mocks.getPrewarmBundleSheetNames.mockReturnValue([
      "2. EVALUACION",
      "2.1 EVALUACION FOTOS",
      "2.2 EVALUACION EXTRA",
    ]);
    mocks.listSheets.mockResolvedValue([
      { title: "2. EVALUACION", sheetId: 42 },
      { title: "2.1 EVALUACION FOTOS", sheetId: 43 },
      { title: "2.2 EVALUACION EXTRA", sheetId: 44 },
    ]);

    await prepareDraftSpreadsheet({
      supabase: { rpc: vi.fn() } as never,
      userId: "user-1",
      draftId: "draft-1",
      formSlug: "evaluacion",
      masterTemplateId: "master-1",
      sheetsFolderId: "folder-root",
      empresaNombre: "Empresa Demo",
      hint: {
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        variantKey: "default",
        repeatedCounts: { asistentes: 1 },
        provisionalName: "BORRADOR - EVALUACION",
      },
      strictDraftPersistence: true,
    });

    expect(mocks.copySheetToSpreadsheet).toHaveBeenCalledTimes(3);
    expect(mocks.renewDraftGooglePrewarmLease).toHaveBeenCalledTimes(5);
  });

  it("hides the provisional blank sheet and keeps only the bundle sheets visible", async () => {
    mocks.getPrewarmBundleSheetNames.mockReturnValue([
      "2. EVALUACION",
      "2.1 EVALUACION FOTOS",
    ]);
    mocks.listSheets.mockResolvedValue([
      { title: "2. EVALUACION", sheetId: 42 },
      { title: "2.1 EVALUACION FOTOS", sheetId: 43 },
      { title: "Hoja 1", sheetId: 99 },
    ]);
    mocks.hideSheets.mockResolvedValue(
      new Map([
        ["2. EVALUACION", 42],
        ["2.1 EVALUACION FOTOS", 43],
      ])
    );

    const result = await prepareDraftSpreadsheet({
      supabase: { rpc: vi.fn() } as never,
      userId: "user-1",
      draftId: "draft-1",
      formSlug: "evaluacion",
      masterTemplateId: "master-1",
      sheetsFolderId: "folder-root",
      empresaNombre: "Empresa Demo",
      hint: {
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        variantKey: "default",
        repeatedCounts: { asistentes: 1 },
        provisionalName: "BORRADOR - EVALUACION",
      },
      strictDraftPersistence: true,
    });

    expect(mocks.hideSheets).toHaveBeenCalledWith("sheet-1", [
      "2. EVALUACION",
      "2.1 EVALUACION FOTOS",
    ]);
    expect(result.kind).toBe("prepared");
    if (result.kind === "prepared") {
      expect(result.activeSheetId).toBe(42);
      expect(result.sheetLink).toBe("https://sheet/sheet-1#gid=42");
    }
  });
});
