import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeCondicionesVacanteValues } from "@/lib/condicionesVacante";
import {
  CONDICIONES_VACANTE_CHECKBOX_FIELDS,
  CONDICIONES_VACANTE_OPTION_FIELDS,
  CONDICIONES_VACANTE_TEXT_FIELDS,
} from "@/lib/validations/condicionesVacante";

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
  applyFormSheetMutationMock,
  applyFormSheetStructureInsertionsMock,
  applyFormSheetCellWritesMock,
  inspectFooterActaWritesMock,
  writeFooterActaMarkerMock,
  exportSheetToPdfMock,
  reviewFinalizationTextMock,
  getFinalizationUserIdentityMock,
  getCondicionesVacanteCatalogsMock,
  resolveFinalizationRecoveryDecisionMock,
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
    applyFormSheetMutationMock: vi.fn(),
    applyFormSheetStructureInsertionsMock: vi.fn(),
    applyFormSheetCellWritesMock: vi.fn(),
    inspectFooterActaWritesMock: vi.fn(),
    writeFooterActaMarkerMock: vi.fn(),
    reviewFinalizationTextMock: vi.fn(),
    getFinalizationUserIdentityMock: vi.fn(),
    getCondicionesVacanteCatalogsMock: vi.fn(),
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

vi.mock("@/lib/finalization/textReview", () => ({
  reviewFinalizationText: reviewFinalizationTextMock,
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

vi.mock("@/lib/condicionesVacanteCatalogs", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/condicionesVacanteCatalogs")
  >("@/lib/condicionesVacanteCatalogs");

  return {
    ...actual,
    getCondicionesVacanteCatalogs: getCondicionesVacanteCatalogsMock,
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

import { POST } from "@/app/api/formularios/condiciones-vacante/route";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/formularios/condiciones-vacante", {
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
    ciudad_empresa: "Bogotá",
    sede_empresa: "Principal",
    zona_empresa: null,
    correo_1: "contacto@acme.com",
    contacto_empresa: "Laura Gómez",
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
  const formData = normalizeCondicionesVacanteValues({}, empresa as never) as Record<
    string,
    unknown
  >;

  for (const fieldId of CONDICIONES_VACANTE_TEXT_FIELDS) {
    formData[fieldId] =
      fieldId === "nit_empresa" ? empresa.nit_empresa : `${fieldId}-value`;
  }

  for (const [fieldId, options] of Object.entries(
    CONDICIONES_VACANTE_OPTION_FIELDS
  )) {
    formData[fieldId] = options[0];
  }

  for (const fieldId of CONDICIONES_VACANTE_CHECKBOX_FIELDS) {
    formData[fieldId] = false;
  }

  formData.nivel_primaria = true;
  formData.discapacidades = [{ discapacidad: "Visual", descripcion: "A" }];
  formData.asistentes = [
    { nombre: "Ana Perez", cargo: "Profesional" },
    { nombre: "Luis Gomez", cargo: "Asesor" },
  ];

  return {
    empresa,
    formData,
    finalization_identity: {
      draft_id: "draft-1",
      local_draft_session_id: "session-1",
    },
  };
}

describe("POST /api/formularios/condiciones-vacante", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.GOOGLE_SHEETS_MASTER_ID = "master-sheet-id";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "drive-folder-id";
    process.env.GOOGLE_DRIVE_PDF_FOLDER_ID = "pdf-folder-id";

    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "aaron@example.com" } },
      error: null,
    });

    createClientMock.mockResolvedValue({
      auth: {
        getUser: getUserMock,
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "token-1" } },
          error: null,
        }),
      },
      from: fromMock,
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

    reviewFinalizationTextMock.mockResolvedValue({
      status: "skipped",
      reason: "no-op",
      reviewedCount: 0,
      usage: undefined,
      value: buildValidBody().formData,
    });
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
    getCondicionesVacanteCatalogsMock.mockResolvedValue({
      disabilityDescriptions: {
        visual: "Descripcion derivada desde catalogo.",
      },
      disabilityOptions: ["Visual"],
    });

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
      activeSheetName: "8. CONDICIONES DE LA VACANTE",
      activeSheetId: 301,
      sheetLink: "https://sheets.example/spreadsheet-id",
      reusedSpreadsheet: false,
    });

    applyFormSheetMutationMock.mockResolvedValue(undefined);
  });

  it("returns 200 on the happy path and persists the finalization once", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "condiciones-vacante",
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
    const json = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(json).toEqual(
      expect.objectContaining({
        success: true,
        sheetLink: "https://sheets.example/spreadsheet-id",
        pdfLink: "https://drive.example/pdf",
      })
    );
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(prepareCompanySpreadsheetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          footerActaRefs: [
            expect.objectContaining({
              sheetName: "3. REVISIÓN DE LAS CONDICIONES DE LA VACANTE",
              actaRef: expect.stringMatching(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/),
            }),
          ],
        }),
      })
    );
    const mutationWrites = prepareCompanySpreadsheetMock.mock.calls[0]?.[0]?.mutation
      ?.writes as Array<{ range: string; value: unknown }>;
    expect(mutationWrites).toEqual(
      expect.arrayContaining([
        {
          range:
            "'3. REVISIÓN DE LAS CONDICIONES DE LA VACANTE'!A150",
          value: "Visual",
        },
        {
          range:
            "'3. REVISIÓN DE LAS CONDICIONES DE LA VACANTE'!G150",
          value: "Descripcion derivada desde catalogo.",
        },
      ])
    );
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
      form_slug: "condiciones-vacante",
      request_hash: beginFinalizationRequestMock.mock.calls[0]?.[0]?.requestHash,
      idempotency_key:
        beginFinalizationRequestMock.mock.calls[0]?.[0]?.idempotencyKey,
      identity_key: "draft-1",
    });
    expect(uploadJsonArtifactMock.mock.calls[0]?.[0]?.cache_snapshot?.section_6).toEqual([
      {
        discapacidad: "Visual",
        descripcion: "Descripcion derivada desde catalogo.",
      },
    ]);
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledTimes(1);
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        stage: "succeeded",
        responsePayload: expect.objectContaining({
          success: true,
          sheetLink: "https://sheets.example/spreadsheet-id",
          pdfLink: "https://drive.example/pdf",
        }),
      })
    );
    expect(profilerFinishMock).toHaveBeenCalledTimes(1);
    expect(profilerFinishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        textReviewStatus: "skipped",
      })
    );
  });

  it("returns 400 when the payload does not parse", async () => {
    const response = await POST(
      buildRequest({
        empresa: buildEmpresa(),
        formData: {},
      })
    );
    const json = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(json).toEqual(expect.objectContaining({ error: expect.any(String) }));
    expect(createClientMock).not.toHaveBeenCalled();
    expect(beginFinalizationRequestMock).not.toHaveBeenCalled();
    expect(reviewFinalizationTextMock).not.toHaveBeenCalled();
  });

  it("returns the cached payload on replay without re-running the pipeline", async () => {
    const responsePayload = {
      success: true,
      sheetLink: "https://sheets.example/cached",
      pdfLink: "https://drive.example/cached-pdf",
    };

    beginFinalizationRequestMock.mockResolvedValue({
      kind: "replay",
      responsePayload,
    });

    const response = await POST(buildRequest(buildValidBody()));
    const json = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(json).toEqual(responsePayload);
    expect(insertMock).not.toHaveBeenCalled();
    expect(markFinalizationRequestSucceededMock).not.toHaveBeenCalled();
    expect(getOrCreateFolderMock).not.toHaveBeenCalled();
    expect(uploadPdfMock).not.toHaveBeenCalled();
    expect(profilerFinishMock).not.toHaveBeenCalled();
  });

  it("returns 409 while an identical finalization is still in progress", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "in_progress",
      stage: "drive.export_pdf",
      retryAfterSeconds: 17,
    });

    const response = await POST(buildRequest(buildValidBody()));
    const json = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).toBe("17");
    expect(json).toEqual(
      expect.objectContaining({
        error: expect.any(String),
        code: "finalization_in_progress",
      })
    );
    expect(insertMock).not.toHaveBeenCalled();
    expect(markFinalizationRequestSucceededMock).not.toHaveBeenCalled();
    expect(getOrCreateFolderMock).not.toHaveBeenCalled();
    expect(uploadPdfMock).not.toHaveBeenCalled();
  });

  it("marks upload_pdf consistently without retrying the upload itself", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "condiciones-vacante",
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

    uploadPdfMock.mockRejectedValueOnce(new Error("drive upload failed"));

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(500);
    expect(withGoogleRetryMock).toHaveBeenCalledTimes(6);
    expect(uploadPdfMock).toHaveBeenCalledOnce();
    expect(markFinalizationRequestFailedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        stage: "drive.upload_pdf",
      })
    );
    expect(markFinalizationRequestSucceededMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("falls back to the UI description when the server catalog is unavailable", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "condiciones-vacante",
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
    getCondicionesVacanteCatalogsMock.mockRejectedValueOnce(
      new Error("catalog unavailable")
    );

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    const mutationWrites = prepareCompanySpreadsheetMock.mock.calls[0]?.[0]?.mutation
      ?.writes as Array<{ range: string; value: unknown }>;
    expect(mutationWrites).toEqual(
      expect.arrayContaining([
        {
          range:
            "'3. REVISIÓN DE LAS CONDICIONES DE LA VACANTE'!G150",
          value: "A",
        },
      ])
    );
    expect(uploadJsonArtifactMock.mock.calls[0]?.[0]?.cache_snapshot?.section_6).toEqual([
      {
        discapacidad: "Visual",
        descripcion: "A",
      },
    ]);
  });
});
