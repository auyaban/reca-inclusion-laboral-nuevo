import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFinalizationRequestHash } from "@/lib/finalization/idempotency";
import { normalizeInterpreteLscValues } from "@/lib/interpreteLsc";

const {
  createClientMock,
  getUserMock,
  fromMock,
  insertMock,
  beginFinalizationRequestMock,
  markFinalizationRequestStageMock,
  markFinalizationRequestSucceededSafelyMock,
  markFinalizationRequestFailedSafelyMock,
  createFinalizationProfilerMock,
  profilerMarkMock,
  profilerFinishMock,
  profilerFailMock,
  persistFinalizationExternalArtifactsMock,
  getOrCreateFolderMock,
  exportSheetToPdfMock,
  uploadPdfMock,
  uploadJsonArtifactMock,
  prepareFinalizationSpreadsheetPipelineMock,
  inspectFooterActaWritesMock,
  writeFooterActaMarkerMock,
  applyFormSheetStructureInsertionsMock,
  applyFormSheetCellWritesMock,
  hideSheetsMock,
  getFinalizationUserIdentityMock,
  recoverPersistedFinalizationResponseMock,
  resolveFinalizationRecoveryDecisionMock,
  sealAfterPersistenceMock,
} = vi.hoisted(() => {
  const profilerMarkMock = vi.fn();
  const profilerFinishMock = vi.fn();
  const profilerFailMock = vi.fn();
  const sealAfterPersistenceMock = vi.fn();

  return {
    createClientMock: vi.fn(),
    getUserMock: vi.fn(),
    fromMock: vi.fn(),
    insertMock: vi.fn(),
    beginFinalizationRequestMock: vi.fn(),
    markFinalizationRequestStageMock: vi.fn(),
    markFinalizationRequestSucceededSafelyMock: vi.fn(),
    markFinalizationRequestFailedSafelyMock: vi.fn(),
    createFinalizationProfilerMock: vi.fn(),
    profilerMarkMock,
    profilerFinishMock,
    profilerFailMock,
    persistFinalizationExternalArtifactsMock: vi.fn(),
    getOrCreateFolderMock: vi.fn(),
    exportSheetToPdfMock: vi.fn(),
    uploadPdfMock: vi.fn(),
    uploadJsonArtifactMock: vi.fn(),
    prepareFinalizationSpreadsheetPipelineMock: vi.fn(),
    inspectFooterActaWritesMock: vi.fn(),
    writeFooterActaMarkerMock: vi.fn(),
    applyFormSheetStructureInsertionsMock: vi.fn(),
    applyFormSheetCellWritesMock: vi.fn(),
    hideSheetsMock: vi.fn(),
    getFinalizationUserIdentityMock: vi.fn(),
    recoverPersistedFinalizationResponseMock: vi.fn(),
    resolveFinalizationRecoveryDecisionMock: vi.fn(),
    sealAfterPersistenceMock,
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
    FINALIZATION_IN_PROGRESS_CODE: "finalization_in_progress",
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
    markFinalizationRequestSucceededSafely:
      markFinalizationRequestSucceededSafelyMock,
    markFinalizationRequestFailedSafely: markFinalizationRequestFailedSafelyMock,
    isFinalizationClaimExhaustedError: vi.fn(() => false),
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

vi.mock("@/lib/finalization/profiler", () => ({
  createFinalizationProfiler: createFinalizationProfilerMock,
}));

vi.mock("@/lib/finalization/finalizationUser", () => ({
  getFinalizationUserIdentity: getFinalizationUserIdentityMock,
}));

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
    hideSheets: hideSheetsMock,
  };
});

import { POST } from "@/app/api/formularios/interprete-lsc/route";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/formularios/interprete-lsc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

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

function buildValidBody() {
  return buildValidBodyWithCounts({});
}

function buildValidBodyWithCounts(options: {
  oferentesCount?: number;
  interpretesCount?: number;
  asistentesCount?: number;
}) {
  const empresa = buildEmpresa();
  const oferentesCount = Math.max(1, options.oferentesCount ?? 1);
  const interpretesCount = Math.max(1, options.interpretesCount ?? 1);
  const asistentesCount = Math.max(2, options.asistentesCount ?? 2);

  return {
    empresa,
    formData: normalizeInterpreteLscValues(
      {
        fecha_visita: "2026-04-21",
        modalidad_interprete: "Presencial",
        modalidad_profesional_reca: "Virtual",
        nit_empresa: "900123456",
        oferentes: Array.from({ length: oferentesCount }, (_, index) => ({
          nombre_oferente: `Oferente ${index + 1}`,
          cedula: String(123 + index),
          proceso: index % 2 === 0 ? "Ruta inclusion" : "Seguimiento",
        })),
        interpretes: Array.from({ length: interpretesCount }, (_, index) => ({
          nombre: index === 0 ? "Luisa Gomez" : `Interprete ${index + 1}`,
          hora_inicial: index % 2 === 0 ? "9" : "13:00",
          hora_final: index % 2 === 0 ? "11:30" : "15:30",
        })),
        sabana: { activo: true, horas: 2 },
        asistentes: Array.from({ length: asistentesCount }, (_, index) => ({
          nombre:
            index === 0
              ? "Marta Ruiz"
              : index === 1
                ? "Laura Gomez"
                : `Asistente ${index + 1}`,
          cargo:
            index === 0
              ? "Profesional RECA"
              : index === 1
                ? "Gerente"
                : `Cargo ${index + 1}`,
        })),
      },
      empresa as never
    ),
    finalization_identity: {
      draft_id: "draft-interprete-lsc-1",
      local_draft_session_id: "session-interprete-lsc-1",
    },
  };
}

function buildResumeArtifacts(overrides: Record<string, unknown> = {}) {
  return {
    sheetLink: "https://sheets.example/interprete-lsc",
    spreadsheetId: "spreadsheet-id",
    companyFolderId: "company-folder-id",
    activeSheetName: "Maestro",
    actaRef: "NPSDFHVR",
    footerActaRefs: [
      {
        sheetName: "Maestro",
        actaRef: "NPSDFHVR",
      },
    ],
    footerMutationMarkers: [
      {
        sheetName: "Maestro",
        actaRef: "NPSDFHVR",
        initialRowIndex: 40,
        expectedFinalRowIndex: 40,
      },
    ],
    effectiveSheetReplacements: null,
    spreadsheetResourceMode: "legacy_company",
    prewarmStateSnapshot: null,
    prewarmStatus: "disabled",
    prewarmReused: false,
    prewarmStructureSignature: null,
    ...overrides,
  };
}

function buildAggressiveOverflowResumeArtifacts(options: {
  initialRowIndex: number;
  expectedFinalRowIndex: number;
}) {
  return buildResumeArtifacts({
    footerMutationMarkers: [
      {
        sheetName: "Maestro",
        actaRef: "NPSDFHVR",
        initialRowIndex: options.initialRowIndex,
        expectedFinalRowIndex: options.expectedFinalRowIndex,
      },
    ],
  });
}

describe("POST /api/formularios/interprete-lsc", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    delete process.env.GOOGLE_SHEETS_LSC_TEMPLATE_ID;
    process.env.GOOGLE_DRIVE_FOLDER_ID = "drive-folder-id";
    process.env.GOOGLE_DRIVE_PDF_FOLDER_ID = "pdf-folder-id";

    getUserMock.mockResolvedValue({
      data: { user: { id: "user-9", email: "aaron@example.com" } },
      error: null,
    });

    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
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

    getOrCreateFolderMock.mockResolvedValue("folder-id");
    exportSheetToPdfMock.mockResolvedValue(Buffer.from("pdf-bytes"));
    uploadPdfMock.mockResolvedValue({
      fileId: "pdf-file-id",
      webViewLink: "https://drive.example/interprete-lsc.pdf",
    });
    uploadJsonArtifactMock.mockResolvedValue({
      fileId: "json-file-id",
      webViewLink: "https://drive.example/interprete-lsc-raw.json",
    });

    sealAfterPersistenceMock.mockResolvedValue(undefined);
    prepareFinalizationSpreadsheetPipelineMock.mockResolvedValue({
      preparedSpreadsheet: {
        spreadsheetId: "spreadsheet-id",
        companyFolderId: "company-folder-id",
        spreadsheetResourceMode: "legacy_company",
        prewarmStateSnapshot: null,
        effectiveMutation: { writes: [] },
        activeSheetName: "Maestro",
        activeSheetId: 901,
        sheetLink: "https://sheets.example/interprete-lsc",
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
      sealAfterPersistence: sealAfterPersistenceMock,
    });

    inspectFooterActaWritesMock.mockResolvedValue([]);
    writeFooterActaMarkerMock.mockResolvedValue(undefined);
    applyFormSheetStructureInsertionsMock.mockResolvedValue(undefined);
    applyFormSheetCellWritesMock.mockResolvedValue(undefined);
    hideSheetsMock.mockResolvedValue(new Map([["Maestro", 901]]));
    recoverPersistedFinalizationResponseMock.mockResolvedValue(null);
    resolveFinalizationRecoveryDecisionMock.mockResolvedValue({ kind: "cold" });
    persistFinalizationExternalArtifactsMock.mockResolvedValue(undefined);
  });

  it("returns 400 when the payload is invalid", async () => {
    const response = await POST(buildRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Required",
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the user is not authenticated", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "No autenticado",
    });
    expect(beginFinalizationRequestMock).not.toHaveBeenCalled();
  });

  it("returns 500 when Google env configuration is incomplete", async () => {
    delete process.env.GOOGLE_DRIVE_FOLDER_ID;
    delete process.env.GOOGLE_DRIVE_PDF_FOLDER_ID;

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Faltan variables de entorno de Google Drive o Sheets",
    });
    expect(beginFinalizationRequestMock).not.toHaveBeenCalled();
  });

  it("returns 200 replaying a cached success response", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "replay",
      responsePayload: {
        success: true,
        sheetLink: "https://sheets.example/cached-interprete-lsc",
        pdfLink: "https://drive.example/cached-interprete-lsc.pdf",
      },
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/cached-interprete-lsc",
      pdfLink: "https://drive.example/cached-interprete-lsc.pdf",
    });
    expect(prepareFinalizationSpreadsheetPipelineMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns 409 while an identical finalization remains in progress", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "in_progress",
      stage: "drive.export_pdf",
      retryAfterSeconds: 7,
    });

    const response = await POST(buildRequest(buildValidBody()));
    const json = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(409);
    expect(json.code).toBe("finalization_in_progress");
    expect(json.stage).toBe("drive.export_pdf");
    expect(response.headers.get("Retry-After")).toBe("7");
  });

  it("runs the success flow and persists sheet, pdf and normalized payload metadata", async () => {
    const body = buildValidBody();
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "interprete-lsc",
        user_id: "user-9",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-21T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-21T00:00:00.000Z",
      },
    });

    const response = await POST(buildRequest(body));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/interprete-lsc",
      pdfLink: "https://drive.example/interprete-lsc.pdf",
    });
    expect(beginFinalizationRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestHash: buildFinalizationRequestHash(
          "interprete-lsc",
          body.formData as never
        ),
      })
    );
    expect(prepareFinalizationSpreadsheetPipelineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "interprete-lsc",
        activeSheetName: "Maestro",
        masterTemplateId: "1WLAoc5lKHEoH3dkR1aQv6UYpEw97b9iNc2k43hCKrmk",
        mutation: expect.objectContaining({
          footerActaRefs: [
            expect.objectContaining({
              sheetName: "Maestro",
              actaRef: expect.stringMatching(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/),
            }),
          ],
        }),
      })
    );
    expect(writeFooterActaMarkerMock).toHaveBeenCalledOnce();
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledOnce();
    expect(hideSheetsMock).toHaveBeenCalledWith("spreadsheet-id", ["Maestro"]);
    expect(exportSheetToPdfMock).toHaveBeenCalledWith("spreadsheet-id");
    expect(uploadPdfMock).toHaveBeenCalledOnce();
    expect(uploadJsonArtifactMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledOnce();

    const insertedRecord = insertMock.mock.calls[0]?.[0];
    expect(insertedRecord).toEqual(
      expect.objectContaining({
        usuario_login: "aaron_vercel",
        nombre_formato: "Servicio de Interpretacion LSC",
        path_formato: "https://sheets.example/interprete-lsc",
        acta_ref: expect.stringMatching(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/),
      })
    );
    expect(insertedRecord?.payload_normalized?.metadata?.finalization).toEqual({
      form_slug: "interprete-lsc",
      request_hash: beginFinalizationRequestMock.mock.calls[0]?.[0]?.requestHash,
      idempotency_key:
        beginFinalizationRequestMock.mock.calls[0]?.[0]?.idempotencyKey,
      identity_key: "draft-interprete-lsc-1",
    });
    expect(insertedRecord?.payload_normalized?.attachment?.document_kind).toBe(
      "lsc_interpretation"
    );
    expect(insertedRecord?.payload_normalized?.parsed_raw?.tipo_acta).toBe(
      "interprete_lsc"
    );
    expect(insertedRecord?.payload_normalized?.parsed_raw?.sheet_link).toBe(
      "https://sheets.example/interprete-lsc"
    );
    expect(insertedRecord?.payload_normalized?.parsed_raw?.pdf_link).toBe(
      "https://drive.example/interprete-lsc.pdf"
    );
    expect(insertedRecord?.payload_normalized?.parsed_raw?.interpretes).toEqual([
      {
        nombre: "Luisa Gomez",
        hora_inicial: "09:00",
        hora_final: "11:30",
        total_tiempo: "2:30",
      },
    ]);
    expect(
      insertedRecord?.payload_normalized?.parsed_raw?.interpretes_nombres
    ).toEqual(["Luisa Gomez"]);
    expect(insertedRecord?.payload_raw).toEqual(
      expect.objectContaining({
        form_id: "interprete_lsc",
        metadata: expect.objectContaining({
          acta_ref: insertedRecord?.acta_ref,
        }),
      })
    );
    expect(
      insertedRecord?.payload_normalized?.metadata?.raw_payload_artifact?.status
    ).toBe("uploaded");
    expect(markFinalizationRequestSucceededSafelyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-9",
        stage: "succeeded",
        responsePayload: {
          success: true,
          sheetLink: "https://sheets.example/interprete-lsc",
          pdfLink: "https://drive.example/interprete-lsc.pdf",
        },
      })
    );
    expect(markFinalizationRequestFailedSafelyMock).not.toHaveBeenCalled();
  });

  it("recomputes tampered derived values before persisting payload and sheet mutation", async () => {
    const body = buildValidBody();
    body.formData.interpretes[0] = {
      ...body.formData.interpretes[0],
      total_tiempo: "99:99",
    };
    body.formData.sumatoria_horas = "77:77";

    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "interprete-lsc",
        user_id: "user-9",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-21T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-21T00:00:00.000Z",
      },
    });

    const response = await POST(buildRequest(body));

    expect(response.status).toBe(200);
    expect(prepareFinalizationSpreadsheetPipelineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          writes: expect.arrayContaining([
            expect.objectContaining({
              range: "'Maestro'!Q19",
              value: "2:30",
            }),
            expect.objectContaining({
              range: "'Maestro'!Q21",
              value: "4:30",
            }),
          ]),
        }),
      })
    );

    const insertedRecord = insertMock.mock.calls[0]?.[0];
    expect(insertedRecord?.payload_normalized?.parsed_raw?.interpretes).toEqual([
      {
        nombre: "Luisa Gomez",
        hora_inicial: "09:00",
        hora_final: "11:30",
        total_tiempo: "2:30",
      },
    ]);
    expect(insertedRecord?.payload_normalized?.parsed_raw?.sumatoria_horas).toBe(
      "4:30"
    );
  });

  it("keeps the finalization successful when raw payload upload fails", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "interprete-lsc",
        user_id: "user-9",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-21T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-21T00:00:00.000Z",
      },
    });
    uploadJsonArtifactMock.mockRejectedValueOnce(new Error("raw upload failed"));

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    const insertedRecord = insertMock.mock.calls[0]?.[0];
    expect(
      insertedRecord?.payload_normalized?.metadata?.raw_payload_artifact?.status
    ).toBe("failed");
    expect(markFinalizationRequestSucceededSafelyMock).toHaveBeenCalledOnce();
  });

  it("resumes from persisted external artifacts without rewriting the sheet", async () => {
    const externalArtifacts = buildResumeArtifacts({
      mutationAppliedAt: "2026-04-21T00:00:05.000Z",
      hiddenSheetsAppliedAt: "2026-04-21T00:00:06.000Z",
    });
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "interprete-lsc",
        user_id: "user-9",
        status: "processing",
        stage: "drive.upload_pdf",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        external_artifacts: externalArtifacts,
        external_stage: "spreadsheet.hide_unused_sheets_done",
        started_at: "2026-04-21T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-21T00:00:00.000Z",
      },
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValueOnce({
      kind: "resume",
      externalStage: "spreadsheet.hide_unused_sheets_done",
      externalArtifacts,
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    expect(prepareFinalizationSpreadsheetPipelineMock).not.toHaveBeenCalled();
    expect(writeFooterActaMarkerMock).not.toHaveBeenCalled();
    expect(applyFormSheetStructureInsertionsMock).not.toHaveBeenCalled();
    expect(applyFormSheetCellWritesMock).not.toHaveBeenCalled();
    expect(hideSheetsMock).not.toHaveBeenCalled();
    expect(exportSheetToPdfMock).toHaveBeenCalledWith("spreadsheet-id");
  });

  it("skips PDF folder resolution and PDF export when resume artifacts already include pdfLink", async () => {
    const externalArtifacts = buildResumeArtifacts({
      mutationAppliedAt: "2026-04-21T00:00:05.000Z",
      hiddenSheetsAppliedAt: "2026-04-21T00:00:06.000Z",
      pdfLink: "https://drive.example/cached-interprete-lsc.pdf",
    });
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "interprete-lsc",
        user_id: "user-9",
        status: "processing",
        stage: "drive.upload_pdf",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        external_artifacts: externalArtifacts,
        external_stage: "drive.upload_pdf",
        started_at: "2026-04-21T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-21T00:00:00.000Z",
      },
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValueOnce({
      kind: "resume",
      externalStage: "drive.upload_pdf",
      externalArtifacts,
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/interprete-lsc",
      pdfLink: "https://drive.example/cached-interprete-lsc.pdf",
    });
    expect(prepareFinalizationSpreadsheetPipelineMock).not.toHaveBeenCalled();
    expect(getOrCreateFolderMock).not.toHaveBeenCalledWith(
      "pdf-folder-id",
      "ACME SAS"
    );
    expect(exportSheetToPdfMock).not.toHaveBeenCalled();
    expect(uploadPdfMock).not.toHaveBeenCalled();
    expect(uploadJsonArtifactMock).toHaveBeenCalledOnce();
  });

  it("resumes after a crash between final cell writes and artifact persistence without rerunning structural work", async () => {
    beginFinalizationRequestMock
      .mockResolvedValueOnce({
        kind: "claimed",
        row: {
          idempotency_key: "key",
          form_slug: "interprete-lsc",
          user_id: "user-9",
          status: "processing",
          stage: "request.validated",
          request_hash: "hash",
          response_payload: null,
          last_error: null,
          external_artifacts: null,
          external_stage: null,
          started_at: "2026-04-21T00:00:00.000Z",
          completed_at: null,
          updated_at: "2026-04-21T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        kind: "claimed",
        row: {
          idempotency_key: "key",
          form_slug: "interprete-lsc",
          user_id: "user-9",
          status: "processing",
          stage: "request.validated",
          request_hash: "hash",
          response_payload: null,
          last_error: "persist failed",
          external_artifacts: buildResumeArtifacts(),
          external_stage: "spreadsheet.footer_marker_written",
          started_at: "2026-04-21T00:00:00.000Z",
          completed_at: null,
          updated_at: "2026-04-21T00:00:01.000Z",
        },
      });
    resolveFinalizationRecoveryDecisionMock
      .mockResolvedValueOnce({ kind: "cold" })
      .mockResolvedValueOnce({
        kind: "resume",
        externalStage: "spreadsheet.footer_marker_written",
        externalArtifacts: buildResumeArtifacts(),
      });
    persistFinalizationExternalArtifactsMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("persist failed"))
      .mockResolvedValue(undefined);
    inspectFooterActaWritesMock
      .mockResolvedValueOnce([
        {
          sheetName: "Maestro",
          rowIndex: 40,
          columnIndex: 0,
          range: "'Maestro'!A41",
          value: "www.recacolombia.org\nACTA ID: NPSDFHVR",
          currentValue: "www.recacolombia.org",
          applied: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          sheetName: "Maestro",
          rowIndex: 40,
          columnIndex: 0,
          range: "'Maestro'!A41",
          value: "www.recacolombia.org\nACTA ID: NPSDFHVR",
          currentValue: "www.recacolombia.org\nACTA ID: NPSDFHVR",
          applied: true,
        },
      ]);

    const firstResponse = await POST(buildRequest(buildValidBody()));
    expect(firstResponse.status).toBe(500);

    const secondResponse = await POST(buildRequest(buildValidBody()));

    expect(secondResponse.status).toBe(200);
    await expect(secondResponse.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/interprete-lsc",
      pdfLink: "https://drive.example/interprete-lsc.pdf",
    });
    expect(prepareFinalizationSpreadsheetPipelineMock).toHaveBeenCalledTimes(1);
    expect(writeFooterActaMarkerMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetStructureInsertionsMock).not.toHaveBeenCalled();
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledTimes(2);
    expect(hideSheetsMock).toHaveBeenCalledTimes(1);
  });

  it("resumes aggressive overflow after structural insertions without rerunning the sheet structure", async () => {
    const overflowBody = buildValidBodyWithCounts({
      oferentesCount: 10,
      interpretesCount: 5,
      asistentesCount: 4,
    });
    const structuralArtifacts = buildAggressiveOverflowResumeArtifacts({
      initialRowIndex: 33,
      expectedFinalRowIndex: 42,
    });

    beginFinalizationRequestMock
      .mockResolvedValueOnce({
        kind: "claimed",
        row: {
          idempotency_key: "key",
          form_slug: "interprete-lsc",
          user_id: "user-9",
          status: "processing",
          stage: "request.validated",
          request_hash: "hash",
          response_payload: null,
          last_error: null,
          external_artifacts: null,
          external_stage: null,
          started_at: "2026-04-21T00:00:00.000Z",
          completed_at: null,
          updated_at: "2026-04-21T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        kind: "claimed",
        row: {
          idempotency_key: "key",
          form_slug: "interprete-lsc",
          user_id: "user-9",
          status: "processing",
          stage: "request.validated",
          request_hash: "hash",
          response_payload: null,
          last_error: "write failed",
          external_artifacts: {
            ...structuralArtifacts,
            mutationAppliedAt: null,
            hiddenSheetsAppliedAt: null,
            pdfLink: null,
            footerMarkerWrittenAt: "2026-04-21T00:00:00.000Z",
            structureInsertionsAppliedAt: "2026-04-21T00:00:01.000Z",
          },
          external_stage: "spreadsheet.structure_insertions_done",
          started_at: "2026-04-21T00:00:00.000Z",
          completed_at: null,
          updated_at: "2026-04-21T00:00:02.000Z",
        },
      });
    resolveFinalizationRecoveryDecisionMock
      .mockResolvedValueOnce({ kind: "cold" })
      .mockResolvedValueOnce({
        kind: "resume",
        externalStage: "spreadsheet.structure_insertions_done",
        externalArtifacts: {
          ...structuralArtifacts,
          mutationAppliedAt: null,
          hiddenSheetsAppliedAt: null,
          pdfLink: null,
          footerMarkerWrittenAt: "2026-04-21T00:00:00.000Z",
          structureInsertionsAppliedAt: "2026-04-21T00:00:01.000Z",
        },
      });
    inspectFooterActaWritesMock
      .mockResolvedValueOnce([
        {
          sheetName: "Maestro",
          rowIndex: 33,
          columnIndex: 0,
          range: "'Maestro'!A34",
          value: "www.recacolombia.org\nACTA ID: NPSDFHVR",
          currentValue: "www.recacolombia.org",
          applied: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          sheetName: "Maestro",
          rowIndex: 42,
          columnIndex: 0,
          range: "'Maestro'!A43",
          value: "www.recacolombia.org\nACTA ID: NPSDFHVR",
          currentValue: "www.recacolombia.org\nACTA ID: NPSDFHVR",
          applied: true,
        },
      ]);
    applyFormSheetCellWritesMock
      .mockRejectedValueOnce(new Error("write failed"))
      .mockResolvedValueOnce(undefined);

    const firstResponse = await POST(buildRequest(overflowBody));
    expect(firstResponse.status).toBe(500);

    const secondResponse = await POST(buildRequest(overflowBody));

    expect(secondResponse.status).toBe(200);
    await expect(secondResponse.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/interprete-lsc",
      pdfLink: "https://drive.example/interprete-lsc.pdf",
    });
    expect(prepareFinalizationSpreadsheetPipelineMock).toHaveBeenCalledTimes(1);
    expect(writeFooterActaMarkerMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetStructureInsertionsMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledTimes(2);
    expect(hideSheetsMock).toHaveBeenCalledTimes(1);
  });

  it("does not trip the footer guard when later row insertions already live in post-row coordinates", async () => {
    const overflowBody = buildValidBodyWithCounts({
      oferentesCount: 10,
      interpretesCount: 5,
      asistentesCount: 4,
    });

    beginFinalizationRequestMock.mockResolvedValueOnce({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "interprete-lsc",
        user_id: "user-9",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        external_artifacts: null,
        external_stage: null,
        started_at: "2026-04-21T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-21T00:00:00.000Z",
      },
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValueOnce({
      kind: "cold",
    });
    inspectFooterActaWritesMock.mockResolvedValueOnce([
      {
        sheetName: "Maestro",
        rowIndex: 26,
        columnIndex: 0,
        range: "'Maestro'!A27",
        value: "www.recacolombia.org\nACTA ID: NPSDFHVR",
        currentValue: "www.recacolombia.org",
        applied: false,
      },
    ]);

    const response = await POST(buildRequest(overflowBody));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/interprete-lsc",
      pdfLink: "https://drive.example/interprete-lsc.pdf",
    });
    expect(writeFooterActaMarkerMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetStructureInsertionsMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledTimes(1);
  });

  it("fails safe when aggressive overflow still points templateRow after the footer", async () => {
    const overflowBody = buildValidBodyWithCounts({
      oferentesCount: 10,
      interpretesCount: 5,
      asistentesCount: 4,
    });

    inspectFooterActaWritesMock.mockResolvedValueOnce([
      {
        sheetName: "Maestro",
        rowIndex: 25,
        columnIndex: 0,
        range: "'Maestro'!A26",
        value: "www.recacolombia.org\nACTA ID: NPSDFHVR",
        currentValue: "www.recacolombia.org",
        applied: false,
      },
    ]);

    const response = await POST(buildRequest(overflowBody));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error:
          'La insercion estructural de "Maestro" ocurre despues del footer ACTA ID y no se puede reanudar de forma segura.',
      })
    );
    expect(writeFooterActaMarkerMock).not.toHaveBeenCalled();
    expect(applyFormSheetStructureInsertionsMock).not.toHaveBeenCalled();
    expect(applyFormSheetCellWritesMock).not.toHaveBeenCalled();
  });

  it("runs hideSheets on resume when mutation was applied but sheets are still visible", async () => {
    const externalArtifacts = buildResumeArtifacts({
      mutationAppliedAt: "2026-04-21T00:00:05.000Z",
    });
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "interprete-lsc",
        user_id: "user-9",
        status: "processing",
        stage: "spreadsheet.apply_mutation_done",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        external_artifacts: externalArtifacts,
        external_stage: "spreadsheet.apply_mutation_done",
        started_at: "2026-04-21T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-21T00:00:00.000Z",
      },
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValueOnce({
      kind: "resume",
      externalStage: "spreadsheet.apply_mutation_done",
      externalArtifacts,
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    expect(writeFooterActaMarkerMock).not.toHaveBeenCalled();
    expect(applyFormSheetStructureInsertionsMock).not.toHaveBeenCalled();
    expect(applyFormSheetCellWritesMock).not.toHaveBeenCalled();
    expect(hideSheetsMock).toHaveBeenCalledWith("spreadsheet-id", ["Maestro"]);
  });

  it("skips PDF export on resume when the artifact already has pdfLink", async () => {
    const externalArtifacts = buildResumeArtifacts({
      mutationAppliedAt: "2026-04-21T00:00:05.000Z",
      hiddenSheetsAppliedAt: "2026-04-21T00:00:06.000Z",
      pdfLink: "https://drive.example/persisted-interprete-lsc.pdf",
    });
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "interprete-lsc",
        user_id: "user-9",
        status: "processing",
        stage: "drive.upload_pdf",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        external_artifacts: externalArtifacts,
        external_stage: "drive.upload_pdf",
        started_at: "2026-04-21T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-21T00:00:00.000Z",
      },
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValueOnce({
      kind: "resume",
      externalStage: "drive.upload_pdf",
      externalArtifacts,
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/interprete-lsc",
      pdfLink: "https://drive.example/persisted-interprete-lsc.pdf",
    });
    expect(exportSheetToPdfMock).not.toHaveBeenCalled();
    expect(uploadPdfMock).not.toHaveBeenCalled();
  });

  it("recovers a persisted success when a post-persistence step fails", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "interprete-lsc",
        user_id: "user-9",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-21T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-21T00:00:00.000Z",
      },
    });
    sealAfterPersistenceMock.mockRejectedValueOnce(new Error("rename failed"));
    recoverPersistedFinalizationResponseMock.mockResolvedValueOnce({
      success: true,
      sheetLink: "https://sheets.example/recovered-interprete-lsc",
      pdfLink: "https://drive.example/recovered-interprete-lsc.pdf",
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/recovered-interprete-lsc",
      pdfLink: "https://drive.example/recovered-interprete-lsc.pdf",
    });
    expect(recoverPersistedFinalizationResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "interprete-lsc",
      })
    );
    expect(markFinalizationRequestFailedSafelyMock).not.toHaveBeenCalled();
  });
});
