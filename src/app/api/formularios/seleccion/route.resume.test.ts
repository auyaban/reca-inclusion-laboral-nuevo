import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildValidSeleccionValues } from "@/lib/testing/seleccionFixtures";

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
  upsertUsuariosRecaRowsMock,
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
    upsertUsuariosRecaRowsMock: vi.fn(),
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

vi.mock("@/lib/usuariosRecaServer", () => ({
  upsertUsuariosRecaRows: upsertUsuariosRecaRowsMock,
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

import { POST } from "@/app/api/formularios/seleccion/route";

function buildEmpresa() {
  return {
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
  };
}

function buildBody() {
  const formData = buildValidSeleccionValues();
  formData.oferentes = [
    ...formData.oferentes,
    {
      ...formData.oferentes[0],
      nombre_oferente: "Segundo oferente",
      cedula: "998877",
    },
  ];

  return {
    empresa: buildEmpresa(),
    formData,
    finalization_identity: {
      draft_id: "draft-seleccion-1",
      local_draft_session_id: "session-seleccion-1",
    },
  };
}

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/formularios/seleccion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildResumeArtifacts() {
  return {
    sheetLink: "https://sheets.example/seleccion",
    spreadsheetId: "spreadsheet-id",
    companyFolderId: "company-folder-id",
    activeSheetName: "4. SELECCIÓN INCLUYENTE",
    actaRef: "SEL12345",
    footerActaRefs: [
      {
        sheetName: "4. SELECCIÓN INCLUYENTE",
        actaRef: "SEL12345",
      },
    ],
    footerMutationMarkers: [
      {
        sheetName: "4. SELECCIÓN INCLUYENTE",
        actaRef: "SEL12345",
        initialRowIndex: 108,
        expectedFinalRowIndex: 169,
      },
    ],
    footerMarkerWrittenAt: "2026-04-23T12:00:00.000Z",
    structureInsertionsAppliedAt: "2026-04-23T12:00:01.000Z",
    effectiveSheetReplacements: null,
    spreadsheetResourceMode: "legacy_company",
    prewarmStateSnapshot: null,
    prewarmStatus: "disabled",
    prewarmReused: false,
    prewarmStructureSignature: null,
  };
}

describe("POST /api/formularios/seleccion resume", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.GOOGLE_SHEETS_MASTER_ID = "master-sheet-id";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "drive-folder-id";
    process.env.GOOGLE_DRIVE_PDF_FOLDER_ID = "pdf-folder-id";

    getUserMock.mockResolvedValue({
      data: { user: { id: "user-4", email: "aaron@example.com" } },
      error: null,
    });
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "token-4" } },
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
        reviewedCount: 3,
      })
    );

    recoverPersistedFinalizationResponseMock.mockResolvedValue(null);
    persistFinalizationExternalArtifactsMock.mockResolvedValue(undefined);
    prepareFinalizationSpreadsheetPipelineMock.mockResolvedValue({
      preparedSpreadsheet: {
        spreadsheetId: "spreadsheet-id",
        companyFolderId: "company-folder-id",
        spreadsheetResourceMode: "legacy_company",
        prewarmStateSnapshot: null,
        effectiveSheetReplacements: null,
        effectiveMutation: { writes: [] },
        activeSheetName: "4. SELECCIÓN INCLUYENTE",
        activeSheetId: 401,
        sheetLink: "https://sheets.example/seleccion",
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
    writeFooterActaMarkerMock.mockResolvedValue(undefined);
    applyFormSheetStructureInsertionsMock.mockResolvedValue(undefined);
    applyFormSheetCellWritesMock.mockResolvedValue(undefined);
    getOrCreateFolderMock.mockResolvedValue("folder-id");
    exportSheetToPdfMock.mockResolvedValue(Buffer.from("pdf-bytes"));
    uploadPdfMock.mockResolvedValue({
      fileId: "pdf-file-id",
      webViewLink: "https://drive.example/seleccion.pdf",
    });
    uploadJsonArtifactMock.mockResolvedValue({
      fileId: "json-file-id",
      webViewLink: "https://drive.example/seleccion-raw.json",
    });
    upsertUsuariosRecaRowsMock.mockResolvedValue(2);
  });

  it("does not reinsert template blocks on resume after a crash before final cell writes", async () => {
    beginFinalizationRequestMock
      .mockResolvedValueOnce({
        kind: "claimed",
        row: {
          idempotency_key: "key",
          form_slug: "seleccion",
          user_id: "user-4",
          identity_key: "draft-seleccion-1",
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
          started_at: "2026-04-23T12:00:00.000Z",
          completed_at: null,
          updated_at: "2026-04-23T12:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        kind: "claimed",
        row: {
          idempotency_key: "key",
          form_slug: "seleccion",
          user_id: "user-4",
          identity_key: "draft-seleccion-1",
          status: "processing",
          stage: "request.validated",
          request_hash: "hash",
          response_payload: null,
          last_error: "write failed",
          total_duration_ms: null,
          profiling_steps: null,
          prewarm_status: null,
          prewarm_reused: null,
          prewarm_structure_signature: null,
          external_artifacts: buildResumeArtifacts(),
          external_stage: "spreadsheet.structure_insertions_done",
          externalized_at: "2026-04-23T12:00:01.000Z",
          started_at: "2026-04-23T12:00:00.000Z",
          completed_at: null,
          updated_at: "2026-04-23T12:00:02.000Z",
        },
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
          sheetName: "4. SELECCIÓN INCLUYENTE",
          rowIndex: 108,
          columnIndex: 0,
          range: "'4. SELECCIÓN INCLUYENTE'!A109",
          value: "www.recacolombia.org\nACTA ID: SEL12345",
          currentValue: "www.recacolombia.org",
          applied: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          sheetName: "4. SELECCIÓN INCLUYENTE",
          rowIndex: 169,
          columnIndex: 0,
          range: "'4. SELECCIÓN INCLUYENTE'!A170",
          value: "www.recacolombia.org\nACTA ID: SEL12345",
          currentValue: "www.recacolombia.org\nACTA ID: SEL12345",
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
    expect(writeFooterActaMarkerMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetStructureInsertionsMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledTimes(2);
    expect(exportSheetToPdfMock).toHaveBeenCalledWith("spreadsheet-id");
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it("skips PDF folder resolution and PDF export when resume artifacts already include pdfLink", async () => {
    const externalArtifacts = {
      ...buildResumeArtifacts(),
      mutationAppliedAt: "2026-04-23T12:00:02.000Z",
      pdfLink: "https://drive.example/cached-seleccion.pdf",
    };
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "seleccion",
        user_id: "user-4",
        identity_key: "draft-seleccion-1",
        status: "processing",
        stage: "drive.upload_pdf",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        total_duration_ms: null,
        profiling_steps: null,
        prewarm_status: null,
        prewarm_reused: null,
        prewarm_structure_signature: null,
        external_artifacts: externalArtifacts,
        external_stage: "drive.upload_pdf",
        externalized_at: "2026-04-23T12:00:03.000Z",
        started_at: "2026-04-23T12:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-23T12:00:03.000Z",
      },
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValue({
      kind: "resume",
      externalStage: "drive.upload_pdf",
      externalArtifacts,
    });

    const response = await POST(buildRequest(buildBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/seleccion",
      pdfLink: "https://drive.example/cached-seleccion.pdf",
    });
    expect(prepareFinalizationSpreadsheetPipelineMock).not.toHaveBeenCalled();
    expect(writeFooterActaMarkerMock).not.toHaveBeenCalled();
    expect(applyFormSheetStructureInsertionsMock).not.toHaveBeenCalled();
    expect(applyFormSheetCellWritesMock).not.toHaveBeenCalled();
    expect(getOrCreateFolderMock).not.toHaveBeenCalledWith(
      "pdf-folder-id",
      "ACME SAS"
    );
    expect(exportSheetToPdfMock).not.toHaveBeenCalled();
    expect(uploadPdfMock).not.toHaveBeenCalled();
    expect(uploadJsonArtifactMock).toHaveBeenCalledOnce();
  });

  it("fails safely on resume when the footer lands on an ambiguous structural row", async () => {
    const ambiguousArtifacts = {
      ...buildResumeArtifacts(),
      footerMarkerWrittenAt: "2026-04-23T12:00:00.000Z",
      structureInsertionsAppliedAt: null,
    };

    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "seleccion",
        user_id: "user-4",
        identity_key: "draft-seleccion-1",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: "resume failed",
        total_duration_ms: null,
        profiling_steps: null,
        prewarm_status: null,
        prewarm_reused: null,
        prewarm_structure_signature: null,
        external_artifacts: ambiguousArtifacts,
        external_stage: "spreadsheet.footer_marker_written",
        externalized_at: "2026-04-23T12:00:01.000Z",
        started_at: "2026-04-23T12:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-23T12:00:02.000Z",
      },
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValue({
      kind: "resume",
      externalStage: "spreadsheet.footer_marker_written",
      externalArtifacts: ambiguousArtifacts,
    });
    inspectFooterActaWritesMock.mockResolvedValue([
      {
        sheetName: "4. SELECCIÃ“N INCLUYENTE",
        rowIndex: 120,
        columnIndex: 0,
        range: "'4. SELECCIÃ“N INCLUYENTE'!A121",
        value: "www.recacolombia.org\nACTA ID: SEL12345",
        currentValue: "www.recacolombia.org\nACTA ID: SEL12345",
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
});
