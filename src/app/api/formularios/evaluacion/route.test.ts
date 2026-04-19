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
  withGoogleRetryMock,
  createFinalizationProfilerMock,
  profilerMarkMock,
  profilerFinishMock,
  profilerFailMock,
  getOrCreateFolderMock,
  uploadJsonArtifactMock,
  prepareCompanySpreadsheetMock,
  applyFormSheetMutationMock,
  getFinalizationUserIdentityMock,
  reviewFinalizationTextMock,
  extractTextReviewTargetsMock,
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
    uploadJsonArtifactMock: vi.fn(),
    prepareCompanySpreadsheetMock: vi.fn(),
    applyFormSheetMutationMock: vi.fn(),
    getFinalizationUserIdentityMock: vi.fn(),
    reviewFinalizationTextMock: vi.fn(),
    extractTextReviewTargetsMock: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/finalization/requests", () => ({
  FINALIZATION_IN_PROGRESS_CODE: "finalization_in_progress",
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

vi.mock("@/lib/finalization/textReview", () => ({
  reviewFinalizationText: reviewFinalizationTextMock,
  extractTextReviewTargets: extractTextReviewTargetsMock,
}));

vi.mock("@/lib/google/drive", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google/drive")>(
    "@/lib/google/drive"
  );

  return {
    ...actual,
    getOrCreateFolder: getOrCreateFolderMock,
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

import { POST } from "@/app/api/formularios/evaluacion/route";
import {
  createEmptyEvaluacionValues,
  deriveEvaluacionSection4Description,
  deriveEvaluacionSection5ItemValue,
} from "@/lib/evaluacion";
import {
  EVALUACION_QUESTION_DESCRIPTORS,
  EVALUACION_SECTION_5_ITEMS,
} from "@/lib/evaluacionSections";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/formularios/evaluacion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createEmpresa() {
  return {
    id: "empresa-1",
    nombre_empresa: "ACME SAS",
    nit_empresa: "900123456",
    direccion_empresa: "Calle 1 # 2-3",
    ciudad_empresa: "Bogota",
    sede_empresa: "Principal",
    zona_empresa: null,
    correo_1: "contacto@acme.com",
    contacto_empresa: "Laura Gomez",
    telefono_empresa: "3000000000",
    cargo: "Gerente",
    profesional_asignado: "Marta Ruiz",
    correo_profesional: "marta@reca.com",
    asesor: "Carlos Ruiz",
    correo_asesor: "carlos@acme.com",
    caja_compensacion: "Compensar",
  };
}

function buildValidBody() {
  const empresa = createEmpresa();
  const formData = createEmptyEvaluacionValues(empresa);

  EVALUACION_QUESTION_DESCRIPTORS.forEach((question) => {
    question.fields.forEach((field) => {
      formData[question.sectionId][question.id][field.key] =
        field.options[0] ?? `Texto ${question.id} ${field.key}`;
    });
  });

  formData.section_4.nivel_accesibilidad = "Alto";
  formData.section_4.descripcion = deriveEvaluacionSection4Description("Alto");

  EVALUACION_SECTION_5_ITEMS.forEach((item) => {
    formData.section_5[item.id] = deriveEvaluacionSection5ItemValue(
      item.id,
      "Aplica"
    );
  });

  formData.observaciones_generales = "Observaciones generales.";
  formData.cargos_compatibles = "Analista de soporte.";
  formData.asistentes[0].cargo = "Profesional RECA";
  formData.asistentes[1] = {
    nombre: "Laura Gomez",
    cargo: "Talento humano",
  };
  formData.asistentes[2] = {
    nombre: "Carlos Ruiz",
    cargo: "Asesor Agencia",
  };

  return {
    empresa,
    formData,
    finalization_identity: {
      draft_id: "draft-2",
      local_draft_session_id: "session-2",
    },
  };
}

describe("POST /api/formularios/evaluacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_SHEETS_MASTER_ID = "master-sheet-id";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "drive-folder-id";

    getUserMock.mockResolvedValue({
      data: { user: { id: "user-2", email: "aaron@example.com" } },
      error: null,
    });
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "token-demo" } },
      error: null,
    });
    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
        getSession: getSessionMock,
      },
      from: fromMock,
    });
    fromMock.mockReturnValue({ insert: insertMock });
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
    reviewFinalizationTextMock.mockImplementation(async ({ value }) => ({
      status: "reviewed",
      reason: null,
      reviewedCount: 3,
      usage: { model: "gpt-4.1-mini" },
      value,
    }));
    extractTextReviewTargetsMock.mockReturnValue([
      { path: ["cargos_compatibles"], text: "Analista de soporte." },
    ]);
    getOrCreateFolderMock.mockResolvedValue("folder-id");
    uploadJsonArtifactMock.mockResolvedValue({
      fileId: "json-file-id",
      webViewLink: "https://drive.example/raw.json",
    });
    prepareCompanySpreadsheetMock.mockResolvedValue({
      spreadsheetId: "spreadsheet-id",
      effectiveMutation: { writes: [] },
      activeSheetName: "2. EVALUACION DE ACCESIBILIDAD",
      sheetLink: "https://sheets.example/spreadsheet-id",
      reusedSpreadsheet: true,
    });
    applyFormSheetMutationMock.mockResolvedValue(undefined);
  });

  it("publishes successfully without PDF and keeps the auxiliary photos sheet visible", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "evaluacion",
        user_id: "user-2",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-17T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-17T00:00:00.000Z",
      },
    });

    const response = await POST(buildRequest(buildValidBody()));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      sheetLink: "https://sheets.example/spreadsheet-id",
    });
    expect("pdfLink" in payload).toBe(false);
    expect(reviewFinalizationTextMock).toHaveBeenCalledOnce();
    expect(prepareCompanySpreadsheetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeSheetName: "2. EVALUACIÓN DE ACCESIBILIDAD",
        extraVisibleSheetNames: ["2.1 EVALUACION FOTOS"],
      })
    );
    expect(applyFormSheetMutationMock).toHaveBeenCalledOnce();
    expect(uploadJsonArtifactMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledOnce();
    const insertedRecord = insertMock.mock.calls[0]?.[0];
    expect(insertedRecord?.payload_normalized?.metadata?.finalization?.form_slug).toBe(
      "evaluacion"
    );
    expect(insertedRecord?.payload_normalized?.parsed_raw?.sheet_link).toBe(
      "https://sheets.example/spreadsheet-id"
    );
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
  });

  it("skips session lookup and text review when there is no reviewable text", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "evaluacion",
        user_id: "user-2",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-17T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-17T00:00:00.000Z",
      },
    });
    extractTextReviewTargetsMock.mockReturnValue([]);

    const response = await POST(buildRequest(buildValidBody()));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      sheetLink: "https://sheets.example/spreadsheet-id",
    });
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(reviewFinalizationTextMock).not.toHaveBeenCalled();
  });

  it("fails explicitly when the auxiliary photos sheet cannot be resolved", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "evaluacion",
        user_id: "user-2",
        status: "processing",
        stage: "request.validated",
        request_hash: "hash",
        response_payload: null,
        last_error: null,
        started_at: "2026-04-17T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-17T00:00:00.000Z",
      },
    });
    prepareCompanySpreadsheetMock.mockRejectedValue(
      new Error('No existe la hoja "2.1 EVALUACION FOTOS" en el archivo maestro.')
    );

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: 'No existe la hoja "2.1 EVALUACION FOTOS" en el archivo maestro.',
      })
    );
  });
});
