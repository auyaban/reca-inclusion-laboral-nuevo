import { describe, expect, it } from "vitest";
import type { FinalizationRequestRow } from "@/lib/finalization/requests";
import {
  FINALIZATION_PROCESSING_TTL_MS,
  buildStaleFinalizationReport,
} from "@/lib/finalization/staleProcessing";

function buildRow(
  overrides: Partial<FinalizationRequestRow>
): FinalizationRequestRow {
  return {
    idempotency_key: "idemp-1",
    form_slug: "presentacion",
    user_id: "user-1",
    identity_key: null,
    status: "processing",
    stage: "drive.upload_pdf",
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
    started_at: "2026-04-14T11:00:00.000Z",
    completed_at: null,
    updated_at: "2026-04-14T11:00:00.000Z",
    ...overrides,
  };
}

describe("stale finalization report", () => {
  it("builds a stable empty report", () => {
    expect(
      buildStaleFinalizationReport([], {
        now: Date.parse("2026-04-14T12:00:00.000Z"),
        ttlMs: FINALIZATION_PROCESSING_TTL_MS,
      })
    ).toEqual({
      generatedAt: "2026-04-14T12:00:00.000Z",
      ttlMs: FINALIZATION_PROCESSING_TTL_MS,
      thresholdIso: "2026-04-14T11:58:30.000Z",
      staleCount: 0,
      byFormSlug: {},
      byStage: {},
      byExternalStage: {},
      byArtifactState: {
        none: 0,
        spreadsheet_only: 0,
        pdf_ready: 0,
      },
      rows: [],
    });
  });

  it("classifies rows and aggregates counts", () => {
    const report = buildStaleFinalizationReport(
      [
        buildRow({
          idempotency_key: "idemp-none",
          form_slug: "presentacion",
          stage: "request.validated",
          updated_at: "2026-04-14T11:50:00.000Z",
        }),
        buildRow({
          idempotency_key: "idemp-sheet",
          form_slug: "seleccion",
          stage: "drive.upload_pdf",
          external_stage: "spreadsheet.apply_mutation_done",
          updated_at: "2026-04-14T11:40:00.000Z",
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
        }),
        buildRow({
          idempotency_key: "idemp-pdf",
          form_slug: "seleccion",
          stage: "confirming.persisted_record_written",
          external_stage: "drive.upload_pdf",
          updated_at: "2026-04-14T11:30:00.000Z",
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
        }),
      ],
      {
        now: Date.parse("2026-04-14T12:00:00.000Z"),
        ttlMs: FINALIZATION_PROCESSING_TTL_MS,
      }
    );

    expect(report.staleCount).toBe(3);
    expect(report.byFormSlug).toEqual({
      presentacion: 1,
      seleccion: 2,
    });
    expect(report.byStage).toEqual({
      "request.validated": 1,
      "drive.upload_pdf": 1,
      "confirming.persisted_record_written": 1,
    });
    expect(report.byExternalStage).toEqual({
      none: 1,
      "spreadsheet.apply_mutation_done": 1,
      "drive.upload_pdf": 1,
    });
    expect(report.byArtifactState).toEqual({
      none: 1,
      spreadsheet_only: 1,
      pdf_ready: 1,
    });
    expect(report.rows).toEqual([
      expect.objectContaining({
        idempotencyKey: "idemp-none",
        artifactState: "none",
        hasExternalArtifacts: false,
        ageMs: 600_000,
      }),
      expect.objectContaining({
        idempotencyKey: "idemp-sheet",
        artifactState: "spreadsheet_only",
        hasExternalArtifacts: true,
        ageMs: 1_200_000,
      }),
      expect.objectContaining({
        idempotencyKey: "idemp-pdf",
        artifactState: "pdf_ready",
        hasExternalArtifacts: true,
        ageMs: 1_800_000,
      }),
    ]);
  });
});
