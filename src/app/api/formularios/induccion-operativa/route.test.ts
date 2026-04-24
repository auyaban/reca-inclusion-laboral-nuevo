import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildInduccionOperativaRequestHash } from "@/lib/induccionOperativa";
import {
  buildValidInduccionOperativaValues,
  INDUCCION_OPERATIVA_TEST_EMPRESA,
} from "@/lib/testing/induccionOperativaFixtures";

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
  withGoogleRetryMock,
  createFinalizationProfilerMock,
  profilerMarkMock,
  profilerFinishMock,
  profilerFailMock,
  getOrCreateFolderMock,
  uploadPdfMock,
  uploadJsonArtifactMock,
  prepareCompanySpreadsheetMock,
  applyFormSheetMutationMock,
  applyFormSheetStructureInsertionsMock,
  applyFormSheetCellWritesMock,
  inspectFooterActaWritesMock,
  writeFooterActaMarkerMock,
  exportSheetToPdfMock,
  getFinalizationUserIdentityMock,
  upsertUsuariosRecaRowsMock,
  reviewFinalizationTextMock,
  resolveFinalizationRecoveryDecisionMock,
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
    withGoogleRetryMock: vi.fn(),
    createFinalizationProfilerMock: vi.fn(),
    profilerMarkMock,
    profilerFinishMock,
    profilerFailMock,
    getOrCreateFolderMock: vi.fn(),
    exportSheetToPdfMock: vi.fn(),
    uploadPdfMock: vi.fn(),
    uploadJsonArtifactMock: vi.fn(),
    prepareCompanySpreadsheetMock: vi.fn(),
    applyFormSheetMutationMock: vi.fn(),
    applyFormSheetStructureInsertionsMock: vi.fn(),
    applyFormSheetCellWritesMock: vi.fn(),
    inspectFooterActaWritesMock: vi.fn(),
    writeFooterActaMarkerMock: vi.fn(),
    getFinalizationUserIdentityMock: vi.fn(),
    upsertUsuariosRecaRowsMock: vi.fn(),
    reviewFinalizationTextMock: vi.fn(),
    resolveFinalizationRecoveryDecisionMock: vi.fn(),
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
    markFinalizationRequestSucceeded: markFinalizationRequestSucceededMock,
    markFinalizationRequestFailed: markFinalizationRequestFailedMock,
    persistFinalizationExternalArtifacts:
      persistFinalizationExternalArtifactsMock,
  };
});

vi.mock("@/lib/finalization/googleRetry", () => ({
  withGoogleRetry: withGoogleRetryMock,
}));

vi.mock("@/lib/finalization/profiler", () => ({
  createFinalizationProfiler: createFinalizationProfilerMock,
}));

vi.mock("@/lib/finalization/finalizationUser", () => ({
  getFinalizationUserIdentity: getFinalizationUserIdentityMock,
}));

vi.mock("@/lib/finalization/persistedRecovery", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/finalization/persistedRecovery")
  >("@/lib/finalization/persistedRecovery");

  return {
    ...actual,
    resolveFinalizationRecoveryDecision: resolveFinalizationRecoveryDecisionMock,
  };
});

vi.mock("@/lib/finalization/textReview", () => ({
  reviewFinalizationText: reviewFinalizationTextMock,
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

vi.mock("@/lib/google/companySpreadsheet", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/google/companySpreadsheet")
  >("@/lib/google/companySpreadsheet");

  return {
    ...actual,
    prepareCompanySpreadsheet: prepareCompanySpreadsheetMock,
  };
});

vi.mock("@/lib/google/sheets", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google/sheets")>(
    "@/lib/google/sheets"
  );

  return {
    ...actual,
    applyFormSheetMutation: applyFormSheetMutationMock,
    applyFormSheetStructureInsertions:
      applyFormSheetStructureInsertionsMock,
    applyFormSheetCellWrites: applyFormSheetCellWritesMock,
    inspectFooterActaWrites: inspectFooterActaWritesMock,
    writeFooterActaMarker: writeFooterActaMarkerMock,
  };
});

vi.mock("@/lib/usuariosRecaServer", () => ({
  upsertUsuariosRecaRows: upsertUsuariosRecaRowsMock,
}));

import { POST } from "@/app/api/formularios/induccion-operativa/route";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/formularios/induccion-operativa", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildValidBody() {
  return {
    empresa: INDUCCION_OPERATIVA_TEST_EMPRESA,
    formData: buildValidInduccionOperativaValues(),
    finalization_identity: {
      draft_id: "draft-operativa-1",
      local_draft_session_id: "session-operativa-1",
    },
  };
}

describe("POST /api/formularios/induccion-operativa", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.GOOGLE_SHEETS_MASTER_ID = "master-sheet-id";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "drive-folder-id";
    process.env.GOOGLE_DRIVE_PDF_FOLDER_ID = "pdf-folder-id";

    getUserMock.mockResolvedValue({
      data: { user: { id: "user-4", email: "aaron@example.com" } },
      error: null,
    });

    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
        getSession: getSessionMock,
      },
      from: fromMock,
    });
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    fromMock.mockReturnValue({
      insert: insertMock,
    });
    insertMock.mockResolvedValue({ error: null });

    withGoogleRetryMock.mockImplementation(
      async (operation: () => Promise<unknown>) => operation()
    );

    createFinalizationProfilerMock.mockReturnValue({
      mark: profilerMarkMock,
      finish: profilerFinishMock,
      fail: profilerFailMock,
      getSteps: vi.fn(() => []),
      getTotalMs: vi.fn(() => 0),
    });
    reviewFinalizationTextMock.mockImplementation(
      async ({ value }: { value: unknown }) => ({
        status: "skipped",
        reason: "missing_access_token",
        value,
      })
    );
    getFinalizationUserIdentityMock.mockResolvedValue({
      usuarioLogin: "aaron_vercel",
      nombreUsuario: "aaron",
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValue({
      kind: "cold",
    });
    persistFinalizationExternalArtifactsMock.mockResolvedValue(undefined);
    applyFormSheetStructureInsertionsMock.mockResolvedValue(undefined);
    applyFormSheetCellWritesMock.mockResolvedValue(undefined);
    inspectFooterActaWritesMock.mockResolvedValue([]);
    writeFooterActaMarkerMock.mockResolvedValue(undefined);

    getOrCreateFolderMock.mockResolvedValue("folder-id");
    exportSheetToPdfMock.mockResolvedValue(Buffer.from("pdf-bytes"));
    uploadPdfMock.mockResolvedValue({
      fileId: "pdf-file-id",
      webViewLink: "https://drive.example/induccion-operativa.pdf",
    });
    uploadJsonArtifactMock.mockResolvedValue({
      fileId: "json-file-id",
      webViewLink: "https://drive.example/induccion-operativa-raw.json",
    });

    prepareCompanySpreadsheetMock.mockResolvedValue({
      spreadsheetId: "spreadsheet-id",
      effectiveMutation: { writes: [] },
      activeSheetName: "7. INDUCCIÓN OPERATIVA",
      activeSheetId: 701,
      sheetLink: "https://sheets.example/induccion-operativa",
      reusedSpreadsheet: true,
    });

    applyFormSheetMutationMock.mockResolvedValue(undefined);
    upsertUsuariosRecaRowsMock.mockResolvedValue(1);
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

  it("returns 409 while an identical finalization is still in progress", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "in_progress",
      stage: "drive.export_pdf",
      retryAfterSeconds: 12,
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).toBe("12");
    await expect(response.json()).resolves.toEqual({
      error:
        "Ya hay una finalizacion en curso para esta acta. Verifica el estado antes de reenviarla.",
      stage: "drive.export_pdf",
      displayStage: "Generando PDF",
      displayMessage: "Estamos trabajando en: Generando PDF.",
      retryAction: "check_status",
      code: "finalization_in_progress",
    });
    expect(withGoogleRetryMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(markFinalizationRequestSucceededMock).not.toHaveBeenCalled();
  });

  it("runs text review with the normalized payload and persists the reviewed text without changing the request hash", async () => {
    const body = buildValidBody();
    const correctedValues = buildValidInduccionOperativaValues({
      section_3: {
        ...body.formData.section_3,
        funciones_corresponden_perfil: {
          ...body.formData.section_3.funciones_corresponden_perfil,
          observaciones: "Observación corregida",
        },
      },
      observaciones_recomendaciones: "Observaciones amplias corregidas",
    });

    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "token-123" } },
      error: null,
    });
    reviewFinalizationTextMock.mockResolvedValue({
      status: "reviewed",
      reason: null,
      value: correctedValues,
    });
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "induccion-operativa",
        user_id: "user-4",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-15T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-15T00:00:00.000Z",
      },
    });

    const response = await POST(buildRequest(body));

    expect(response.status).toBe(200);
    expect(reviewFinalizationTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "induccion-operativa",
        accessToken: "token-123",
        value: expect.objectContaining({
          observaciones_recomendaciones: body.formData.observaciones_recomendaciones,
        }),
      })
    );
    expect(profilerMarkMock).toHaveBeenCalledWith("auth.get_session");
    expect(profilerMarkMock).toHaveBeenCalledWith("text_review.reviewed");
    const prepareSpreadsheetCall = prepareCompanySpreadsheetMock.mock.calls[0]?.[0];
    expect(prepareSpreadsheetCall?.mutation?.writes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "Observaciones amplias corregidas",
        }),
      ])
    );
    expect(beginFinalizationRequestMock.mock.calls[0]?.[0]?.requestHash).toBe(
      buildInduccionOperativaRequestHash(body.formData)
    );
  });

  it("returns the cached response for replayed finalizations", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "replay",
      responsePayload: {
        success: true,
        sheetLink: "https://sheets.example/replayed-operativa",
        pdfLink: "https://drive.example/replayed-operativa.pdf",
      },
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/replayed-operativa",
      pdfLink: "https://drive.example/replayed-operativa.pdf",
    });
    expect(prepareCompanySpreadsheetMock).not.toHaveBeenCalled();
    expect(applyFormSheetStructureInsertionsMock).not.toHaveBeenCalled();
    expect(applyFormSheetCellWritesMock).not.toHaveBeenCalled();
    expect(exportSheetToPdfMock).not.toHaveBeenCalled();
    expect(getOrCreateFolderMock).not.toHaveBeenCalled();
    expect(uploadPdfMock).not.toHaveBeenCalled();
    expect(uploadJsonArtifactMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(upsertUsuariosRecaRowsMock).not.toHaveBeenCalled();
    expect(markFinalizationRequestSucceededMock).not.toHaveBeenCalled();
  });

  it("runs the success flow and persists the finalization artifacts", async () => {
    const body = buildValidBody();
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "induccion-operativa",
        user_id: "user-4",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-15T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-15T00:00:00.000Z",
      },
    });

    const response = await POST(buildRequest(body));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/induccion-operativa",
      pdfLink: "https://drive.example/induccion-operativa.pdf",
    });
    expect(beginFinalizationRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestHash: buildInduccionOperativaRequestHash(body.formData),
      })
    );
    expect(getOrCreateFolderMock).toHaveBeenCalledTimes(3);
    expect(prepareCompanySpreadsheetMock).toHaveBeenCalledOnce();
    expect(prepareCompanySpreadsheetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeSheetName: "7. INDUCCIÓN OPERATIVA",
        mutation: expect.objectContaining({
          footerActaRefs: [
            expect.objectContaining({
              sheetName: "7. INDUCCIÓN OPERATIVA",
              actaRef: expect.stringMatching(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/),
            }),
          ],
          writes: expect.arrayContaining([
            expect.objectContaining({
              range: expect.stringContaining("!A16"),
              value: "1",
            }),
            expect.objectContaining({
              range: expect.stringContaining("!A67"),
              value: "Observaciones amplias",
            }),
          ]),
        }),
      })
    );
    expect(applyFormSheetStructureInsertionsMock).not.toHaveBeenCalled();
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledOnce();
    expect(exportSheetToPdfMock).toHaveBeenCalledOnce();
    expect(getOrCreateFolderMock).toHaveBeenCalledWith(
      "drive-folder-id",
      "ACME SAS"
    );
    expect(uploadPdfMock).toHaveBeenCalledOnce();
    expect(uploadJsonArtifactMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledOnce();
    expect(upsertUsuariosRecaRowsMock).toHaveBeenCalledOnce();
    expect(upsertUsuariosRecaRowsMock).toHaveBeenCalledWith([
      {
        cedula_usuario: "123456",
        nombre_usuario: "Ana Perez",
        telefono_oferente: "3001234567",
        cargo_oferente: "Analista",
        empresa_nit: "900123456",
        empresa_nombre: "ACME SAS",
      },
    ]);
    const insertedRecord = insertMock.mock.calls[0]?.[0];
    expect(insertedRecord).toEqual(
      expect.objectContaining({
        usuario_login: "aaron_vercel",
        acta_ref: expect.stringMatching(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/),
      })
    );
    expect(insertedRecord?.payload_normalized?.metadata?.acta_ref).toBe(
      insertedRecord?.acta_ref
    );
    expect(insertedRecord?.payload_normalized?.metadata?.finalization).toEqual({
      form_slug: "induccion-operativa",
      request_hash: beginFinalizationRequestMock.mock.calls[0]?.[0]?.requestHash,
      idempotency_key:
        beginFinalizationRequestMock.mock.calls[0]?.[0]?.idempotencyKey,
      identity_key: "draft-operativa-1",
    });
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-4",
        stage: "succeeded",
        responsePayload: {
          success: true,
          sheetLink: "https://sheets.example/induccion-operativa",
          pdfLink: "https://drive.example/induccion-operativa.pdf",
        },
      })
    );
    expect(markFinalizationRequestFailedMock).not.toHaveBeenCalled();
    expect(profilerFailMock).not.toHaveBeenCalled();
  });

  it("keeps the success response when usuarios_reca sync fails", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "induccion-operativa",
        user_id: "user-4",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-15T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-15T00:00:00.000Z",
      },
    });
    upsertUsuariosRecaRowsMock.mockRejectedValueOnce(new Error("sync failed"));

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/induccion-operativa",
      pdfLink: "https://drive.example/induccion-operativa.pdf",
    });
    expect(upsertUsuariosRecaRowsMock).toHaveBeenCalledOnce();
    expect(markFinalizationRequestStageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "supabase.sync_usuarios_reca_failed",
      })
    );
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledOnce();
  });

  it("still returns a structured 500 response when marking the request as failed also throws", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "induccion-operativa",
        user_id: "user-4",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-15T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-15T00:00:00.000Z",
      },
    });
    prepareCompanySpreadsheetMock.mockRejectedValueOnce(new Error("google failed"));
    markFinalizationRequestFailedMock.mockRejectedValueOnce(
      new Error("cleanup failed")
    );

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "google failed",
      stage: "prewarm.reuse_or_inline_prepare",
      displayStage: "Creando acta en Google Sheets",
      displayMessage:
        "La publicación falló mientras creando acta en google sheets.",
      retryAction: "submit",
    });
    expect(markFinalizationRequestFailedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "prewarm.reuse_or_inline_prepare",
        errorMessage: "google failed",
      })
    );
  });
});
