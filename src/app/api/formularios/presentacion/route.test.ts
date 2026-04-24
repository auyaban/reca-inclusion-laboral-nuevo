import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  getUserMock,
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
  prepareDraftSpreadsheetMock,
  applyFormSheetMutationMock,
  applyFormSheetStructureInsertionsMock,
  applyFormSheetCellWritesMock,
  inspectFooterActaWritesMock,
  writeFooterActaMarkerMock,
  exportSheetToPdfMock,
  getFinalizationUserIdentityMock,
  resolveFinalizationRecoveryDecisionMock,
  recoverPersistedFinalizationResponseMock,
} = vi.hoisted(() => {
  const profilerMarkMock = vi.fn();
  const profilerFinishMock = vi.fn();
  const profilerFailMock = vi.fn();

  return {
    createClientMock: vi.fn(),
    getUserMock: vi.fn(),
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
    prepareDraftSpreadsheetMock: vi.fn(),
    applyFormSheetMutationMock: vi.fn(),
    applyFormSheetStructureInsertionsMock: vi.fn(),
    applyFormSheetCellWritesMock: vi.fn(),
    inspectFooterActaWritesMock: vi.fn(),
    writeFooterActaMarkerMock: vi.fn(),
    getFinalizationUserIdentityMock: vi.fn(),
    resolveFinalizationRecoveryDecisionMock: vi.fn(),
    recoverPersistedFinalizationResponseMock: vi.fn(),
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
    recoverPersistedFinalizationResponse: recoverPersistedFinalizationResponseMock,
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

vi.mock("@/lib/google/companySpreadsheet", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/google/companySpreadsheet")
  >("@/lib/google/companySpreadsheet");

  return {
    ...actual,
    prepareCompanySpreadsheet: prepareCompanySpreadsheetMock,
  };
});

vi.mock("@/lib/google/draftSpreadsheet", () => ({
  prepareDraftSpreadsheet: prepareDraftSpreadsheetMock,
}));

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

import { POST, maxDuration } from "@/app/api/formularios/presentacion/route";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/formularios/presentacion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildValidBody() {
  return {
    tipo_visita: "Presentación",
    fecha_visita: "2026-04-14",
    modalidad: "Presencial",
    nit_empresa: "900123456",
    motivacion: ["Responsabilidad Social Empresarial"],
    acuerdos_observaciones: "Acuerdos y observaciones.",
    asistentes: [{ nombre: "Ana Pérez", cargo: "Profesional" }],
    empresa: {
      id: "empresa-1",
      nombre_empresa: "ACME SAS",
      nit_empresa: "900123456",
      direccion_empresa: "Calle 1 # 2-3",
      ciudad_empresa: "Bogotá",
      sede_empresa: "Principal",
      zona_empresa: "Zona Norte",
      correo_1: "contacto@acme.com",
      contacto_empresa: "Laura Gómez",
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
  };
}

describe("POST /api/formularios/presentacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.GOOGLE_SHEETS_MASTER_ID = "master-sheet-id";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "drive-folder-id";
    process.env.GOOGLE_DRIVE_PDF_FOLDER_ID = "pdf-folder-id";
    process.env.NEXT_PUBLIC_RECA_PREWARM_ENABLED = "false";

    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "aaron@example.com" } },
      error: null,
    });

    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
      },
      from: fromMock,
      rpc: vi.fn(),
    });

    fromMock.mockReturnValue({
      insert: insertMock,
    });
    insertMock.mockResolvedValue({ error: null });

    withGoogleRetryMock.mockImplementation(async (operation: () => Promise<unknown>) =>
      operation()
    );

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
    resolveFinalizationRecoveryDecisionMock.mockResolvedValue({
      kind: "cold",
    });
    recoverPersistedFinalizationResponseMock.mockResolvedValue(null);
    persistFinalizationExternalArtifactsMock.mockResolvedValue(undefined);
    applyFormSheetStructureInsertionsMock.mockResolvedValue(undefined);
    applyFormSheetCellWritesMock.mockResolvedValue(undefined);
    inspectFooterActaWritesMock.mockResolvedValue([]);
    writeFooterActaMarkerMock.mockResolvedValue(undefined);

    getOrCreateFolderMock.mockResolvedValue("folder-id");
    exportSheetToPdfMock.mockResolvedValue(Buffer.from("pdf-bytes"));
    uploadPdfMock.mockResolvedValue({
      fileId: "pdf-file-id",
      webViewLink: "https://drive.example/pdf",
    });
    uploadJsonArtifactMock.mockResolvedValue({
      fileId: "json-file-id",
      webViewLink: "https://drive.example/raw.json",
    });

    prepareCompanySpreadsheetMock.mockResolvedValue({
      spreadsheetId: "spreadsheet-id",
      effectiveMutation: { writes: [] },
      activeSheetName: "1. PRESENTACIÓN DEL PROGRAMA IL",
      activeSheetId: 101,
      sheetLink: "https://sheets.example/spreadsheet-id",
      reusedSpreadsheet: false,
    });

    applyFormSheetMutationMock.mockResolvedValue(undefined);
  });

  it("exports a shared maxDuration of 60 seconds", () => {
    expect(maxDuration).toBe(60);
  });

  it("returns 200 replaying the cached response when the request already succeeded", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "replay",
      responsePayload: {
        success: true,
        sheetLink: "https://sheets.example/cached",
        pdfLink: "https://drive.example/cached.pdf",
      },
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/cached",
      pdfLink: "https://drive.example/cached.pdf",
    });
    expect(withGoogleRetryMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(markFinalizationRequestSucceededMock).not.toHaveBeenCalled();
  });

  it("returns 409 while a matching finalization is still processing", async () => {
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

  it("returns 409 when claim coordination is temporarily exhausted", async () => {
    beginFinalizationRequestMock.mockRejectedValue(
      Object.assign(new Error("conflict"), {
        code: "finalization_claim_exhausted",
      })
    );

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).toBe("5");
    await expect(response.json()).resolves.toEqual({
      error:
        "Conflicto temporal de coordinacion. Verifica el estado antes de reenviarla.",
      stage: "request.validated",
      displayStage: "Preparando publicación",
      displayMessage: "Estamos trabajando en: Preparando publicación.",
      retryAction: "check_status",
      code: "finalization_claim_exhausted",
    });
    expect(withGoogleRetryMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("runs the success flow and uses the Google helpers behind retry wrappers", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "presentacion",
        user_id: "user-1",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-14T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-14T00:00:00.000Z",
      },
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/spreadsheet-id",
      pdfLink: "https://drive.example/pdf",
    });
    expect(withGoogleRetryMock).toHaveBeenCalledTimes(8);
    expect(getOrCreateFolderMock).toHaveBeenCalledTimes(3);
    expect(prepareCompanySpreadsheetMock).toHaveBeenCalledOnce();
    expect(prepareCompanySpreadsheetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          footerActaRefs: [
            expect.objectContaining({
              sheetName: "1. PRESENTACIÓN DEL PROGRAMA IL",
              actaRef: expect.stringMatching(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/),
            }),
          ],
          writes: expect.arrayContaining([
            expect.objectContaining({
              value: "Zona Norte",
            }),
          ]),
        }),
      }),
    );
    expect(applyFormSheetStructureInsertionsMock).not.toHaveBeenCalled();
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledOnce();
    expect(uploadPdfMock).toHaveBeenCalledOnce();
    expect(uploadJsonArtifactMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledOnce();
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
      form_slug: "presentacion",
      request_hash: beginFinalizationRequestMock.mock.calls[0]?.[0]?.requestHash,
      idempotency_key:
        beginFinalizationRequestMock.mock.calls[0]?.[0]?.idempotencyKey,
      identity_key: "draft-1",
    });
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        stage: "succeeded",
        responsePayload: {
          success: true,
          sheetLink: "https://sheets.example/spreadsheet-id",
          pdfLink: "https://drive.example/pdf",
        },
      })
    );
    expect(markFinalizationRequestFailedMock).not.toHaveBeenCalled();
    expect(profilerFailMock).not.toHaveBeenCalled();
  });

  it("still returns success when marking the request as succeeded fails after persistence", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "presentacion",
        user_id: "user-1",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-14T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-14T00:00:00.000Z",
      },
    });
    markFinalizationRequestSucceededMock.mockRejectedValueOnce(
      new Error("mark succeeded failed")
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await POST(buildRequest(buildValidBody()));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        success: true,
        sheetLink: "https://sheets.example/spreadsheet-id",
        pdfLink: "https://drive.example/pdf",
      });
      expect(insertMock).toHaveBeenCalledOnce();
      expect(markFinalizationRequestFailedMock).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        "[presentacion.finalization_request] failed_to_mark_succeeded",
        expect.objectContaining({
          stage: "succeeded",
          idempotencyKey: expect.any(String),
          userId: "user-1",
        })
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("recovers success from persisted state when the post-persistence confirmation stage fails", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "presentacion",
        user_id: "user-1",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-14T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-14T00:00:00.000Z",
      },
    });
    markFinalizationRequestStageMock.mockImplementation(async ({ stage }) => {
      if (stage === "confirming.persisted_record_written") {
        throw new Error("stage update failed");
      }
    });
    recoverPersistedFinalizationResponseMock.mockResolvedValueOnce({
      success: true,
      sheetLink: "https://sheets.example/recovered",
      pdfLink: "https://drive.example/recovered.pdf",
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/recovered",
      pdfLink: "https://drive.example/recovered.pdf",
    });
    expect(insertMock).toHaveBeenCalledOnce();
    expect(recoverPersistedFinalizationResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "presentacion",
        userId: "user-1",
      })
    );
    expect(markFinalizationRequestFailedMock).not.toHaveBeenCalled();
  });

  it("returns 503 and skips persistence when the legacy fallback is blocked by the remaining budget", async () => {
    process.env.NEXT_PUBLIC_RECA_PREWARM_ENABLED = "true";
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "presentacion",
        user_id: "user-1",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-14T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-14T00:00:00.000Z",
      },
    });
    prepareDraftSpreadsheetMock.mockResolvedValue({
      kind: "busy",
      prewarmStatus: "busy",
      prewarmReused: false,
      prewarmStructureSignature:
        '{"asistentesCount":1,"variantKey":"presentacion"}',
      timing: {
        requestId: "req-1",
        startedAt: "2026-04-20T00:00:00.000Z",
        totalMs: 36_000,
        steps: [],
      },
      leaseOwner: "req-2",
      leaseExpiresAt: "2026-04-20T00:00:15.000Z",
      summary: {
        folderId: "folder-id",
        spreadsheetId: "sheet-busy",
        bundleKey: "presentacion",
        structureSignature:
          '{"asistentesCount":1,"variantKey":"presentacion"}',
        activeSheetName: "1. PRESENTACIÓN DEL PROGRAMA IL",
        updatedAt: "2026-04-20T00:00:10.000Z",
      },
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error:
        "No hay tiempo suficiente para continuar con la preparacion de Google dentro del presupuesto de la solicitud.",
      stage: "prewarm.reuse_or_inline_prepare",
      displayStage: "Creando acta en Google Sheets",
      displayMessage:
        "La publicación falló mientras creando acta en google sheets.",
      retryAction: "submit",
    });
    expect(insertMock).not.toHaveBeenCalled();
    expect(prepareCompanySpreadsheetMock).not.toHaveBeenCalled();
    expect(markFinalizationRequestFailedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prewarmStatus: "inline_skipped_low_budget",
      })
    );
  });
});
