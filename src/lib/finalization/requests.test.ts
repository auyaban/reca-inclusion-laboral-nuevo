import { describe, expect, it, vi } from "vitest";
import {
  FinalizationClaimExhaustedError,
  FINALIZATION_PROCESSING_TTL_MS,
  buildFinalizationExternalArtifacts,
  extractFinalizationExternalArtifacts,
  hasReachedFinalizationExternalStage,
  markFinalizationExternalArtifactsFooterMarkerWritten,
  markFinalizationExternalArtifactsHiddenSheetsApplied,
  markFinalizationExternalArtifactsMutationApplied,
  markFinalizationExternalArtifactsStructureInsertionsApplied,
  normalizeFinalizationExternalStage,
  getProcessingRetryAfterSeconds,
  isProcessingRequestStale,
  resolveFinalizationRequestDecision,
  beginFinalizationRequest,
} from "./requests";
import type { FinalizationRequestRow } from "./requests";

function buildRequestRow(
  overrides: Partial<FinalizationRequestRow>
): FinalizationRequestRow {
  return {
    idempotency_key: "key",
    form_slug: "presentacion",
    user_id: "user-1",
    identity_key: null,
    status: "processing",
    stage: "request.validated",
    stage_started_at: null,
    request_hash: "hash",
    response_payload: null,
    last_error: null,
    total_duration_ms: null,
    profiling_steps: null,
    prewarm_status: null,
    prewarm_reused: null,
    prewarm_structure_signature: null,
    external_artifacts: null,
    external_stage: null,
    externalized_at: null,
    started_at: "2026-04-14T12:00:00.000Z",
    completed_at: null,
    updated_at: "2026-04-14T12:00:00.000Z",
    ...overrides,
  };
}

function createSupabaseMock() {
  const maybeSingle = vi.fn();
  const single = vi.fn();

  const readBuilder = {
    eq: vi.fn(() => readBuilder),
    maybeSingle,
  };
  const updateSelectBuilder = {
    maybeSingle,
  };
  const updateBuilder = {
    eq: vi.fn(() => updateBuilder),
    select: vi.fn(() => updateSelectBuilder),
  };
  const insertBuilder = {
    select: vi.fn(() => ({ single })),
  };

  const select = vi.fn(() => readBuilder);
  const insert = vi.fn(() => insertBuilder);
  const update = vi.fn(() => updateBuilder);

  return {
    maybeSingle,
    single,
    select,
    insert,
    update,
    from: vi.fn(() => ({ select, insert, update })),
  };
}

describe("finalization requests helpers", () => {
  it("classifies null, fresh processing, stale processing, succeeded and failed rows", () => {
    const now = Date.parse("2026-04-14T12:00:00.000Z");
    const freshUpdatedAt = new Date(
      now - FINALIZATION_PROCESSING_TTL_MS + 10_000
    ).toISOString();
    const staleUpdatedAt = new Date(
      now - FINALIZATION_PROCESSING_TTL_MS - 1_000
    ).toISOString();

    expect(resolveFinalizationRequestDecision(null, now)).toEqual({
      kind: "claim",
      reason: "missing",
    });
    expect(
      resolveFinalizationRequestDecision(
        buildRequestRow({
          status: "processing",
          stage: "drive.export_pdf",
          started_at: freshUpdatedAt,
          updated_at: freshUpdatedAt,
        }),
        now
      )
    ).toEqual({
      kind: "in_progress",
      stage: "drive.export_pdf",
      retryAfterSeconds: getProcessingRetryAfterSeconds(
        { updated_at: freshUpdatedAt },
        now
      ),
    });
    expect(
      resolveFinalizationRequestDecision(
        buildRequestRow({
          status: "processing",
          stage: "drive.export_pdf",
          started_at: staleUpdatedAt,
          updated_at: staleUpdatedAt,
        }),
        now
      )
    ).toEqual({
      kind: "claim",
      reason: "stale_processing",
    });
    expect(
      resolveFinalizationRequestDecision(
        buildRequestRow({
          status: "succeeded",
          stage: "succeeded",
          response_payload: {
            success: true,
            sheetLink: "https://sheet",
            pdfLink: "https://pdf",
          },
          started_at: freshUpdatedAt,
          completed_at: freshUpdatedAt,
          updated_at: freshUpdatedAt,
        }),
        now
      )
    ).toEqual({
      kind: "replay",
      responsePayload: {
        success: true,
        sheetLink: "https://sheet",
        pdfLink: "https://pdf",
      },
    });
    expect(
      resolveFinalizationRequestDecision(
        buildRequestRow({
          status: "succeeded",
          stage: "succeeded",
          started_at: freshUpdatedAt,
          completed_at: freshUpdatedAt,
          updated_at: freshUpdatedAt,
        }),
        now
      )
    ).toEqual({
      kind: "claim",
      reason: "missing_response",
    });
    expect(
      resolveFinalizationRequestDecision(
        buildRequestRow({
          status: "failed",
          stage: "drive.upload_pdf",
          last_error: "boom",
          started_at: freshUpdatedAt,
          updated_at: freshUpdatedAt,
        }),
        now
      )
    ).toEqual({
      kind: "claim",
      reason: "failed",
    });
  });

  it("detects stale processing requests and retry windows", () => {
    const now = Date.parse("2026-04-14T12:00:00.000Z");
    const updatedAt = new Date(now - 29_000).toISOString();

    expect(
      isProcessingRequestStale({ status: "processing", updated_at: updatedAt }, now)
    ).toBe(false);
    expect(
      isProcessingRequestStale(
        {
          status: "processing",
          updated_at: new Date(now - FINALIZATION_PROCESSING_TTL_MS - 1).toISOString(),
        },
        now
      )
    ).toBe(true);
    expect(getProcessingRetryAfterSeconds({ updated_at: updatedAt }, now)).toBe(331);
  });

  it("claims a missing request and inserts a processing row", async () => {
    const supabase = createSupabaseMock();
    supabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    supabase.single.mockResolvedValue({
      data: buildRequestRow({
        status: "processing",
        stage: "request.validated",
      }),
      error: null,
    });

    const result = await beginFinalizationRequest({
      supabase: supabase as never,
      idempotencyKey: "key",
      formSlug: "presentacion",
      userId: "user-1",
      requestHash: "hash",
      initialStage: "request.validated",
      now: new Date("2026-04-14T12:00:00.000Z"),
    });

    expect(result).toEqual({
      kind: "claimed",
      row: expect.objectContaining({
        status: "processing",
        stage: "request.validated",
      }),
    });
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotency_key: "key",
        form_slug: "presentacion",
        user_id: "user-1",
        status: "processing",
      })
    );
  });

  it("replays a completed response without claiming", async () => {
    const supabase = createSupabaseMock();
    supabase.maybeSingle.mockResolvedValue({
      data: buildRequestRow({
        form_slug: "sensibilizacion",
        status: "succeeded",
        stage: "succeeded",
        response_payload: {
          success: true,
          sheetLink: "https://sheet",
        },
        completed_at: "2026-04-14T12:01:00.000Z",
        updated_at: "2026-04-14T12:01:00.000Z",
      }),
      error: null,
    });

    const result = await beginFinalizationRequest({
      supabase: supabase as never,
      idempotencyKey: "key",
      formSlug: "sensibilizacion",
      userId: "user-1",
      requestHash: "hash",
      initialStage: "request.validated",
    });

    expect(result).toEqual({
      kind: "replay",
      responsePayload: {
        success: true,
        sheetLink: "https://sheet",
      },
    });
    expect(supabase.insert).not.toHaveBeenCalled();
    expect(supabase.update).not.toHaveBeenCalled();
  });

  it("reports fresh processing requests as in progress", async () => {
    const now = new Date("2026-04-14T12:00:00.000Z");
    const updatedAt = new Date(now.getTime() - 10_000).toISOString();
    const supabase = createSupabaseMock();
    supabase.maybeSingle.mockResolvedValue({
      data: buildRequestRow({
        status: "processing",
        stage: "drive.export_pdf",
        started_at: updatedAt,
        updated_at: updatedAt,
      }),
      error: null,
    });

    const result = await beginFinalizationRequest({
      supabase: supabase as never,
      idempotencyKey: "key",
      formSlug: "presentacion",
      userId: "user-1",
      requestHash: "hash",
      initialStage: "request.validated",
      now,
    });

    expect(result).toEqual({
      kind: "in_progress",
      stage: "drive.export_pdf",
      retryAfterSeconds: FINALIZATION_PROCESSING_TTL_MS / 1000 - 10,
    });
    expect(supabase.insert).not.toHaveBeenCalled();
    expect(supabase.update).not.toHaveBeenCalled();
  });

  it("preserves external artifacts when reclaiming a failed row", async () => {
    const supabase = createSupabaseMock();
    const existingRow = buildRequestRow({
      status: "failed",
      last_error: "boom",
      external_artifacts: {
        sheetLink: "https://sheet",
        spreadsheetId: "spreadsheet-id",
        companyFolderId: "folder-id",
        activeSheetName: "Maestro",
        footerActaRefs: [{ sheetName: "Maestro", actaRef: "ACTA-123" }],
        footerMutationMarkers: [
          {
            sheetName: "Maestro",
            actaRef: "ACTA-123",
            initialRowIndex: 10,
            expectedFinalRowIndex: 12,
          },
        ],
        spreadsheetResourceMode: "legacy_company",
        prewarmStateSnapshot: null,
        prewarmStatus: "disabled",
        prewarmReused: false,
        prewarmStructureSignature: null,
      },
      updated_at: "2026-04-14T12:00:00.000Z",
    });

    supabase.maybeSingle
      .mockResolvedValueOnce({ data: existingRow, error: null })
      .mockResolvedValueOnce({
        data: {
          ...existingRow,
          status: "processing",
          stage: "request.validated",
        },
        error: null,
      });

    const result = await beginFinalizationRequest({
      supabase: supabase as never,
      idempotencyKey: "key",
      formSlug: "presentacion",
      userId: "user-1",
      requestHash: "hash",
      initialStage: "request.validated",
    });

    expect(result).toEqual({
      kind: "claimed",
      row: expect.objectContaining({
        status: "processing",
        external_artifacts: existingRow.external_artifacts,
      }),
    });
    if (result.kind !== "claimed") {
      throw new Error("Expected claimed result");
    }
    expect(result.row.external_artifacts).toEqual(existingRow.external_artifacts);
    expect(supabase.update).toHaveBeenCalledWith(
      expect.not.objectContaining({
        external_artifacts: expect.anything(),
      })
    );
  });

  it("throws a typed error when claim coordination exhausts all attempts", async () => {
    const supabase = createSupabaseMock();
    supabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    supabase.single.mockResolvedValue({
      data: null,
      error: { code: "23505" },
    });

    await expect(
      beginFinalizationRequest({
        supabase: supabase as never,
        idempotencyKey: "key",
        formSlug: "presentacion",
        userId: "user-1",
        requestHash: "hash",
        initialStage: "request.validated",
      })
    ).rejects.toBeInstanceOf(FinalizationClaimExhaustedError);

    expect(supabase.insert).toHaveBeenCalledTimes(3);
  });

  it("extracts persisted external artifacts when the shape is valid", () => {
    expect(
      extractFinalizationExternalArtifacts({
        external_artifacts: {
          sheetLink: "https://sheet",
          spreadsheetId: "spreadsheet-id",
          companyFolderId: "folder-id",
        activeSheetName: "Maestro",
        actaRef: "ACTA-123",
        footerActaRefs: [{ sheetName: "Maestro", actaRef: "ACTA-123" }],
        footerMutationMarkers: [
          {
            sheetName: "Maestro",
            actaRef: "ACTA-123",
            initialRowIndex: 10,
            expectedFinalRowIndex: 14,
          },
        ],
        effectiveSheetReplacements: { Maestro: "Maestro - 2026-04-23" },
        footerMarkerWrittenAt: "2026-04-23T11:59:00.000Z",
        structureInsertionsAppliedAt: "2026-04-23T11:59:30.000Z",
        mutationAppliedAt: "2026-04-23T12:00:00.000Z",
        hiddenSheetsAppliedAt: "2026-04-23T12:01:00.000Z",
        pdfLink: "https://pdf",
        spreadsheetResourceMode: "legacy_company",
        prewarmStateSnapshot: null,
          prewarmStatus: "disabled",
          prewarmReused: false,
          prewarmStructureSignature: "sig-1",
        },
      })
    ).toEqual({
      sheetLink: "https://sheet",
      spreadsheetId: "spreadsheet-id",
      companyFolderId: "folder-id",
      activeSheetName: "Maestro",
      actaRef: "ACTA-123",
      footerActaRefs: [{ sheetName: "Maestro", actaRef: "ACTA-123" }],
      footerMutationMarkers: [
        {
          sheetName: "Maestro",
          actaRef: "ACTA-123",
          initialRowIndex: 10,
          expectedFinalRowIndex: 14,
        },
      ],
      effectiveSheetReplacements: { Maestro: "Maestro - 2026-04-23" },
      footerMarkerWrittenAt: "2026-04-23T11:59:00.000Z",
      structureInsertionsAppliedAt: "2026-04-23T11:59:30.000Z",
      mutationAppliedAt: "2026-04-23T12:00:00.000Z",
      hiddenSheetsAppliedAt: "2026-04-23T12:01:00.000Z",
      pdfLink: "https://pdf",
      spreadsheetResourceMode: "legacy_company",
      prewarmStateSnapshot: null,
      prewarmStatus: "disabled",
      prewarmReused: false,
      prewarmStructureSignature: "sig-1",
    });
  });

  it("builds external artifacts from a prepared spreadsheet snapshot", () => {
    expect(
      buildFinalizationExternalArtifacts({
        preparedSpreadsheet: {
          sheetLink: "https://sheet",
          spreadsheetId: "spreadsheet-id",
          companyFolderId: "folder-id",
          activeSheetName: "Maestro",
          effectiveSheetReplacements: { Maestro: "Maestro - 2026-04-23" },
          spreadsheetResourceMode: "draft_prewarm",
          prewarmStateSnapshot: null,
          prewarmStatus: "reused_ready",
          prewarmReused: true,
          prewarmStructureSignature: "sig-2",
        },
        actaRef: "ACTA-555",
        footerActaRefs: [{ sheetName: "Maestro", actaRef: "ACTA-555" }],
        footerMutationMarkers: [],
        pdfLink: "https://pdf",
        mutationAppliedAt: "2026-04-23T12:02:00.000Z",
      })
    ).toEqual({
      sheetLink: "https://sheet",
      spreadsheetId: "spreadsheet-id",
      companyFolderId: "folder-id",
      activeSheetName: "Maestro",
      actaRef: "ACTA-555",
      footerActaRefs: [{ sheetName: "Maestro", actaRef: "ACTA-555" }],
      footerMutationMarkers: [],
      effectiveSheetReplacements: { Maestro: "Maestro - 2026-04-23" },
      footerMarkerWrittenAt: undefined,
      structureInsertionsAppliedAt: undefined,
      mutationAppliedAt: "2026-04-23T12:02:00.000Z",
      hiddenSheetsAppliedAt: undefined,
      pdfLink: "https://pdf",
      spreadsheetResourceMode: "draft_prewarm",
      prewarmStateSnapshot: null,
      prewarmStatus: "reused_ready",
      prewarmReused: true,
      prewarmStructureSignature: "sig-2",
    });
  });

  it("normalizes external stages and stage comparisons", () => {
    expect(
      normalizeFinalizationExternalStage("spreadsheet.prepared", null)
    ).toBe("spreadsheet.prepared");
    expect(
      normalizeFinalizationExternalStage(null, {
        spreadsheetId: "sheet-id",
        sheetLink: "https://sheet",
        companyFolderId: "folder-id",
        activeSheetName: "Maestro",
      })
    ).toBe("spreadsheet.prepared");
    expect(
      normalizeFinalizationExternalStage(null, {
        spreadsheetId: "sheet-id",
        sheetLink: "https://sheet",
        companyFolderId: "folder-id",
        activeSheetName: "Maestro",
        footerMarkerWrittenAt: "2026-04-23T11:59:00.000Z",
      })
    ).toBe("spreadsheet.footer_marker_written");
    expect(
      normalizeFinalizationExternalStage(null, {
        spreadsheetId: "sheet-id",
        sheetLink: "https://sheet",
        companyFolderId: "folder-id",
        activeSheetName: "Maestro",
        footerMarkerWrittenAt: "2026-04-23T11:59:00.000Z",
        structureInsertionsAppliedAt: "2026-04-23T11:59:30.000Z",
      })
    ).toBe("spreadsheet.structure_insertions_done");
    expect(
      normalizeFinalizationExternalStage(null, {
        spreadsheetId: "sheet-id",
        sheetLink: "https://sheet",
        companyFolderId: "folder-id",
        activeSheetName: "Maestro",
        mutationAppliedAt: "2026-04-23T12:00:00.000Z",
      })
    ).toBe("spreadsheet.apply_mutation_done");
    expect(
      hasReachedFinalizationExternalStage(
        "spreadsheet.hide_unused_sheets_done",
        "spreadsheet.apply_mutation_done"
      )
    ).toBe(true);
  });

  it("updates mutation and hide timestamps incrementally", () => {
    const base = buildFinalizationExternalArtifacts({
      preparedSpreadsheet: {
        sheetLink: "https://sheet",
        spreadsheetId: "spreadsheet-id",
        companyFolderId: "folder-id",
        activeSheetName: "Maestro",
        effectiveSheetReplacements: null,
        spreadsheetResourceMode: "legacy_company",
        prewarmStateSnapshot: null,
        prewarmStatus: "disabled",
        prewarmReused: false,
        prewarmStructureSignature: null,
      },
      actaRef: "ACTA-123",
      footerActaRefs: [{ sheetName: "Maestro", actaRef: "ACTA-123" }],
    });

    const withMutation = markFinalizationExternalArtifactsMutationApplied(
      base,
      "2026-04-23T12:00:00.000Z"
    );
    const withFooterMarker = markFinalizationExternalArtifactsFooterMarkerWritten(
      base,
      "2026-04-23T11:59:00.000Z"
    );
    const withStructure =
      markFinalizationExternalArtifactsStructureInsertionsApplied(
        withFooterMarker,
        "2026-04-23T11:59:30.000Z"
      );
    const withHidden = markFinalizationExternalArtifactsHiddenSheetsApplied(
      withMutation,
      "2026-04-23T12:01:00.000Z"
    );

    expect(withFooterMarker.footerMarkerWrittenAt).toBe(
      "2026-04-23T11:59:00.000Z"
    );
    expect(withStructure.structureInsertionsAppliedAt).toBe(
      "2026-04-23T11:59:30.000Z"
    );
    expect(withMutation.mutationAppliedAt).toBe("2026-04-23T12:00:00.000Z");
    expect(withHidden.hiddenSheetsAppliedAt).toBe("2026-04-23T12:01:00.000Z");
  });
});
