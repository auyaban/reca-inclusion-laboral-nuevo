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
  getOrCreateFolderMock,
  exportSheetToPdfMock,
  uploadPdfMock,
  uploadJsonArtifactMock,
  prepareFinalizationSpreadsheetPipelineMock,
  applyFormSheetMutationMock,
  getFinalizationUserIdentityMock,
  recoverPersistedFinalizationResponseMock,
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
    getOrCreateFolderMock: vi.fn(),
    exportSheetToPdfMock: vi.fn(),
    uploadPdfMock: vi.fn(),
    uploadJsonArtifactMock: vi.fn(),
    prepareFinalizationSpreadsheetPipelineMock: vi.fn(),
    applyFormSheetMutationMock: vi.fn(),
    getFinalizationUserIdentityMock: vi.fn(),
    recoverPersistedFinalizationResponseMock: vi.fn(),
    sealAfterPersistenceMock,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/finalization/requests", () => ({
  FINALIZATION_IN_PROGRESS_CODE: "finalization_in_progress",
  beginFinalizationRequest: beginFinalizationRequestMock,
  markFinalizationRequestStage: markFinalizationRequestStageMock,
}));

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
    applyFormSheetMutation: applyFormSheetMutationMock,
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
  const empresa = buildEmpresa();

  return {
    empresa,
    formData: normalizeInterpreteLscValues(
      {
        fecha_visita: "2026-04-21",
        modalidad_interprete: "Presencial",
        modalidad_profesional_reca: "Virtual",
        nit_empresa: "900123456",
        oferentes: [
          {
            nombre_oferente: "Ana Perez",
            cedula: "123",
            proceso: "Ruta inclusion",
          },
        ],
        interpretes: [
          {
            nombre: "Luisa Gomez",
            hora_inicial: "9",
            hora_final: "11:30",
          },
        ],
        sabana: { activo: true, horas: 2 },
        asistentes: [
          { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
          { nombre: "Laura Gomez", cargo: "Gerente" },
        ],
      },
      empresa as never
    ),
    finalization_identity: {
      draft_id: "draft-interprete-lsc-1",
      local_draft_session_id: "session-interprete-lsc-1",
    },
  };
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

    applyFormSheetMutationMock.mockResolvedValue(undefined);
    recoverPersistedFinalizationResponseMock.mockResolvedValue(null);
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
    expect(applyFormSheetMutationMock).toHaveBeenCalledOnce();
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
