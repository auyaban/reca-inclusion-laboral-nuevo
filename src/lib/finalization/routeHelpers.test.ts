import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  inspectFooterActaWritesMock,
  writeFooterActaMarkerMock,
  applyFormSheetStructureInsertionsMock,
  applyFormSheetCellWritesMock,
} = vi.hoisted(() => ({
  inspectFooterActaWritesMock: vi.fn(),
  writeFooterActaMarkerMock: vi.fn(),
  applyFormSheetStructureInsertionsMock: vi.fn(),
  applyFormSheetCellWritesMock: vi.fn(),
}));

vi.mock("@/lib/google/sheets", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google/sheets")>(
    "@/lib/google/sheets"
  );

  return {
    ...actual,
    inspectFooterActaWrites: inspectFooterActaWritesMock,
    writeFooterActaMarker: writeFooterActaMarkerMock,
    applyFormSheetStructureInsertions: applyFormSheetStructureInsertionsMock,
    applyFormSheetCellWrites: applyFormSheetCellWritesMock,
  };
});

import {
  ensureFinalizationSheetMutationApplied,
  persistTextReviewCacheForArtifacts,
} from "./routeHelpers";
import type { FinalizationExternalArtifacts } from "./requests";

function buildArtifacts(
  overrides: Partial<FinalizationExternalArtifacts> = {}
): FinalizationExternalArtifacts {
  return {
    sheetLink: "https://sheet",
    spreadsheetId: "spreadsheet-id",
    companyFolderId: "folder-id",
    activeSheetName: "Maestro",
    actaRef: "ACTA1234",
    footerActaRefs: [{ sheetName: "Maestro", actaRef: "ACTA1234" }],
    footerMutationMarkers: [],
    effectiveSheetReplacements: null,
    spreadsheetResourceMode: "legacy_company",
    prewarmStateSnapshot: null,
    prewarmStatus: "disabled",
    prewarmReused: false,
    prewarmStructureSignature: null,
    ...overrides,
  };
}

function buildMutation() {
  return {
    writes: [{ range: "'Maestro'!A1", value: "hola" }],
    rowInsertions: [
      {
        sheetName: "Maestro",
        insertAtRow: 10,
        count: 2,
        templateRow: 10,
      },
    ],
    footerActaRefs: [{ sheetName: "Maestro", actaRef: "ACTA1234" }],
  };
}

describe("ensureFinalizationSheetMutationApplied", () => {
  const runGoogleStep = vi.fn(
    async <T,>(_stage: string, operation: () => Promise<T>) => operation()
  );
  const persistArtifacts = vi.fn(async () => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    applyFormSheetStructureInsertionsMock.mockResolvedValue(undefined);
    applyFormSheetCellWritesMock.mockResolvedValue(undefined);
    writeFooterActaMarkerMock.mockResolvedValue(undefined);
  });

  it("writes marker, inserts structure and writes cells when mutation has not started", async () => {
    inspectFooterActaWritesMock.mockResolvedValue([
      {
        sheetName: "Maestro",
        rowIndex: 15,
        columnIndex: 0,
        range: "'Maestro'!A16",
        value: "www.recacolombia.org\nACTA ID: ACTA1234",
        currentValue: "www.recacolombia.org",
        applied: false,
      },
    ]);

    const result = await ensureFinalizationSheetMutationApplied({
      resumeFromPersistedArtifacts: false,
      currentExternalStage: "spreadsheet.prepared",
      artifacts: buildArtifacts(),
      mutation: buildMutation(),
      runGoogleStep,
      persistArtifacts,
    });

    expect(writeFooterActaMarkerMock).toHaveBeenCalledOnce();
    expect(applyFormSheetStructureInsertionsMock).toHaveBeenCalledOnce();
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledOnce();
    expect(persistArtifacts.mock.calls.map((call) => call[0])).toEqual([
      "spreadsheet.prepared",
      "spreadsheet.footer_marker_written",
      "spreadsheet.structure_insertions_done",
      "spreadsheet.apply_mutation_done",
    ]);
    expect(result.externalStage).toBe("spreadsheet.apply_mutation_done");
    expect(result.artifacts.footerMutationMarkers).toEqual([
      {
        sheetName: "Maestro",
        actaRef: "ACTA1234",
        initialRowIndex: 15,
        expectedFinalRowIndex: 17,
      },
    ]);
  });

  it("reuses a written marker on the initial row and only inserts the missing structure", async () => {
    inspectFooterActaWritesMock.mockResolvedValue([
      {
        sheetName: "Maestro",
        rowIndex: 15,
        columnIndex: 0,
        range: "'Maestro'!A16",
        value: "www.recacolombia.org\nACTA ID: ACTA1234",
        currentValue: "www.recacolombia.org\nACTA ID: ACTA1234",
        applied: true,
      },
    ]);

    await ensureFinalizationSheetMutationApplied({
      resumeFromPersistedArtifacts: true,
      currentExternalStage: "spreadsheet.footer_marker_written",
      artifacts: buildArtifacts({
        footerMutationMarkers: [
          {
            sheetName: "Maestro",
            actaRef: "ACTA1234",
            initialRowIndex: 15,
            expectedFinalRowIndex: 17,
          },
        ],
        footerMarkerWrittenAt: "2026-04-23T12:00:00.000Z",
      }),
      mutation: buildMutation(),
      runGoogleStep,
      persistArtifacts,
    });

    expect(writeFooterActaMarkerMock).not.toHaveBeenCalled();
    expect(applyFormSheetStructureInsertionsMock).toHaveBeenCalledOnce();
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledOnce();
  });

  it("skips structural insertions when the footer already moved to the expected row", async () => {
    inspectFooterActaWritesMock.mockResolvedValue([
      {
        sheetName: "Maestro",
        rowIndex: 17,
        columnIndex: 0,
        range: "'Maestro'!A18",
        value: "www.recacolombia.org\nACTA ID: ACTA1234",
        currentValue: "www.recacolombia.org\nACTA ID: ACTA1234",
        applied: true,
      },
    ]);

    await ensureFinalizationSheetMutationApplied({
      resumeFromPersistedArtifacts: true,
      currentExternalStage: "spreadsheet.footer_marker_written",
      artifacts: buildArtifacts({
        footerMutationMarkers: [
          {
            sheetName: "Maestro",
            actaRef: "ACTA1234",
            initialRowIndex: 15,
            expectedFinalRowIndex: 17,
          },
        ],
        footerMarkerWrittenAt: "2026-04-23T12:00:00.000Z",
      }),
      mutation: buildMutation(),
      runGoogleStep,
      persistArtifacts,
    });

    expect(applyFormSheetStructureInsertionsMock).not.toHaveBeenCalled();
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledOnce();
    expect(persistArtifacts.mock.calls.map((call) => call[0])).toEqual([
      "spreadsheet.structure_insertions_done",
      "spreadsheet.apply_mutation_done",
    ]);
  });

  it("fails closed when the footer lands on an ambiguous row", async () => {
    inspectFooterActaWritesMock.mockResolvedValue([
      {
        sheetName: "Maestro",
        rowIndex: 16,
        columnIndex: 0,
        range: "'Maestro'!A17",
        value: "www.recacolombia.org\nACTA ID: ACTA1234",
        currentValue: "www.recacolombia.org\nACTA ID: ACTA1234",
        applied: true,
      },
    ]);

    await expect(
      ensureFinalizationSheetMutationApplied({
        resumeFromPersistedArtifacts: true,
        currentExternalStage: "spreadsheet.footer_marker_written",
        artifacts: buildArtifacts({
          footerMutationMarkers: [
            {
              sheetName: "Maestro",
              actaRef: "ACTA1234",
              initialRowIndex: 15,
              expectedFinalRowIndex: 17,
            },
          ],
          footerMarkerWrittenAt: "2026-04-23T12:00:00.000Z",
        }),
        mutation: buildMutation(),
        runGoogleStep,
        persistArtifacts,
      })
    ).rejects.toThrow(
      "No se pudo determinar si la estructura de Google Sheets ya fue insertada; se detiene la finalizacion para evitar duplicaciones."
    );

    expect(applyFormSheetStructureInsertionsMock).not.toHaveBeenCalled();
    expect(applyFormSheetCellWritesMock).not.toHaveBeenCalled();
  });
});

describe("persistTextReviewCacheForArtifacts", () => {
  const cacheArtifact = {
    version: 1 as const,
    formSlug: "presentacion",
    inputHash: "hash-1",
    model: "gpt-4.1-nano",
    transport: "direct" as const,
    status: "reviewed" as const,
    reason: "ok",
    durationMs: 1234,
    reviewedCount: 1,
    uniqueTexts: 1,
    batches: 1,
    reviewedItems: [
      {
        path: ["acuerdos_observaciones"],
        originalText: "texto",
        reviewedText: "Texto.",
      },
    ],
    reviewedAt: "2026-04-28T12:00:00.000Z",
  };

  it("persists text review cache before mutation is applied", async () => {
    const persistArtifacts = vi.fn(async () => undefined);
    const profiler = { mark: vi.fn() };
    const artifacts = buildArtifacts();

    const result = await persistTextReviewCacheForArtifacts({
      textReview: {
        status: "reviewed",
        value: { acuerdos_observaciones: "Texto." },
        reason: "ok",
        reviewedCount: 1,
        cacheHit: false,
        cacheArtifact,
      },
      artifacts,
      currentExternalStage: "spreadsheet.prepared",
      persistArtifacts,
      profiler,
      source: "test.text_review",
    });

    expect(result.textReview).toEqual(cacheArtifact);
    expect(persistArtifacts).toHaveBeenCalledWith(
      "spreadsheet.prepared",
      expect.objectContaining({
        textReview: cacheArtifact,
      })
    );
    expect(profiler.mark).toHaveBeenCalledWith("text_review.cache_persisted");
  });

  it("does not persist a new cache after mutation was already applied", async () => {
    const persistArtifacts = vi.fn(async () => undefined);
    const artifacts = buildArtifacts();

    const result = await persistTextReviewCacheForArtifacts({
      textReview: {
        status: "reviewed",
        value: { acuerdos_observaciones: "Texto." },
        reason: "ok",
        reviewedCount: 1,
        cacheHit: false,
        cacheArtifact,
      },
      artifacts,
      currentExternalStage: "spreadsheet.apply_mutation_done",
      persistArtifacts,
      source: "test.text_review",
    });

    expect(result).toBe(artifacts);
    expect(persistArtifacts).not.toHaveBeenCalled();
  });

  it("keeps finalization moving when cache persistence fails", async () => {
    const persistArtifacts = vi.fn(async () => {
      throw new Error("supabase down");
    });
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const profiler = { mark: vi.fn() };
    const artifacts = buildArtifacts();

    try {
      const result = await persistTextReviewCacheForArtifacts({
        textReview: {
          status: "failed",
          value: { observaciones: "texto original" },
          reason: "timeout",
          reviewedCount: 0,
          cacheHit: false,
          cacheArtifact: {
            ...cacheArtifact,
            status: "failed",
            reason: "timeout",
            reviewedCount: 0,
          },
        },
        artifacts,
        currentExternalStage: "spreadsheet.prepared",
        persistArtifacts,
        profiler,
        source: "test.text_review",
      });

      expect(result).toBe(artifacts);
      expect(profiler.mark).toHaveBeenCalledWith(
        "text_review.cache_persist_failed"
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
