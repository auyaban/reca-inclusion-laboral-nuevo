import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FinalizationPrewarmPreparationError,
  buildFinalizationProfilerPersistence,
  prepareFinalizationSpreadsheetPipeline,
  prepareSpreadsheetForFinalization,
  type FinalizationSpreadsheetSupabaseClient,
} from "@/lib/finalization/finalizationSpreadsheet";
import { createFinalizationProfiler } from "@/lib/finalization/profiler";
import { createTimingTracker } from "@/lib/finalization/timingTracker";
import type { PrewarmHint } from "@/lib/finalization/prewarmTypes";

type PrepareSpreadsheetForFinalizationOptions = Parameters<
  typeof prepareSpreadsheetForFinalization
>[0];
type RunGoogleStep = Parameters<
  typeof prepareFinalizationSpreadsheetPipeline
>[0]["runGoogleStep"];

const mocks = vi.hoisted(() => ({
  isFinalizationPrewarmEnabled: vi.fn(),
  getOrCreateFolder: vi.fn(),
  sanitizeFileName: vi.fn(),
  renameDriveFile: vi.fn(),
  prepareCompanySpreadsheet: vi.fn(),
  prepareDraftSpreadsheet: vi.fn(),
  markDraftGooglePrewarmStatus: vi.fn(),
}));

vi.mock("@/lib/finalization/prewarmConfig", () => ({
  isFinalizationPrewarmEnabled: mocks.isFinalizationPrewarmEnabled,
}));

vi.mock("@/lib/google/drive", () => ({
  getOrCreateFolder: mocks.getOrCreateFolder,
  renameDriveFile: mocks.renameDriveFile,
  sanitizeFileName: mocks.sanitizeFileName,
}));

vi.mock("@/lib/google/companySpreadsheet", () => ({
  prepareCompanySpreadsheet: mocks.prepareCompanySpreadsheet,
}));

vi.mock("@/lib/google/draftSpreadsheet", () => ({
  prepareDraftSpreadsheet: mocks.prepareDraftSpreadsheet,
}));

vi.mock("@/lib/drafts/serverDraftPrewarm", () => ({
  markDraftGooglePrewarmStatus: mocks.markDraftGooglePrewarmStatus,
}));

function buildHint(overrides: Partial<PrewarmHint> = {}): PrewarmHint {
  return {
    bundleKey: "evaluacion",
    structureSignature: '{"asistentesCount":1}',
    variantKey: "default",
    repeatedCounts: { asistentes: 1 },
    provisionalName: "BORRADOR - EVALUACION",
    ...overrides,
  };
}

function buildOptions(): PrepareSpreadsheetForFinalizationOptions {
  return {
    supabase: { rpc: vi.fn() } as unknown as FinalizationSpreadsheetSupabaseClient,
    userId: "user-1",
    formSlug: "evaluacion",
    masterTemplateId: "master-1",
    sheetsFolderId: "folder-root",
    empresaNombre: "Empresa Demo",
    identity: {
      local_draft_session_id: "session-1",
      draft_id: "draft-1",
    },
    hint: buildHint(),
    fallbackSpreadsheetName: "Evaluacion - final",
    activeSheetName: "2. EVALUACION",
    mutation: {
      writes: [{ range: "A1", value: "hola" }],
      footerActaRefs: [{ sheetName: "2. EVALUACION", actaRef: "ACTA-1" }],
      autoResizeExcludedRows: { "2. EVALUACION": [1] },
      rowInsertions: [
        { sheetName: "2. EVALUACION", insertAtRow: 10, count: 2 },
      ],
    },
  };
}

function createSupabaseStub(): FinalizationSpreadsheetSupabaseClient {
  return { rpc: vi.fn() } as unknown as FinalizationSpreadsheetSupabaseClient;
}

function createRunGoogleStepMock() {
  const spy = vi.fn(
    async (
      _stage: string,
      operation: () => Promise<unknown>,
      successLabel?: string
    ) => {
      void successLabel;
      return operation();
    }
  );

  const runGoogleStep: RunGoogleStep = async <T,>(
    stage: string,
    operation: () => Promise<T>,
    successLabel?: string
  ) => spy(stage, operation, successLabel) as Promise<T>;

  return { runGoogleStep, spy };
}

function createPostResponseSchedulerMock() {
  const tasks: Array<() => Promise<void>> = [];
  const schedulePostResponseTask = vi.fn((task: () => Promise<void>) => {
    tasks.push(task);
  });

  return {
    schedulePostResponseTask,
    tasks,
    runScheduledTask: async (index = 0) => {
      const task = tasks[index];
      if (!task) {
        throw new Error(`Missing scheduled task at index ${index}.`);
      }

      await task();
    },
  };
}

describe("prepareSpreadsheetForFinalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sanitizeFileName.mockImplementation((value: string) => value);
    mocks.markDraftGooglePrewarmStatus.mockResolvedValue(null);
    mocks.renameDriveFile.mockResolvedValue(undefined);
  });

  it("returns disabled path when rollout is off", async () => {
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(false);
    mocks.getOrCreateFolder.mockResolvedValue("company-folder");
    mocks.prepareCompanySpreadsheet.mockResolvedValue({
      spreadsheetId: "sheet-1",
      effectiveMutation: { writes: [] },
      activeSheetName: "2. EVALUACION",
      activeSheetId: 99,
      sheetLink: "https://sheet",
      reusedSpreadsheet: false,
    });

    const result = await prepareSpreadsheetForFinalization(buildOptions());

    expect(result.prewarmStatus).toBe("disabled");
    expect(result.activeSheetId).toBe(99);
    expect(result.companyFolderId).toBe("company-folder");
    expect(result.spreadsheetResourceMode).toBe("legacy_company");
  });

  it("throws when fallback preparation cannot resolve the active sheet", async () => {
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(false);
    mocks.getOrCreateFolder.mockResolvedValue("company-folder");
    mocks.prepareCompanySpreadsheet.mockResolvedValue({
      spreadsheetId: "sheet-1",
      effectiveMutation: { writes: [] },
      activeSheetName: "2. EVALUACION",
      activeSheetId: undefined,
      sheetLink: "https://sheet",
      reusedSpreadsheet: false,
    });

    await expect(prepareSpreadsheetForFinalization(buildOptions())).rejects.toThrow(
      'No se pudo resolver la hoja activa "2. EVALUACION" en el spreadsheet final.'
    );
  });

  it("maps a reused prewarm to reused_ready", async () => {
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(true);
    mocks.prepareDraftSpreadsheet.mockResolvedValue({
      kind: "prepared",
      resolution: "reused",
      spreadsheetId: "sheet-1",
      companyFolderId: "company-folder",
      activeSheetName: "2. EVALUACION",
      activeSheetId: 42,
      sheetLink: "https://sheet",
      prewarmStatus: "ready",
      prewarmReused: true,
      prewarmStructureSignature: '{"asistentesCount":1}',
      summary: {
        folderId: "company-folder",
        spreadsheetId: "sheet-1",
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        activeSheetName: "2. EVALUACION",
        updatedAt: "2026-04-20T00:00:00.000Z",
      },
      stateSnapshot: {
        version: 1,
        folderId: "company-folder",
        spreadsheetId: "sheet-1",
        provisionalName: "BORRADOR - EVALUACION",
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        activeSheetName: "2. EVALUACION",
        bundleSheetNames: ["2. EVALUACION"],
        status: "ready",
        lastError: null,
        attemptCount: 1,
        lastRunTiming: null,
        lastSuccessfulTiming: null,
      },
      structuralMutation: { writes: [] },
      timing: {
        requestId: "req-1",
        startedAt: "2026-04-20T00:00:00.000Z",
        totalMs: 10,
        steps: [],
      },
    });

    const result = await prepareSpreadsheetForFinalization(buildOptions());

    expect(result.prewarmStatus).toBe("reused_ready");
    expect(result.prewarmReused).toBe(true);
    expect(result.activeSheetId).toBe(42);
    expect(result.spreadsheetResourceMode).toBe("draft_prewarm");
  });

  it("maps a rebuilt stale prewarm to inline_after_stale", async () => {
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(true);
    mocks.prepareDraftSpreadsheet.mockResolvedValue({
      kind: "prepared",
      resolution: "after_stale",
      spreadsheetId: "sheet-1",
      companyFolderId: "company-folder",
      activeSheetName: "2. EVALUACION",
      activeSheetId: 42,
      sheetLink: "https://sheet",
      prewarmStatus: "rebuilt",
      prewarmReused: false,
      prewarmStructureSignature: '{"asistentesCount":1}',
      summary: {
        folderId: "company-folder",
        spreadsheetId: "sheet-1",
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        activeSheetName: "2. EVALUACION",
        updatedAt: "2026-04-20T00:00:00.000Z",
      },
      stateSnapshot: {
        version: 1,
        folderId: "company-folder",
        spreadsheetId: "sheet-1",
        provisionalName: "BORRADOR - EVALUACION",
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        activeSheetName: "2. EVALUACION",
        bundleSheetNames: ["2. EVALUACION"],
        status: "ready",
        lastError: null,
        attemptCount: 1,
        lastRunTiming: null,
        lastSuccessfulTiming: null,
      },
      structuralMutation: {
        writes: [],
        rowInsertions: [
          { sheetName: "2. EVALUACION", insertAtRow: 10, count: 2 },
        ],
      },
      timing: {
        requestId: "req-1",
        startedAt: "2026-04-20T00:00:00.000Z",
        totalMs: 10,
        steps: [],
      },
    });

    const result = await prepareSpreadsheetForFinalization(buildOptions());

    expect(result.prewarmStatus).toBe("inline_after_stale");
    expect(result.prewarmReused).toBe(false);
    expect(result.spreadsheetResourceMode).toBe("draft_prewarm");
    expect(result.effectiveMutation).toEqual({
      writes: [{ range: "A1", value: "hola" }],
      footerActaRefs: [{ sheetName: "2. EVALUACION", actaRef: "ACTA-1" }],
      autoResizeExcludedRows: { "2. EVALUACION": [1] },
    });
  });

  it("falls back to the legacy company spreadsheet when the draft is missing remotely", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(true);
    mocks.prepareDraftSpreadsheet.mockResolvedValue({
      kind: "unavailable",
      reason: "draft_not_found",
      prewarmStatus: "unavailable",
      prewarmReused: false,
      prewarmStructureSignature: '{"asistentesCount":1}',
      timing: {
        requestId: "req-1",
        startedAt: "2026-04-20T00:00:00.000Z",
        totalMs: 5,
        steps: [],
      },
    });
    mocks.prepareCompanySpreadsheet.mockResolvedValue({
      spreadsheetId: "sheet-fallback",
      effectiveMutation: { writes: [] },
      activeSheetName: "2. EVALUACION",
      activeSheetId: 56,
      sheetLink: "https://sheet-fallback",
      reusedSpreadsheet: false,
    });

    try {
      const result = await prepareSpreadsheetForFinalization(buildOptions());

      expect(result.prewarmStatus).toBe("inline_missing_draft");
      expect(result.prewarmReused).toBe(false);
      expect(result.spreadsheetResourceMode).toBe("legacy_company");
      expect(result.spreadsheetId).toBe("sheet-fallback");
      expect(mocks.prepareCompanySpreadsheet).toHaveBeenCalledOnce();
      expect(warnSpy).toHaveBeenCalledWith(
        "[finalization.prewarm_draft_missing]",
        expect.objectContaining({
          formSlug: "evaluacion",
          draftId: "draft-1",
          reason: "draft_not_found",
        })
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("wraps the legacy fallback failure in a typed error when the draft is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(true);
    mocks.prepareDraftSpreadsheet.mockResolvedValue({
      kind: "unavailable",
      reason: "draft_not_found",
      prewarmStatus: "unavailable",
      prewarmReused: false,
      prewarmStructureSignature: '{"asistentesCount":1}',
      timing: {
        requestId: "req-1",
        startedAt: "2026-04-20T00:00:00.000Z",
        totalMs: 5,
        steps: [],
      },
    });
    mocks.prepareCompanySpreadsheet.mockRejectedValue(new Error("legacy-down"));

    try {
      await expect(prepareSpreadsheetForFinalization(buildOptions())).rejects.toMatchObject(
        {
          name: "FinalizationPrewarmPreparationError",
          message: "legacy-down",
          context: {
            prewarmStatus: "inline_missing_draft",
            prewarmReused: false,
            prewarmStructureSignature: '{"asistentesCount":1}',
            budget: null,
          },
        } satisfies Partial<FinalizationPrewarmPreparationError>
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("falls back to the legacy company spreadsheet when prewarm stays busy", async () => {
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(true);
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
      leaseExpiresAt: "2026-04-20T00:00:15.000Z",
      summary: {
        folderId: "company-folder",
        spreadsheetId: "sheet-busy",
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        activeSheetName: "2. EVALUACION",
        updatedAt: "2026-04-20T00:00:10.000Z",
      },
    });
    mocks.prepareCompanySpreadsheet.mockResolvedValue({
      spreadsheetId: "sheet-fallback",
      effectiveMutation: { writes: [] },
      activeSheetName: "2. EVALUACION",
      activeSheetId: 56,
      sheetLink: "https://sheet-fallback",
      reusedSpreadsheet: false,
    });

    const result = await prepareSpreadsheetForFinalization(buildOptions());

    expect(result.prewarmStatus).toBe("inline_after_busy");
    expect(result.prewarmReused).toBe(false);
    expect(result.spreadsheetResourceMode).toBe("legacy_company");
    expect(result.spreadsheetId).toBe("sheet-fallback");
    expect(mocks.prepareCompanySpreadsheet).toHaveBeenCalledWith(
      expect.objectContaining({
        companyFolderId: "company-folder",
      })
    );
  });

  it("logs a risk warning before falling back when the remaining budget is low", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(true);
    mocks.prepareDraftSpreadsheet.mockResolvedValue({
      kind: "busy",
      prewarmStatus: "busy",
      prewarmReused: false,
      prewarmStructureSignature: '{"asistentesCount":1}',
      timing: {
        requestId: "req-1",
        startedAt: "2026-04-20T00:00:00.000Z",
        totalMs: 31_000,
        steps: [],
      },
      leaseOwner: "req-2",
      leaseExpiresAt: "2026-04-20T00:00:15.000Z",
      summary: {
        folderId: "company-folder",
        spreadsheetId: "sheet-busy",
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        activeSheetName: "2. EVALUACION",
        updatedAt: "2026-04-20T00:00:10.000Z",
      },
    });
    mocks.prepareCompanySpreadsheet.mockResolvedValue({
      spreadsheetId: "sheet-fallback",
      effectiveMutation: { writes: [] },
      activeSheetName: "2. EVALUACION",
      activeSheetId: 56,
      sheetLink: "https://sheet-fallback",
      reusedSpreadsheet: false,
    });

    try {
      await expect(prepareSpreadsheetForFinalization(buildOptions())).resolves.toMatchObject(
        {
          spreadsheetId: "sheet-fallback",
          prewarmStatus: "inline_after_busy",
        }
      );
      expect(warnSpy).toHaveBeenCalledWith(
        "[finalization.prewarm_budget_risk]",
        expect.objectContaining({
          formSlug: "evaluacion",
          draftId: "draft-1",
          elapsedMs: 31_000,
          remainingMs: 29_000,
        })
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("throws a typed error when busy fallback also fails", async () => {
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(true);
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
    mocks.getOrCreateFolder.mockResolvedValue("company-folder");
    mocks.prepareCompanySpreadsheet.mockRejectedValue(new Error("legacy-down"));

    await expect(prepareSpreadsheetForFinalization(buildOptions())).rejects.toMatchObject(
      {
        name: "FinalizationPrewarmPreparationError",
        context: {
          prewarmStatus: "inline_after_busy",
          prewarmReused: false,
          prewarmStructureSignature: '{"asistentesCount":1}',
          budget: expect.objectContaining({
            elapsedMs: 10,
            remainingMs: 59_990,
          }),
        },
      } satisfies Partial<FinalizationPrewarmPreparationError>
    );
  });

  it("skips the legacy fallback when the remaining request budget is too low", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(true);
    mocks.prepareDraftSpreadsheet.mockResolvedValue({
      kind: "busy",
      prewarmStatus: "busy",
      prewarmReused: false,
      prewarmStructureSignature: '{"asistentesCount":1}',
      timing: {
        requestId: "req-1",
        startedAt: "2026-04-20T00:00:00.000Z",
        totalMs: 36_000,
        steps: [],
      },
      leaseOwner: "req-2",
      leaseExpiresAt: null,
      summary: {
        folderId: "company-folder",
        spreadsheetId: "sheet-busy",
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        activeSheetName: "2. EVALUACION",
        updatedAt: "2026-04-20T00:00:10.000Z",
      },
    });

    try {
      await expect(prepareSpreadsheetForFinalization(buildOptions())).rejects.toMatchObject(
        {
          name: "FinalizationPrewarmPreparationError",
          context: {
            prewarmStatus: "inline_skipped_low_budget",
            prewarmReused: false,
            prewarmStructureSignature: '{"asistentesCount":1}',
            budget: expect.objectContaining({
              elapsedMs: 36_000,
              remainingMs: 24_000,
            }),
          },
        } satisfies Partial<FinalizationPrewarmPreparationError>
      );
      expect(mocks.prepareCompanySpreadsheet).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        "[finalization.prewarm_budget_guard_blocked]",
        expect.objectContaining({
          formSlug: "evaluacion",
          draftId: "draft-1",
          elapsedMs: 36_000,
          remainingMs: 24_000,
        })
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("seals the draft before scheduling the final rename", async () => {
    const { sealPreparedSpreadsheetAfterPersistence } = await import(
      "@/lib/finalization/finalizationSpreadsheet"
    );
    const scheduler = createPostResponseSchedulerMock();

    await sealPreparedSpreadsheetAfterPersistence({
      supabase: createSupabaseStub(),
      userId: "user-1",
      identity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      preparedSpreadsheet: {
        spreadsheetId: "sheet-1",
        companyFolderId: "company-folder",
        spreadsheetResourceMode: "draft_prewarm",
        prewarmStateSnapshot: {
          version: 1,
          folderId: "company-folder",
          spreadsheetId: "sheet-1",
          provisionalName: "BORRADOR - EVALUACION",
          bundleKey: "evaluacion",
          structureSignature: '{"asistentesCount":1}',
          activeSheetName: "2. EVALUACION",
          bundleSheetNames: ["2. EVALUACION"],
          status: "ready",
          lastError: null,
          attemptCount: 1,
          lastRunTiming: null,
          lastSuccessfulTiming: null,
        },
      },
      hint: {
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
      },
      finalDocumentBaseName: "EVALUACION-20_Apr_2026",
      scheduleRename: scheduler.schedulePostResponseTask,
    });

    expect(mocks.markDraftGooglePrewarmStatus).toHaveBeenCalledOnce();
    expect(scheduler.schedulePostResponseTask).toHaveBeenCalledOnce();
    expect(mocks.renameDriveFile).not.toHaveBeenCalled();
    expect(
      mocks.markDraftGooglePrewarmStatus.mock.invocationCallOrder[0]
    ).toBeLessThan(
      scheduler.schedulePostResponseTask.mock.invocationCallOrder[0]
    );

    await scheduler.runScheduledTask();

    expect(mocks.renameDriveFile).toHaveBeenCalledWith(
      "sheet-1",
      "EVALUACION-20_Apr_2026"
    );
  });

  it("logs scheduled rename failures without rejecting the seal", async () => {
    const { sealPreparedSpreadsheetAfterPersistence } = await import(
      "@/lib/finalization/finalizationSpreadsheet"
    );
    const scheduler = createPostResponseSchedulerMock();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.renameDriveFile.mockRejectedValue(new Error("rename-down"));

    try {
      await sealPreparedSpreadsheetAfterPersistence({
        supabase: createSupabaseStub(),
        userId: "user-1",
        identity: {
          draft_id: "draft-1",
          local_draft_session_id: "session-1",
        },
        preparedSpreadsheet: {
          spreadsheetId: "sheet-1",
          companyFolderId: "company-folder",
          spreadsheetResourceMode: "draft_prewarm",
          prewarmStateSnapshot: {
            version: 1,
            folderId: "company-folder",
            spreadsheetId: "sheet-1",
            provisionalName: "BORRADOR - EVALUACION",
            bundleKey: "evaluacion",
            structureSignature: '{"asistentesCount":1}',
            activeSheetName: "2. EVALUACION",
            bundleSheetNames: ["2. EVALUACION"],
            status: "ready",
            lastError: null,
            attemptCount: 1,
            lastRunTiming: null,
            lastSuccessfulTiming: null,
          },
        },
        hint: {
          bundleKey: "evaluacion",
          structureSignature: '{"asistentesCount":1}',
        },
        finalDocumentBaseName: "EVALUACION-20_Apr_2026",
        scheduleRename: scheduler.schedulePostResponseTask,
      });

      await expect(scheduler.runScheduledTask()).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        "[finalization.rename_final_file] failed",
        expect.objectContaining({
          spreadsheetId: "sheet-1",
          finalDocumentBaseName: "EVALUACION-20_Apr_2026",
          error: expect.any(Error),
        })
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("schedules legacy fallback renames without touching draft prewarm status", async () => {
    const { sealPreparedSpreadsheetAfterPersistence } = await import(
      "@/lib/finalization/finalizationSpreadsheet"
    );
    const scheduler = createPostResponseSchedulerMock();

    await sealPreparedSpreadsheetAfterPersistence({
      supabase: createSupabaseStub(),
      userId: "user-1",
      identity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      preparedSpreadsheet: {
        spreadsheetId: "sheet-1",
        companyFolderId: "company-folder",
        spreadsheetResourceMode: "legacy_company",
        prewarmStateSnapshot: null,
      },
      hint: {
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
      },
      finalDocumentBaseName: "EVALUACION-20_Apr_2026",
      scheduleRename: scheduler.schedulePostResponseTask,
    });

    expect(mocks.markDraftGooglePrewarmStatus).not.toHaveBeenCalled();
    expect(scheduler.schedulePostResponseTask).toHaveBeenCalledOnce();
    expect(mocks.renameDriveFile).not.toHaveBeenCalled();

    await scheduler.runScheduledTask();

    expect(
      mocks.renameDriveFile
    ).toHaveBeenCalledWith("sheet-1", "EVALUACION-20_Apr_2026");
  });

  it("builds a shared pipeline context for draft prewarm resources", async () => {
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(true);
    mocks.prepareDraftSpreadsheet.mockResolvedValue({
      kind: "prepared",
      resolution: "reused",
      spreadsheetId: "sheet-1",
      companyFolderId: "company-folder",
      activeSheetName: "2. EVALUACION",
      activeSheetId: 42,
      sheetLink: "https://sheet",
      prewarmStatus: "ready",
      prewarmReused: true,
      prewarmStructureSignature: '{"asistentesCount":1}',
      summary: null,
      stateSnapshot: {
        version: 1,
        folderId: "company-folder",
        spreadsheetId: "sheet-1",
        provisionalName: "BORRADOR - EVALUACION",
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
        activeSheetName: "2. EVALUACION",
        bundleSheetNames: ["2. EVALUACION"],
        status: "ready",
        lastError: null,
        attemptCount: 1,
        lastRunTiming: null,
        lastSuccessfulTiming: null,
      },
      structuralMutation: { writes: [] },
      timing: {
        requestId: "req-1",
        startedAt: "2026-04-20T00:00:00.000Z",
        totalMs: 10,
        steps: [],
      },
    });

    const markStage = vi.fn().mockResolvedValue(undefined);
    const { runGoogleStep, spy: runGoogleStepSpy } = createRunGoogleStepMock();
    const scheduler = createPostResponseSchedulerMock();
    const tracker = createFinalizationProfiler("evaluacion");

    const pipeline = await prepareFinalizationSpreadsheetPipeline({
      ...buildOptions(),
      supabase: createSupabaseStub(),
      runGoogleStep,
      markStage,
      tracker,
      logPrefix: "evaluacion",
      schedulePostResponseTask: scheduler.schedulePostResponseTask,
    });

    expect(pipeline.preparedSpreadsheet.spreadsheetResourceMode).toBe(
      "draft_prewarm"
    );
    expect(pipeline.trackingContext).toEqual({
      prewarmStatus: "reused_ready",
      prewarmReused: true,
      prewarmStructureSignature: '{"asistentesCount":1}',
    });

    await pipeline.sealAfterPersistence({
      supabase: createSupabaseStub(),
      userId: "user-1",
      identity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      hint: {
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
      },
      finalDocumentBaseName: "EVALUACION-20_Apr_2026",
    });

    expect(runGoogleStepSpy).not.toHaveBeenCalledWith(
      "drive.rename_final_file",
      expect.any(Function),
      undefined
    );
    expect(scheduler.schedulePostResponseTask).toHaveBeenCalledOnce();
    expect(mocks.renameDriveFile).not.toHaveBeenCalled();

    await scheduler.runScheduledTask();

    expect(mocks.renameDriveFile).toHaveBeenCalledWith(
      "sheet-1",
      "EVALUACION-20_Apr_2026"
    );
  });

  it("builds a shared pipeline context for legacy fallback resources", async () => {
    mocks.isFinalizationPrewarmEnabled.mockReturnValue(false);
    mocks.getOrCreateFolder.mockResolvedValue("company-folder");
    mocks.prepareCompanySpreadsheet.mockResolvedValue({
      spreadsheetId: "sheet-legacy",
      effectiveMutation: { writes: [] },
      activeSheetName: "2. EVALUACION",
      activeSheetId: 12,
      sheetLink: "https://legacy-sheet",
      reusedSpreadsheet: true,
    });

    const markStage = vi.fn().mockResolvedValue(undefined);
    const { runGoogleStep } = createRunGoogleStepMock();
    const scheduler = createPostResponseSchedulerMock();
    const tracker = createFinalizationProfiler("evaluacion");

    const pipeline = await prepareFinalizationSpreadsheetPipeline({
      ...buildOptions(),
      supabase: createSupabaseStub(),
      runGoogleStep,
      markStage,
      tracker,
      logPrefix: "evaluacion",
      schedulePostResponseTask: scheduler.schedulePostResponseTask,
    });

    expect(pipeline.preparedSpreadsheet.spreadsheetResourceMode).toBe(
      "legacy_company"
    );
    expect(pipeline.trackingContext.prewarmStatus).toBe("disabled");

    await pipeline.sealAfterPersistence({
      supabase: createSupabaseStub(),
      userId: "user-1",
      identity: {
        draft_id: "draft-1",
        local_draft_session_id: "session-1",
      },
      hint: {
        bundleKey: "evaluacion",
        structureSignature: '{"asistentesCount":1}',
      },
      finalDocumentBaseName: "EVALUACION-20_Apr_2026",
    });

    expect(mocks.markDraftGooglePrewarmStatus).not.toHaveBeenCalled();
    expect(scheduler.schedulePostResponseTask).toHaveBeenCalledOnce();
  });

  it("persists profiler steps from either tracker implementation", () => {
    const profiler = createFinalizationProfiler("evaluacion");
    profiler.mark("request.parse_json");

    const timingTracker = createTimingTracker("req-1");
    timingTracker.mark("drive.resolve_company_folder");

    expect(buildFinalizationProfilerPersistence({ profiler })).toEqual({
      totalDurationMs: expect.any(Number),
      profilingSteps: [
        expect.objectContaining({ label: "request.parse_json" }),
      ],
    });
    expect(buildFinalizationProfilerPersistence({ profiler: timingTracker })).toEqual({
      totalDurationMs: expect.any(Number),
      profilingSteps: [
        expect.objectContaining({ label: "drive.resolve_company_folder" }),
      ],
    });
  });
});
