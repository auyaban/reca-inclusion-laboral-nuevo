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
  withGoogleRetryMock,
  createFinalizationProfilerMock,
  profilerMarkMock,
  profilerFinishMock,
  profilerFailMock,
  getOrCreateFolderMock,
  uploadJsonArtifactMock,
  prepareCompanySpreadsheetMock,
  applyFormSheetMutationMock,
  uploadPdfMock,
  getFinalizationUserIdentityMock,
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
    withGoogleRetryMock: vi.fn(),
    createFinalizationProfilerMock: vi.fn(),
    profilerMarkMock,
    profilerFinishMock,
    profilerFailMock,
    getOrCreateFolderMock: vi.fn(),
    uploadJsonArtifactMock: vi.fn(),
    prepareCompanySpreadsheetMock: vi.fn(),
    applyFormSheetMutationMock: vi.fn(),
    uploadPdfMock: vi.fn(),
    getFinalizationUserIdentityMock: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/finalization/requests", () => ({
  FINALIZATION_IN_PROGRESS_CODE: "finalization_in_progress",
  FINALIZATION_PROCESSING_TTL_MS: 360_000,
  beginFinalizationRequest: beginFinalizationRequestMock,
  markFinalizationRequestStage: markFinalizationRequestStageMock,
  markFinalizationRequestSucceeded: markFinalizationRequestSucceededMock,
  markFinalizationRequestFailed: markFinalizationRequestFailedMock,
}));

vi.mock("@/lib/finalization/googleRetry", () => ({
  withGoogleRetry: withGoogleRetryMock,
}));

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
    uploadJsonArtifact: uploadJsonArtifactMock,
    uploadPdf: uploadPdfMock,
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
  };
});

import { POST } from "@/app/api/formularios/sensibilizacion/route";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/formularios/sensibilizacion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildValidBody() {
  return {
    fecha_visita: "2026-04-14",
    modalidad: "Presencial",
    nit_empresa: "900123456",
    observaciones: "Observaciones de la sensibilización.",
    asistentes: [
      { nombre: "Ana Pérez", cargo: "Profesional" },
      { nombre: "Carlos Ruiz", cargo: "Asesor" },
    ],
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
      draft_id: "draft-2",
      local_draft_session_id: "session-2",
    },
  };
}

describe("POST /api/formularios/sensibilizacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.GOOGLE_SHEETS_MASTER_ID = "master-sheet-id";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "drive-folder-id";

    getUserMock.mockResolvedValue({
      data: { user: { id: "user-2", email: "aaron@example.com" } },
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

    withGoogleRetryMock.mockImplementation(async (operation: () => Promise<unknown>) =>
      operation()
    );

    createFinalizationProfilerMock.mockReturnValue({
      mark: profilerMarkMock,
      finish: profilerFinishMock,
      fail: profilerFailMock,
    });
    getFinalizationUserIdentityMock.mockResolvedValue({
      usuarioLogin: "aaron_vercel",
      nombreUsuario: "aaron",
    });

    getOrCreateFolderMock.mockResolvedValue("folder-id");
    uploadJsonArtifactMock.mockResolvedValue({
      fileId: "json-file-id",
      webViewLink: "https://drive.example/raw.json",
    });
    uploadPdfMock.mockResolvedValue({
      fileId: "pdf-file-id",
      webViewLink: "https://drive.example/pdf",
    });

    prepareCompanySpreadsheetMock.mockResolvedValue({
      spreadsheetId: "spreadsheet-id",
      effectiveMutation: { writes: [] },
      activeSheetName: "8. SENSIBILIZACIÓN",
      sheetLink: "https://sheets.example/spreadsheet-id",
      reusedSpreadsheet: true,
    });

    applyFormSheetMutationMock.mockResolvedValue(undefined);
  });

  it("returns 200 replaying the cached response when the request already succeeded", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "replay",
      responsePayload: {
        success: true,
        sheetLink: "https://sheets.example/cached",
      },
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/cached",
    });
    expect(withGoogleRetryMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(markFinalizationRequestSucceededMock).not.toHaveBeenCalled();
  });

  it("returns 409 while a matching finalization is still processing", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "in_progress",
      stage: "drive.export_pdf",
      retryAfterSeconds: 9,
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).toBe("9");
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

  it("runs the success flow without PDF upload and persists the finalization", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "sensibilizacion",
        user_id: "user-2",
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
    });
    expect(withGoogleRetryMock).toHaveBeenCalledTimes(4);
    expect(getOrCreateFolderMock).toHaveBeenCalledTimes(2);
    expect(prepareCompanySpreadsheetMock).toHaveBeenCalledOnce();
    expect(prepareCompanySpreadsheetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          footerActaRefs: [
            expect.objectContaining({
              sheetName: "8. SENSIBILIZACIÓN",
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
    expect(applyFormSheetMutationMock).toHaveBeenCalledOnce();
    expect(uploadJsonArtifactMock).toHaveBeenCalledOnce();
    expect(uploadPdfMock).not.toHaveBeenCalled();
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
      form_slug: "sensibilizacion",
      request_hash: beginFinalizationRequestMock.mock.calls[0]?.[0]?.requestHash,
      idempotency_key:
        beginFinalizationRequestMock.mock.calls[0]?.[0]?.idempotencyKey,
      identity_key: "draft-2",
    });
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        stage: "succeeded",
        responsePayload: {
          success: true,
          sheetLink: "https://sheets.example/spreadsheet-id",
        },
      })
    );
    expect(markFinalizationRequestFailedMock).not.toHaveBeenCalled();
    expect(profilerFailMock).not.toHaveBeenCalled();
  });
});
