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
  getPrewarmSupportSheetNames: vi.fn(),
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
  getPrewarmSupportSheetNames: mocks.getPrewarmSupportSheetNames,
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
    templateRevision: null,
    validatedAt: null,
    activeSheetId: null,
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
    mocks.getPrewarmSupportSheetNames.mockReturnValue(["Caracterizaci\u00f3n"]);
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
    mocks.listSheets.mockResolvedValue([
      { title: "2. EVALUACION", sheetId: 42 },
      { title: "Caracterizaci\u00f3n", sheetId: 77 },
    ]);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("returns unavailable when the remote draft cannot be claimed", async () => {
    mocks.claimDraftGooglePrewarmLease.mockResolvedValue(null);

    const result = await prepareDraftSpreadsheet({
      supabase: { rpc: vi.fn() } as never,
      userId: "user-1",
      draftId: "draft-missing",
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
      mode: "finalization",
    });

    expect(result).toMatchObject({
      kind: "unavailable",
      reason: "draft_not_found",
      prewarmStatus: "unavailable",
      prewarmReused: false,
      prewarmStructureSignature: '{"asistentesCount":1}',
    });
    expect(mocks.createSpreadsheetFile).not.toHaveBeenCalled();
    expect(mocks.releaseDraftGooglePrewarmLease).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      "[draft_spreadsheet.draft_not_found]",
      expect.objectContaining({
        formSlug: "evaluacion",
        draftId: "draft-missing",
        userId: "user-1",
        mode: "finalization",
      })
    );
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

  it("persists ready timing once on cold prewarm", async () => {
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

    const readyPersists = mocks.updateDraftGooglePrewarm.mock.calls.filter(
      (call) => (call[0] as { status?: string }).status === "ready"
    );

    expect(readyPersists).toHaveLength(1);
    expect(result.kind).toBe("prepared");
    if (result.kind === "prepared") {
      expect(result.stateSnapshot.lastRunTiming).toEqual(
        expect.objectContaining({
          requestId: expect.any(String),
          steps: expect.any(Array),
        })
      );
      expect(result.stateSnapshot.lastSuccessfulTiming).toEqual(
        expect.objectContaining({
          requestId: expect.any(String),
          steps: expect.any(Array),
        })
      );
    }
  });

  it("throws and trashes a created spreadsheet when strict persistence returns null", async () => {
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
        if (status === "ready") {
          return null;
        }

        return {
          state: { ...(state as Record<string, unknown>), status },
          updatedAt,
        };
      }
    );

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
    ).rejects.toThrow("Draft removed during prewarm persistence.");

    expect(mocks.trashDriveFile).toHaveBeenCalledWith("sheet-1");
    expect(mocks.updateDraftGooglePrewarm).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
      })
    );
  });

  it("persists ready timing once on reused prewarm", async () => {
    const readyState = {
      ...buildEmptyState(),
      folderId: "folder-persisted",
      spreadsheetId: "sheet-ready",
      bundleKey: "evaluacion",
      structureSignature: '{"asistentesCount":1}',
      activeSheetName: "2. EVALUACION",
      bundleSheetNames: ["2. EVALUACION"],
      status: "ready" as const,
    };
    mocks.claimDraftGooglePrewarmLease.mockResolvedValue(
      buildLeaseState({
        state: readyState,
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

    const readyPersists = mocks.updateDraftGooglePrewarm.mock.calls.filter(
      (call) => (call[0] as { status?: string }).status === "ready"
    );

    expect(mocks.createSpreadsheetFile).not.toHaveBeenCalled();
    expect(readyPersists).toHaveLength(1);
    expect(result.kind).toBe("prepared");
    if (result.kind === "prepared") {
      expect(result.resolution).toBe("reused");
      expect(result.stateSnapshot.lastRunTiming).toEqual(
        expect.objectContaining({
          requestId: expect.any(String),
          steps: expect.any(Array),
        })
      );
      expect(result.stateSnapshot.lastSuccessfulTiming).toEqual(
        expect.objectContaining({
          requestId: expect.any(String),
          steps: expect.any(Array),
        })
      );
    }
  });

  it("reuses a recently validated ready prewarm without calling listSheets", async () => {
    const readyState = {
      ...buildEmptyState(),
      folderId: "folder-persisted",
      spreadsheetId: "sheet-ready",
      bundleKey: "evaluacion",
      structureSignature: '{"asistentesCount":1,"templateRevision":"rev-1"}',
      templateRevision: "rev-1",
      validatedAt: new Date().toISOString(),
      activeSheetId: 42,
      activeSheetName: "2. EVALUACION",
      bundleSheetNames: ["2. EVALUACION"],
      status: "ready" as const,
    };
    mocks.claimDraftGooglePrewarmLease.mockResolvedValue(
      buildLeaseState({
        state: readyState,
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
        structureSignature: '{"asistentesCount":1,"templateRevision":"rev-1"}',
        templateRevision: "rev-1",
        variantKey: "default",
        repeatedCounts: { asistentes: 1 },
        provisionalName: "BORRADOR - EVALUACION",
      } as never,
      strictDraftPersistence: true,
    });

    expect(mocks.listSheets).not.toHaveBeenCalled();
    expect(mocks.createSpreadsheetFile).not.toHaveBeenCalled();
    expect(result.kind).toBe("prepared");
    if (result.kind === "prepared") {
      expect(result.resolution).toBe("reused");
      expect(result.activeSheetId).toBe(42);
      expect(result.summary).toMatchObject({
        templateRevision: "rev-1",
        validatedAt: expect.any(String),
      });
    }
  });

  it("revalidates an expired ready prewarm and persists a fresh validatedAt timestamp", async () => {
    const readyState = {
      ...buildEmptyState(),
      folderId: "folder-persisted",
      spreadsheetId: "sheet-ready",
      bundleKey: "evaluacion",
      structureSignature: '{"asistentesCount":1,"templateRevision":"rev-1"}',
      templateRevision: "rev-1",
      validatedAt: "2020-01-01T00:00:00.000Z",
      activeSheetId: 42,
      activeSheetName: "2. EVALUACION",
      bundleSheetNames: ["2. EVALUACION"],
      status: "ready" as const,
    };
    mocks.claimDraftGooglePrewarmLease.mockResolvedValue(
      buildLeaseState({
        state: readyState,
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
        structureSignature: '{"asistentesCount":1,"templateRevision":"rev-1"}',
        templateRevision: "rev-1",
        variantKey: "default",
        repeatedCounts: { asistentes: 1 },
        provisionalName: "BORRADOR - EVALUACION",
      } as never,
      strictDraftPersistence: true,
    });

    expect(mocks.listSheets).toHaveBeenCalledTimes(1);
    expect(mocks.updateDraftGooglePrewarm).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ready",
        state: expect.objectContaining({
          templateRevision: "rev-1",
          validatedAt: expect.any(String),
          activeSheetId: 42,
        }),
      })
    );
    expect(result.kind).toBe("prepared");
  });

  it("refreshes validatedAt after waiting for another prewarm to finish", async () => {
    const readyState = {
      ...buildEmptyState(),
      folderId: "folder-persisted",
      spreadsheetId: "sheet-ready",
      bundleKey: "evaluacion",
      structureSignature: '{"asistentesCount":1,"templateRevision":"rev-1"}',
      templateRevision: "rev-1",
      validatedAt: "2020-01-01T00:00:00.000Z",
      activeSheetId: null,
      activeSheetName: "2. EVALUACION",
      bundleSheetNames: ["2. EVALUACION"],
      status: "ready" as const,
    };
    mocks.claimDraftGooglePrewarmLease.mockResolvedValueOnce(
      buildLeaseState({
        claimed: false,
        leaseOwner: "req-2",
        leaseExpiresAt: "2099-04-20T00:01:00.000Z",
        state: {
          ...buildEmptyState(),
          folderId: "folder-persisted",
        },
      })
    );
    mocks.readDraftGooglePrewarm.mockResolvedValueOnce({
      state: readyState,
      updatedAt: "2026-04-20T00:00:10.000Z",
      leaseOwner: "req-2",
      leaseExpiresAt: "2099-04-20T00:01:00.000Z",
    });

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
        structureSignature: '{"asistentesCount":1,"templateRevision":"rev-1"}',
        templateRevision: "rev-1",
        variantKey: "default",
        repeatedCounts: { asistentes: 1 },
        provisionalName: "BORRADOR - EVALUACION",
      } as never,
      strictDraftPersistence: true,
    });

    expect(mocks.listSheets).toHaveBeenCalledTimes(1);
    expect(mocks.updateDraftGooglePrewarm).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ready",
        onlyIfUpdatedAt: "2026-04-20T00:00:10.000Z",
        state: expect.objectContaining({
          spreadsheetId: "sheet-ready",
          templateRevision: "rev-1",
          validatedAt: expect.any(String),
          activeSheetId: 42,
        }),
      })
    );
    expect(result.kind).toBe("prepared");
    if (result.kind === "prepared") {
      expect(result.resolution).toBe("reused");
      expect(result.summary?.validatedAt).toEqual(expect.any(String));
    }
    expect(mocks.createSpreadsheetFile).not.toHaveBeenCalled();
    expect(mocks.releaseDraftGooglePrewarmLease).not.toHaveBeenCalled();
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
      .mockResolvedValueOnce([
        { title: "2. EVALUACION", sheetId: 42 },
        { title: "Caracterizaci\u00f3n", sheetId: 77 },
      ]);

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

  it("copies Caracterizacion before the bundle so dependent formulas resolve on first paint", async () => {
    mocks.getPrewarmBundleSheetNames.mockReturnValue(["2. EVALUACION"]);
    mocks.getPrewarmSupportSheetNames.mockReturnValue(["Caracterizaci\u00f3n"]);
    mocks.listSheets.mockResolvedValue([
      { title: "2. EVALUACION", sheetId: 42 },
      { title: "Caracterizaci\u00f3n", sheetId: 77 },
      { title: "Hoja 1", sheetId: 99 },
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

    expect(mocks.copySheetToSpreadsheet).toHaveBeenCalledTimes(2);
    // Support sheets must land before the bundle so cross-sheet formulas
    // (e.g. "2.1 EVALUACION FOTOS" pointing at Caracterizacion) resolve to
    // an existing target on copy and avoid cached `#REF!` evaluations.
    expect(mocks.copySheetToSpreadsheet).toHaveBeenNthCalledWith(
      1,
      "master-1",
      "Caracterizaci\u00f3n",
      "sheet-1",
      "Caracterizaci\u00f3n"
    );
    expect(mocks.copySheetToSpreadsheet).toHaveBeenNthCalledWith(
      2,
      "master-1",
      "2. EVALUACION",
      "sheet-1",
      "2. EVALUACION"
    );
    expect(mocks.hideSheets).toHaveBeenCalledWith("sheet-1", ["2. EVALUACION"]);
  });

  it("skips Caracterizacion when the form-specific support list is empty", async () => {
    mocks.getPrewarmActiveSheetName.mockReturnValue(
      "3. REVISI\u00d3N DE LAS CONDICIONES DE LA VACANTE"
    );
    mocks.getPrewarmBundleSheetNames.mockReturnValue([
      "3. REVISI\u00d3N DE LAS CONDICIONES DE LA VACANTE",
    ]);
    mocks.getPrewarmSupportSheetNames.mockReturnValue([]);
    mocks.listSheets.mockResolvedValue([
      {
        title: "3. REVISI\u00d3N DE LAS CONDICIONES DE LA VACANTE",
        sheetId: 42,
      },
      { title: "Hoja 1", sheetId: 99 },
    ]);

    await prepareDraftSpreadsheet({
      supabase: { rpc: vi.fn() } as never,
      userId: "user-1",
      draftId: "draft-1",
      formSlug: "condiciones-vacante",
      masterTemplateId: "master-1",
      sheetsFolderId: "folder-root",
      empresaNombre: "Empresa Demo",
      hint: {
        bundleKey: "condiciones-vacante",
        structureSignature: '{"asistentesCount":1,"discapacidadesCount":1}',
        variantKey: "default",
        repeatedCounts: { asistentes: 1, discapacidades: 1 },
        provisionalName: "BORRADOR - CONDICIONES",
      },
      strictDraftPersistence: true,
    });

    expect(mocks.copySheetToSpreadsheet).toHaveBeenCalledTimes(1);
    expect(mocks.copySheetToSpreadsheet).toHaveBeenCalledWith(
      "master-1",
      "3. REVISI\u00d3N DE LAS CONDICIONES DE LA VACANTE",
      "sheet-1",
      "3. REVISI\u00d3N DE LAS CONDICIONES DE LA VACANTE"
    );
    expect(mocks.hideSheets).toHaveBeenCalledWith("sheet-1", [
      "3. REVISI\u00d3N DE LAS CONDICIONES DE LA VACANTE",
    ]);
  });

  it("does not inject Caracterizacion for interprete-lsc drafts", async () => {
    mocks.getPrewarmActiveSheetName.mockReturnValue("Maestro");
    mocks.getPrewarmBundleSheetNames.mockReturnValue(["Maestro"]);
    mocks.getPrewarmSupportSheetNames.mockReturnValue([]);
    mocks.hideSheets.mockResolvedValue(new Map([["Maestro", 1562069061]]));
    mocks.listSheets.mockResolvedValue([{ title: "Maestro", sheetId: 1562069061 }]);

    const result = await prepareDraftSpreadsheet({
      supabase: { rpc: vi.fn() } as never,
      userId: "user-1",
      draftId: "draft-1",
      formSlug: "interprete-lsc",
      masterTemplateId: "master-lsc",
      sheetsFolderId: "folder-root",
      empresaNombre: "Empresa Demo",
      hint: {
        bundleKey: "interprete-lsc",
        structureSignature:
          '{"asistentesOverflow":1,"interpretesOverflow":1,"oferentesOverflow":1}',
        variantKey: "default",
        repeatedCounts: { oferentes: 8, interpretes: 2, asistentes: 3 },
        provisionalName: "BORRADOR - INTERPRETE LSC",
      },
      strictDraftPersistence: true,
    });

    expect(mocks.copySheetToSpreadsheet).toHaveBeenCalledTimes(1);
    expect(mocks.copySheetToSpreadsheet).toHaveBeenCalledWith(
      "master-lsc",
      "Maestro",
      "sheet-1",
      "Maestro"
    );
    expect(mocks.hideSheets).toHaveBeenCalledWith("sheet-1", ["Maestro"]);
    expect(result.kind).toBe("prepared");
    if (result.kind === "prepared") {
      expect(result.activeSheetName).toBe("Maestro");
      expect(result.activeSheetId).toBe(1562069061);
    }
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
      { title: "Caracterizaci\u00f3n", sheetId: 77 },
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

    expect(mocks.copySheetToSpreadsheet).toHaveBeenCalledTimes(4);
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
      { title: "Caracterizaci\u00f3n", sheetId: 77 },
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
