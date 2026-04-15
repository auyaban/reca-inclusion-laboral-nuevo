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
  exportSheetToPdfMock,
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
    reviewFinalizationTextMock: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/finalization/requests", () => ({
  FINALIZATION_IN_PROGRESS_CODE: "finalization_in_progress",
  FINALIZATION_PROCESSING_TTL_MS: 90_000,
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
  };
});

import { POST } from "@/app/api/formularios/seleccion/route";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/formularios/seleccion", {
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
  return {
    empresa: buildEmpresa(),
    formData: buildValidSeleccionValues(),
    finalization_identity: {
      draft_id: "draft-seleccion-1",
      local_draft_session_id: "session-seleccion-1",
    },
  };
}

describe("POST /api/formularios/seleccion", () => {
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

    withGoogleRetryMock.mockImplementation(async (operation: () => Promise<unknown>) =>
      operation()
    );

    createFinalizationProfilerMock.mockReturnValue({
      mark: profilerMarkMock,
      finish: profilerFinishMock,
      fail: profilerFailMock,
    });

    reviewFinalizationTextMock.mockImplementation(
      async ({ value }: { value: unknown }) => ({
        status: "reviewed",
        value,
        reason: "ok",
        reviewedCount: 3,
      })
    );

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

    prepareCompanySpreadsheetMock.mockResolvedValue({
      spreadsheetId: "spreadsheet-id",
      effectiveMutation: { writes: [] },
      activeSheetName: "4. SELECCIÓN INCLUYENTE",
      sheetLink: "https://sheets.example/seleccion",
      reusedSpreadsheet: true,
    });

    applyFormSheetMutationMock.mockResolvedValue(undefined);
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

  it("returns 200 replaying the cached response when the request already succeeded", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "replay",
      responsePayload: {
        success: true,
        sheetLink: "https://sheets.example/cached-seleccion",
        pdfLink: "https://drive.example/cached-seleccion.pdf",
      },
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/cached-seleccion",
      pdfLink: "https://drive.example/cached-seleccion.pdf",
    });
    expect(withGoogleRetryMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(markFinalizationRequestSucceededMock).not.toHaveBeenCalled();
  });

  it("returns 500 when Google env vars are missing", async () => {
    delete process.env.GOOGLE_DRIVE_PDF_FOLDER_ID;
    delete process.env.GOOGLE_DRIVE_FOLDER_ID;

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Faltan variables de entorno de Google Drive o Sheets",
    });
    expect(beginFinalizationRequestMock).not.toHaveBeenCalled();
    expect(withGoogleRetryMock).not.toHaveBeenCalled();
  });

  it("runs the success flow and persists sheet, pdf and raw payload metadata", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "seleccion",
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

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/seleccion",
      pdfLink: "https://drive.example/seleccion.pdf",
    });
    expect(reviewFinalizationTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "seleccion",
      })
    );
    expect(withGoogleRetryMock).toHaveBeenCalledTimes(6);
    expect(getOrCreateFolderMock).toHaveBeenCalledTimes(3);
    expect(prepareCompanySpreadsheetMock).toHaveBeenCalledOnce();
    expect(prepareCompanySpreadsheetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeSheetName: "4. SELECCIÓN INCLUYENTE",
        mutation: expect.objectContaining({
          writes: expect.arrayContaining([
            expect.objectContaining({
              range: expect.stringContaining("!A14"),
              value: "Actividad compartida",
            }),
            expect.objectContaining({
              range: expect.stringContaining("!A79"),
              value: "Nota: Nota final",
            }),
          ]),
        }),
      })
    );
    expect(applyFormSheetMutationMock).toHaveBeenCalledOnce();
    expect(exportSheetToPdfMock).toHaveBeenCalledOnce();
    expect(uploadPdfMock).toHaveBeenCalledOnce();
    expect(uploadJsonArtifactMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledOnce();
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-4",
        stage: "succeeded",
        responsePayload: {
          success: true,
          sheetLink: "https://sheets.example/seleccion",
          pdfLink: "https://drive.example/seleccion.pdf",
        },
      })
    );
    expect(markFinalizationRequestFailedMock).not.toHaveBeenCalled();
    expect(profilerFailMock).not.toHaveBeenCalled();
  });
});
