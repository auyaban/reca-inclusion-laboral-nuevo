import { describe, expect, it, vi } from "vitest";

const {
  reportFinalizationStaleProcessingReclaimedMock,
} = vi.hoisted(() => ({
  reportFinalizationStaleProcessingReclaimedMock: vi.fn(),
}));

vi.mock("@/lib/observability/finalization", () => ({
  reportFinalizationStaleProcessingReclaimed:
    reportFinalizationStaleProcessingReclaimedMock,
}));

import {
  FinalizationClaimExhaustedError,
  FINALIZATION_PROCESSING_TTL_MS,
  buildFinalizationExternalArtifacts,
  classifyFinalizationArtifactState,
  extractFinalizationExternalArtifacts,
  hasReachedFinalizationExternalStage,
  listStaleFinalizationRequests,
  markFinalizationExternalArtifactsFooterMarkerWritten,
  markFinalizationExternalArtifactsHiddenSheetsApplied,
  markFinalizationExternalArtifactsMutationApplied,
  markFinalizationExternalArtifactsStructureInsertionsApplied,
  normalizeFinalizationExternalStage,
  getProcessingRetryAfterSeconds,
  isProcessingRequestStale,
  resolveFinalizationRequestDecision,
  beginFinalizationRequest,
  findDraftPrewarmCleanupBlocker,
} from "./requests";
import type { FinalizationRequestRow } from "./requests";

function buildRequestRow(
  overrides: Partial<FinalizationRequestRow>
): FinalizationRequestRow {
  return {
    idempotency_key: "key",
    form_slug: "presentacion",
    user_id: "user-1",
    identity_key: "draft-1",
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
  const rpcMaybeSingle = vi.fn();
  const rpc = vi.fn(() => ({ maybeSingle: rpcMaybeSingle }));

  return {
    rpc,
    rpcMaybeSingle,
    from: vi.fn(),
  };
}

function buildClaimRpcRow(options: {
  decision?: "claimed" | "in_progress" | "replay";
  row?: FinalizationRequestRow;
  staleReclaimed?: boolean;
  previousStage?: string | null;
  previousExternalStage?: string | null;
  previousUpdatedAt?: string | null;
  previousExternalArtifacts?: Record<string, unknown> | null;
} = {}) {
  return {
    claim_decision: options.decision ?? "claimed",
    request_row: options.row ?? buildRequestRow({}),
    stale_reclaimed: options.staleReclaimed ?? false,
    previous_stage: options.previousStage ?? null,
    previous_external_stage: options.previousExternalStage ?? null,
    previous_updated_at: options.previousUpdatedAt ?? null,
    previous_external_artifacts: options.previousExternalArtifacts ?? null,
  };
}

function createListSupabaseMock(rows: FinalizationRequestRow[]) {
  const query = {
    eq: vi.fn(() => query),
    lt: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve({ data: rows, error: null }).then(onFulfilled, onRejected),
  };
  const select = vi.fn(() => query);

  return {
    query,
    select,
    from: vi.fn(() => ({ select })),
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
    expect(getProcessingRetryAfterSeconds({ updated_at: updatedAt }, now)).toBe(
      Math.ceil((FINALIZATION_PROCESSING_TTL_MS - 29_000) / 1000)
    );
  });

  it("claims a missing request through the atomic identity RPC", async () => {
    const supabase = createSupabaseMock();
    const claimedRow = buildRequestRow({
      status: "processing",
      stage: "request.validated",
      identity_key: "draft-1",
    });
    supabase.rpcMaybeSingle.mockResolvedValue({
      data: buildClaimRpcRow({ row: claimedRow }),
      error: null,
    });

    const result = await beginFinalizationRequest({
      supabase: supabase as never,
      idempotencyKey: "key",
      formSlug: "presentacion",
      userId: "user-1",
      identityKey: "draft-1",
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
    expect(supabase.rpc).toHaveBeenCalledWith(
      "claim_form_finalization_request",
      expect.objectContaining({
        target_idempotency_key: "key",
        target_form_slug: "presentacion",
        target_user_id: "user-1",
        target_identity_key: "draft-1",
        target_request_hash: "hash",
        target_initial_stage: "request.validated",
      })
    );
  });

  it("replays a completed response without claiming", async () => {
    const supabase = createSupabaseMock();
    supabase.rpcMaybeSingle.mockResolvedValue({
      data: buildClaimRpcRow({
        decision: "replay",
        row: buildRequestRow({
          form_slug: "sensibilizacion",
          status: "succeeded",
          stage: "succeeded",
          identity_key: "draft-1",
          response_payload: {
            success: true,
            sheetLink: "https://sheet",
          },
          completed_at: "2026-04-14T12:01:00.000Z",
          updated_at: "2026-04-14T12:01:00.000Z",
        }),
      }),
      error: null,
    });

    const result = await beginFinalizationRequest({
      supabase: supabase as never,
      idempotencyKey: "key",
      formSlug: "sensibilizacion",
      userId: "user-1",
      identityKey: "draft-1",
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
  });

  it("reports fresh processing requests as in progress", async () => {
    const now = new Date("2026-04-14T12:00:00.000Z");
    const updatedAt = new Date(now.getTime() - 10_000).toISOString();
    const supabase = createSupabaseMock();
    supabase.rpcMaybeSingle.mockResolvedValue({
      data: buildClaimRpcRow({
        decision: "in_progress",
        row: buildRequestRow({
          status: "processing",
          stage: "drive.export_pdf",
          identity_key: "draft-1",
          started_at: updatedAt,
          updated_at: updatedAt,
        }),
      }),
      error: null,
    });

    const result = await beginFinalizationRequest({
      supabase: supabase as never,
      idempotencyKey: "key",
      formSlug: "presentacion",
      userId: "user-1",
      identityKey: "draft-1",
      requestHash: "hash",
      initialStage: "request.validated",
      now,
    });

    expect(result).toEqual({
      kind: "in_progress",
      stage: "drive.export_pdf",
      retryAfterSeconds: FINALIZATION_PROCESSING_TTL_MS / 1000 - 10,
    });
  });

  it("preserves external artifacts when the RPC retries a failed row", async () => {
    const supabase = createSupabaseMock();
    const existingRow = buildRequestRow({
      status: "processing",
      stage: "request.validated",
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

    supabase.rpcMaybeSingle.mockResolvedValue({
      data: buildClaimRpcRow({ row: existingRow }),
      error: null,
    });

    const result = await beginFinalizationRequest({
      supabase: supabase as never,
      idempotencyKey: "key",
      formSlug: "presentacion",
      userId: "user-1",
      identityKey: "draft-1",
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
  });

  it("throws a typed error when the identity RPC returns no claim row", async () => {
    const supabase = createSupabaseMock();
    supabase.rpcMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      beginFinalizationRequest({
        supabase: supabase as never,
        idempotencyKey: "key",
        formSlug: "presentacion",
        userId: "user-1",
        identityKey: "draft-1",
        requestHash: "hash",
        initialStage: "request.validated",
      })
    ).rejects.toBeInstanceOf(FinalizationClaimExhaustedError);

    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("emits a stale_processing_reclaimed warning only after a stale reclaim succeeds", async () => {
    const supabase = createSupabaseMock();
    const staleUpdatedAt = new Date(
      Date.parse("2026-04-14T12:00:00.000Z") - FINALIZATION_PROCESSING_TTL_MS - 1_000
    ).toISOString();
    const existingRow = buildRequestRow({
      status: "processing",
      stage: "drive.upload_pdf",
      external_artifacts: {
        sheetLink: "https://sheet",
        spreadsheetId: "spreadsheet-id",
        companyFolderId: "folder-id",
        activeSheetName: "Maestro",
        footerActaRefs: [{ sheetName: "Maestro", actaRef: "ACTA-123" }],
        footerMutationMarkers: [],
        spreadsheetResourceMode: "legacy_company",
        prewarmStateSnapshot: null,
        prewarmStatus: "disabled",
        prewarmReused: false,
        prewarmStructureSignature: null,
      },
      external_stage: "spreadsheet.apply_mutation_done",
      updated_at: staleUpdatedAt,
      started_at: staleUpdatedAt,
    });

    supabase.rpcMaybeSingle.mockResolvedValue({
      data: buildClaimRpcRow({
        row: {
          ...existingRow,
          status: "processing",
          stage: "request.validated",
        },
        staleReclaimed: true,
        previousStage: "drive.upload_pdf",
        previousExternalStage: "spreadsheet.apply_mutation_done",
        previousUpdatedAt: staleUpdatedAt,
        previousExternalArtifacts:
          existingRow.external_artifacts as Record<string, unknown>,
      }),
      error: null,
    });

    await beginFinalizationRequest({
      supabase: supabase as never,
      idempotencyKey: "key",
      formSlug: "presentacion",
      userId: "user-1",
      identityKey: "draft-1",
      requestHash: "hash",
      initialStage: "request.validated",
      now: new Date("2026-04-14T12:00:00.000Z"),
    });

    expect(reportFinalizationStaleProcessingReclaimedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "presentacion",
        idempotencyKey: "key",
        userId: "user-1",
        previousStage: "drive.upload_pdf",
        previousExternalStage: "spreadsheet.apply_mutation_done",
        artifactState: "spreadsheet_only",
      })
    );
  });

  it("reads draft prewarm cleanup blockers through the cleanup RPC", async () => {
    const supabase = createSupabaseMock();
    supabase.rpcMaybeSingle.mockResolvedValue({
      data: {
        blocker: "active_finalization_spreadsheet",
        idempotency_key: "key",
        status: "processing",
        stage: "spreadsheet.prepared",
      },
      error: null,
    });

    const blocker = await findDraftPrewarmCleanupBlocker({
      supabase: supabase as never,
      formSlug: "presentacion",
      userId: "user-1",
      identityKey: "draft-1",
      spreadsheetId: "sheet-1",
    });

    expect(blocker).toEqual({
      blocker: "active_finalization_spreadsheet",
      idempotency_key: "key",
      status: "processing",
      stage: "spreadsheet.prepared",
    });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "find_draft_prewarm_cleanup_blocker",
      {
        target_form_slug: "presentacion",
        target_user_id: "user-1",
        target_identity_key: "draft-1",
        target_spreadsheet_id: "sheet-1",
      }
    );
  });

  it("lists stale processing rows using the current TTL and optional filters", async () => {
    const staleRows = [
      buildRequestRow({
        idempotency_key: "stale-1",
        form_slug: "presentacion",
        updated_at: "2026-04-14T11:00:00.000Z",
      }),
    ];
    const supabase = createListSupabaseMock(staleRows);

    const rows = await listStaleFinalizationRequests({
      supabase: supabase as never,
      now: Date.parse("2026-04-14T12:00:00.000Z"),
      formSlug: "presentacion",
      userId: "user-1",
      idempotencyKey: "stale-1",
      limit: 5,
    });

    expect(rows).toEqual(staleRows);
    expect(supabase.query.eq).toHaveBeenCalledWith("status", "processing");
    expect(supabase.query.lt).toHaveBeenCalledWith(
      "updated_at",
      new Date(
        Date.parse("2026-04-14T12:00:00.000Z") - FINALIZATION_PROCESSING_TTL_MS
      ).toISOString()
    );
    expect(supabase.query.eq).toHaveBeenCalledWith("form_slug", "presentacion");
    expect(supabase.query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(supabase.query.eq).toHaveBeenCalledWith("idempotency_key", "stale-1");
    expect(supabase.query.order).toHaveBeenCalledWith("updated_at", {
      ascending: true,
    });
    expect(supabase.query.limit).toHaveBeenCalledWith(5);
  });

  it("classifies artifact state from persisted external artifacts", () => {
    expect(classifyFinalizationArtifactState(null)).toBe("none");
    expect(
      classifyFinalizationArtifactState({
        external_artifacts: {
          sheetLink: "https://sheet",
          spreadsheetId: "spreadsheet-id",
          companyFolderId: "folder-id",
          activeSheetName: "Maestro",
          footerActaRefs: [],
          footerMutationMarkers: [],
          spreadsheetResourceMode: "legacy_company",
          prewarmStateSnapshot: null,
          prewarmStatus: "disabled",
          prewarmReused: false,
          prewarmStructureSignature: null,
        },
      })
    ).toBe("spreadsheet_only");
    expect(
      classifyFinalizationArtifactState({
        external_artifacts: {
          sheetLink: "https://sheet",
          spreadsheetId: "spreadsheet-id",
          companyFolderId: "folder-id",
          activeSheetName: "Maestro",
          footerActaRefs: [],
          footerMutationMarkers: [],
          pdfLink: "https://pdf",
          spreadsheetResourceMode: "legacy_company",
          prewarmStateSnapshot: null,
          prewarmStatus: "disabled",
          prewarmReused: false,
          prewarmStructureSignature: null,
        },
      })
    ).toBe("pdf_ready");
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
      finalDocumentBaseName: null,
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
