import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  getUserMock,
  getSessionMock,
  fromMock,
  insertMock,
  beginFinalizationRequestMock,
  markFinalizationRequestStageMock,
  markFinalizationRequestSucceededMock,
  markFinalizationRequestFailedMock,
  persistFinalizationExternalArtifactsMock,
  resolveFinalizationRecoveryDecisionMock,
  recoverPersistedFinalizationResponseMock,
  createFinalizationProfilerMock,
  profilerMarkMock,
  profilerFinishMock,
  profilerFailMock,
  prepareFinalizationSpreadsheetPipelineMock,
  inspectFooterActaWritesMock,
  writeFooterActaMarkerMock,
  applyFormSheetStructureInsertionsMock,
  applyFormSheetCellWritesMock,
  getOrCreateFolderMock,
  exportSheetToPdfMock,
  uploadPdfMock,
  uploadJsonArtifactMock,
  getFinalizationUserIdentityMock,
  reviewFinalizationTextMock,
} = vi.hoisted(() => {
  const profilerMarkMock = vi.fn();
  const profilerFinishMock = vi.fn();
  const profilerFailMock = vi.fn();

  return {
    createClientMock: vi.fn(),
    getUserMock: vi.fn(),
    getSessionMock: vi.fn(),
    fromMock: vi.fn(),
    insertMock: vi.fn(),
    beginFinalizationRequestMock: vi.fn(),
    markFinalizationRequestStageMock: vi.fn(),
    markFinalizationRequestSucceededMock: vi.fn(),
    markFinalizationRequestFailedMock: vi.fn(),
    persistFinalizationExternalArtifactsMock: vi.fn(),
    resolveFinalizationRecoveryDecisionMock: vi.fn(),
    recoverPersistedFinalizationResponseMock: vi.fn(),
    createFinalizationProfilerMock: vi.fn(),
    profilerMarkMock,
    profilerFinishMock,
    profilerFailMock,
    prepareFinalizationSpreadsheetPipelineMock: vi.fn(),
    inspectFooterActaWritesMock: vi.fn(),
    writeFooterActaMarkerMock: vi.fn(),
    applyFormSheetStructureInsertionsMock: vi.fn(),
    applyFormSheetCellWritesMock: vi.fn(),
    getOrCreateFolderMock: vi.fn(),
    exportSheetToPdfMock: vi.fn(),
    uploadPdfMock: vi.fn(),
    uploadJsonArtifactMock: vi.fn(),
    getFinalizationUserIdentityMock: vi.fn(),
    reviewFinalizationTextMock: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/finalization/requests", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/finalization/requests")
  >("@/lib/finalization/requests");

  return {
    ...actual,
    beginFinalizationRequest: beginFinalizationRequestMock,
    markFinalizationRequestStage: markFinalizationRequestStageMock,
    persistFinalizationExternalArtifacts:
      persistFinalizationExternalArtifactsMock,
  };
});

vi.mock("@/lib/finalization/finalizationFeedback", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/finalization/finalizationFeedback")
  >("@/lib/finalization/finalizationFeedback");

  return {
    ...actual,
    markFinalizationRequestSucceededSafely: markFinalizationRequestSucceededMock,
    markFinalizationRequestFailedSafely: markFinalizationRequestFailedMock,
    isFinalizationClaimExhaustedError: vi.fn(() => false),
  };
});

vi.mock("@/lib/finalization/persistedRecovery", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/finalization/persistedRecovery")
  >("@/lib/finalization/persistedRecovery");

  return {
    ...actual,
    recoverPersistedFinalizationResponse:
      recoverPersistedFinalizationResponseMock,
    resolveFinalizationRecoveryDecision:
      resolveFinalizationRecoveryDecisionMock,
  };
});

vi.mock("@/lib/finalization/finalizationSpreadsheet", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/finalization/finalizationSpreadsheet")
  >("@/lib/finalization/finalizationSpreadsheet");

  return {
    ...actual,
    prepareFinalizationSpreadsheetPipeline:
      prepareFinalizationSpreadsheetPipelineMock,
  };
});

vi.mock("@/lib/finalization/profiler", () => ({
  createFinalizationProfiler: createFinalizationProfilerMock,
}));

vi.mock("@/lib/finalization/finalizationUser", () => ({
  getFinalizationUserIdentity: getFinalizationUserIdentityMock,
}));

vi.mock("@/lib/finalization/textReview", () => ({
  reviewFinalizationText: reviewFinalizationTextMock,
}));

vi.mock("@/lib/google/sheets", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google/sheets")>(
    "@/lib/google/sheets"
  );

  return {
    ...actual,
    inspectFooterActaWrites: inspectFooterActaWritesMock,
    writeFooterActaMarker: writeFooterActaMarkerMock,
    applyFormSheetStructureInsertions:
      applyFormSheetStructureInsertionsMock,
    applyFormSheetCellWrites: applyFormSheetCellWritesMock,
  };
});

vi.mock("@/lib/google/drive", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google/drive")>(
    "@/lib/google/drive"
  );

  return {
    ...actual,
    getOrCreateFolder: getOrCreateFolderMock,
    exportSheetToPdf: exportSheetToPdfMock,
    uploadPdf: uploadPdfMock,
    uploadJsonArtifact: uploadJsonArtifactMock,
  };
});

import { POST } from "@/app/api/formularios/presentacion/route";

const PRESENTACION_SHEET_NAME = "1. PRESENTACI\u00D3N DEL PROGRAMA IL";
const REACTIVACION_SHEET_NAME = "1.2 REACTIVACI\u00D3N DEL PROGRAMA IL";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/formularios/presentacion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildBody(
  overrides: Partial<{
    tipo_visita: string;
    finalization_identity: {
      draft_id: string;
      local_draft_session_id: string;
    };
  }> = {}
) {
  return {
    tipo_visita: "Presentaci\u00F3n",
    fecha_visita: "2026-04-14",
    modalidad: "Presencial",
    nit_empresa: "900123456",
    motivacion: ["Responsabilidad Social Empresarial"],
    acuerdos_observaciones: "Acuerdos y observaciones.",
    asistentes: [
      { nombre: "Ana Perez", cargo: "Profesional" },
      { nombre: "Luis Mora", cargo: "Coordinador" },
      { nombre: "Marta Ruiz", cargo: "Asesora" },
      { nombre: "Laura Gomez", cargo: "Gerente" },
    ],
    empresa: {
      id: "empresa-1",
      nombre_empresa: "ACME SAS",
      nit_empresa: "900123456",
      direccion_empresa: "Calle 1 # 2-3",
      ciudad_empresa: "Bogota",
      sede_empresa: "Principal",
      zona_empresa: "Zona Norte",
      correo_1: "contacto@acme.com",
      contacto_empresa: "Laura Gomez",
      telefono_empresa: "3000000000",
      cargo: "Gerente",
      profesional_asignado: "Marta Ruiz",
      correo_profesional: "marta@reca.com",
      asesor: "Carlos Ruiz",
      correo_asesor: "carlos@reca.com",
      caja_compensacion: "Compensar",
    },
    finalization_identity: {
      draft_id: "draft-1",
      local_draft_session_id: "session-1",
    },
    ...overrides,
  };
}

function buildResumeArtifacts(options?: {
  sheetName?: string;
  initialRowIndex?: number;
  expectedFinalRowIndex?: number;
}) {
  return {
    sheetLink: "https://sheets.example/presentacion",
    spreadsheetId: "spreadsheet-id",
    companyFolderId: "company-folder-id",
    activeSheetName: "PRESENTACION",
    actaRef: "ACTA-123",
    footerActaRefs: [
      {
        sheetName: options?.sheetName ?? PRESENTACION_SHEET_NAME,
        actaRef: "ACTA-123",
      },
    ],
    footerMutationMarkers: [
      {
        sheetName: options?.sheetName ?? PRESENTACION_SHEET_NAME,
        actaRef: "ACTA-123",
        initialRowIndex: options?.initialRowIndex ?? 77,
        expectedFinalRowIndex: options?.expectedFinalRowIndex ?? 78,
      },
    ],
    footerMarkerWrittenAt: "2026-04-14T00:00:00.000Z",
    structureInsertionsAppliedAt: "2026-04-14T00:00:01.000Z",
    effectiveSheetReplacements: null,
    spreadsheetResourceMode: "legacy_company",
    prewarmStateSnapshot: null,
    prewarmStatus: "disabled",
    prewarmReused: false,
    prewarmStructureSignature: null,
  };
}

function buildClaimedRow(overrides: Record<string, unknown> = {}) {
  return {
    idempotency_key: "key",
    form_slug: "presentacion",
    user_id: "user-1",
    identity_key: "draft-1",
    status: "processing",
    stage: "request.validated",
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
    started_at: "2026-04-14T00:00:00.000Z",
    completed_at: null,
    updated_at: "2026-04-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("POST /api/formularios/presentacion resume", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.GOOGLE_SHEETS_MASTER_ID = "master-sheet-id";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "drive-folder-id";
    process.env.GOOGLE_DRIVE_PDF_FOLDER_ID = "pdf-folder-id";

    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "aaron@example.com" } },
      error: null,
    });
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "token-1" } },
      error: null,
    });
    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
        getSession: getSessionMock,
      },
      from: fromMock,
    });
    fromMock.mockReturnValue({
      insert: insertMock,
    });
    insertMock.mockResolvedValue({ error: null });

    createFinalizationProfilerMock.mockReturnValue({
      mark: profilerMarkMock,
      finish: profilerFinishMock,
      fail: profilerFailMock,
      getSteps: vi.fn(() => []),
      getTotalMs: vi.fn(() => 0),
    });
    getFinalizationUserIdentityMock.mockResolvedValue({
      usuarioLogin: "aaron_vercel",
      nombreUsuario: "aaron",
    });
    reviewFinalizationTextMock.mockImplementation(
      async ({ value }: { value: unknown }) => ({
        status: "reviewed",
        value,
        reason: "ok",
        reviewedCount: 1,
      })
    );

    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: buildClaimedRow({ stage: "drive.upload_pdf" }),
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValue({
      kind: "resume",
      externalStage: "spreadsheet.prepared",
      externalArtifacts: buildResumeArtifacts(),
    });
    recoverPersistedFinalizationResponseMock.mockResolvedValue(null);
    persistFinalizationExternalArtifactsMock.mockResolvedValue(undefined);
    prepareFinalizationSpreadsheetPipelineMock.mockResolvedValue(undefined);
    inspectFooterActaWritesMock.mockResolvedValue([]);
    writeFooterActaMarkerMock.mockResolvedValue(undefined);
    applyFormSheetStructureInsertionsMock.mockResolvedValue(undefined);
    applyFormSheetCellWritesMock.mockResolvedValue(undefined);
    getOrCreateFolderMock.mockResolvedValue("pdf-folder-id");
    exportSheetToPdfMock.mockResolvedValue(Buffer.from("pdf-bytes"));
    uploadPdfMock.mockResolvedValue({
      fileId: "pdf-file-id",
      webViewLink: "https://drive.example/presentacion.pdf",
    });
    uploadJsonArtifactMock.mockResolvedValue({
      fileId: "json-file-id",
      webViewLink: "https://drive.example/presentacion-raw.json",
    });
  });

  it("resumes presentacion overflow with the real footer boundary without rewriting structural rows", async () => {
    prepareFinalizationSpreadsheetPipelineMock.mockResolvedValue({
      preparedSpreadsheet: {
        spreadsheetId: "spreadsheet-id",
        companyFolderId: "company-folder-id",
        spreadsheetResourceMode: "legacy_company",
        prewarmStateSnapshot: null,
        effectiveSheetReplacements: null,
        effectiveMutation: { writes: [] },
        activeSheetName: "PRESENTACION",
        activeSheetId: 901,
        sheetLink: "https://sheets.example/presentacion",
        reusedSpreadsheet: false,
        prewarmStatus: "disabled",
        prewarmReused: false,
        prewarmStructureSignature: null,
      },
      trackingContext: {
        prewarmStatus: "disabled",
        prewarmReused: false,
        prewarmStructureSignature: null,
      },
      sealAfterPersistence: vi.fn().mockResolvedValue(undefined),
    });
    beginFinalizationRequestMock
      .mockResolvedValueOnce({
        kind: "claimed",
        row: buildClaimedRow(),
      })
      .mockResolvedValueOnce({
        kind: "claimed",
        row: buildClaimedRow({
          last_error: "write failed",
          external_artifacts: buildResumeArtifacts(),
          external_stage: "spreadsheet.structure_insertions_done",
          updated_at: "2026-04-14T00:00:01.000Z",
        }),
      });
    resolveFinalizationRecoveryDecisionMock
      .mockResolvedValueOnce({ kind: "cold" })
      .mockResolvedValueOnce({
        kind: "resume",
        externalStage: "spreadsheet.structure_insertions_done",
        externalArtifacts: buildResumeArtifacts(),
      });
    inspectFooterActaWritesMock
      .mockResolvedValueOnce([
        {
          sheetName: PRESENTACION_SHEET_NAME,
          rowIndex: 77,
          columnIndex: 0,
          range: `'${PRESENTACION_SHEET_NAME}'!A78`,
          value: "www.recacolombia.org\nACTA ID: ACTA-123",
          currentValue: "www.recacolombia.org",
          applied: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          sheetName: PRESENTACION_SHEET_NAME,
          rowIndex: 78,
          columnIndex: 0,
          range: `'${PRESENTACION_SHEET_NAME}'!A79`,
          value: "www.recacolombia.org\nACTA ID: ACTA-123",
          currentValue: "www.recacolombia.org\nACTA ID: ACTA-123",
          applied: true,
        },
      ]);
    applyFormSheetCellWritesMock
      .mockRejectedValueOnce(new Error("write failed"))
      .mockResolvedValueOnce(undefined);

    const firstResponse = await POST(buildRequest(buildBody()));
    expect(firstResponse.status).toBe(500);

    const secondResponse = await POST(buildRequest(buildBody()));

    expect(secondResponse.status).toBe(200);
    await expect(secondResponse.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/presentacion",
      pdfLink: "https://drive.example/presentacion.pdf",
    });
    expect(prepareFinalizationSpreadsheetPipelineMock).toHaveBeenCalledTimes(1);
    expect(writeFooterActaMarkerMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetStructureInsertionsMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledTimes(2);
    expect(exportSheetToPdfMock).toHaveBeenCalledWith("spreadsheet-id");
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it("resumes reactivacion overflow with the real footer boundary without rewriting structural rows", async () => {
    const reactivacionBody = buildBody({ tipo_visita: "Reactivaci\u00F3n" });
    const reactivacionArtifacts = buildResumeArtifacts({
      sheetName: REACTIVACION_SHEET_NAME,
    });

    prepareFinalizationSpreadsheetPipelineMock.mockResolvedValue({
      preparedSpreadsheet: {
        spreadsheetId: "spreadsheet-id",
        companyFolderId: "company-folder-id",
        spreadsheetResourceMode: "legacy_company",
        prewarmStateSnapshot: null,
        effectiveSheetReplacements: null,
        effectiveMutation: { writes: [] },
        activeSheetName: "REACTIVACION",
        activeSheetId: 902,
        sheetLink: "https://sheets.example/presentacion",
        reusedSpreadsheet: false,
        prewarmStatus: "disabled",
        prewarmReused: false,
        prewarmStructureSignature: null,
      },
      trackingContext: {
        prewarmStatus: "disabled",
        prewarmReused: false,
        prewarmStructureSignature: null,
      },
      sealAfterPersistence: vi.fn().mockResolvedValue(undefined),
    });
    beginFinalizationRequestMock
      .mockResolvedValueOnce({
        kind: "claimed",
        row: buildClaimedRow(),
      })
      .mockResolvedValueOnce({
        kind: "claimed",
        row: buildClaimedRow({
          last_error: "write failed",
          external_artifacts: reactivacionArtifacts,
          external_stage: "spreadsheet.structure_insertions_done",
          updated_at: "2026-04-14T00:00:01.000Z",
        }),
      });
    resolveFinalizationRecoveryDecisionMock
      .mockResolvedValueOnce({ kind: "cold" })
      .mockResolvedValueOnce({
        kind: "resume",
        externalStage: "spreadsheet.structure_insertions_done",
        externalArtifacts: reactivacionArtifacts,
      });
    inspectFooterActaWritesMock
      .mockResolvedValueOnce([
        {
          sheetName: REACTIVACION_SHEET_NAME,
          rowIndex: 77,
          columnIndex: 0,
          range: `'${REACTIVACION_SHEET_NAME}'!A78`,
          value: "www.recacolombia.org\nACTA ID: ACTA-123",
          currentValue: "www.recacolombia.org",
          applied: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          sheetName: REACTIVACION_SHEET_NAME,
          rowIndex: 78,
          columnIndex: 0,
          range: `'${REACTIVACION_SHEET_NAME}'!A79`,
          value: "www.recacolombia.org\nACTA ID: ACTA-123",
          currentValue: "www.recacolombia.org\nACTA ID: ACTA-123",
          applied: true,
        },
      ]);
    applyFormSheetCellWritesMock
      .mockRejectedValueOnce(new Error("write failed"))
      .mockResolvedValueOnce(undefined);

    const firstResponse = await POST(buildRequest(reactivacionBody));
    expect(firstResponse.status).toBe(500);

    const secondResponse = await POST(buildRequest(reactivacionBody));

    expect(secondResponse.status).toBe(200);
    await expect(secondResponse.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/presentacion",
      pdfLink: "https://drive.example/presentacion.pdf",
    });
    expect(applyFormSheetStructureInsertionsMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledTimes(2);
  });

  it("fails safely on resume when footer markers are missing after Google already wrote the marker", async () => {
    const artifactsWithoutMarkers = {
      ...buildResumeArtifacts(),
      footerMutationMarkers: [],
      structureInsertionsAppliedAt: null,
    };

    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: buildClaimedRow({
        last_error: "resume failed",
        external_artifacts: artifactsWithoutMarkers,
        external_stage: "spreadsheet.footer_marker_written",
        updated_at: "2026-04-14T00:00:01.000Z",
      }),
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValue({
      kind: "resume",
      externalStage: "spreadsheet.footer_marker_written",
      externalArtifacts: artifactsWithoutMarkers,
    });
    inspectFooterActaWritesMock.mockResolvedValue([
      {
        sheetName: PRESENTACION_SHEET_NAME,
        rowIndex: 77,
        columnIndex: 0,
        range: `'${PRESENTACION_SHEET_NAME}'!A78`,
        value: "www.recacolombia.org\nACTA ID: ACTA-123",
        currentValue: "www.recacolombia.org\nACTA ID: ACTA-123",
        applied: true,
      },
    ]);

    const response = await POST(buildRequest(buildBody()));

    expect(response.status).toBe(500);
    expect(prepareFinalizationSpreadsheetPipelineMock).not.toHaveBeenCalled();
    expect(writeFooterActaMarkerMock).not.toHaveBeenCalled();
    expect(applyFormSheetStructureInsertionsMock).not.toHaveBeenCalled();
    expect(applyFormSheetCellWritesMock).not.toHaveBeenCalled();
    expect(exportSheetToPdfMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("fails safely when resume reports a structural insertion after the real footer boundary", async () => {
    const unsafeArtifacts = buildResumeArtifacts({
      initialRowIndex: 77,
      expectedFinalRowIndex: 79,
    });

    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: buildClaimedRow({
        last_error: "resume failed",
        external_artifacts: unsafeArtifacts,
        external_stage: "spreadsheet.footer_marker_written",
        updated_at: "2026-04-14T00:00:01.000Z",
      }),
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValue({
      kind: "resume",
      externalStage: "spreadsheet.footer_marker_written",
      externalArtifacts: unsafeArtifacts,
    });
    inspectFooterActaWritesMock.mockResolvedValue([
      {
        sheetName: PRESENTACION_SHEET_NAME,
        rowIndex: 78,
        columnIndex: 0,
        range: `'${PRESENTACION_SHEET_NAME}'!A79`,
        value: "www.recacolombia.org\nACTA ID: ACTA-123",
        currentValue: "www.recacolombia.org\nACTA ID: ACTA-123",
        applied: true,
      },
    ]);

    const response = await POST(buildRequest(buildBody()));

    expect(response.status).toBe(500);
    expect(writeFooterActaMarkerMock).not.toHaveBeenCalled();
    expect(applyFormSheetStructureInsertionsMock).not.toHaveBeenCalled();
    expect(applyFormSheetCellWritesMock).not.toHaveBeenCalled();
  });
});
