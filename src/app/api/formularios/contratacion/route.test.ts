import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildContratacionRequestHash } from "@/lib/finalization/idempotency";
import { normalizeContratacionValues } from "@/lib/contratacion";

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
  upsertUsuariosRecaRowsMock,
  getFinalizationUserIdentityMock,
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
    upsertUsuariosRecaRowsMock: vi.fn(),
    getFinalizationUserIdentityMock: vi.fn(),
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

vi.mock("@/lib/finalization/finalizationUser", () => ({
  getFinalizationUserIdentity: getFinalizationUserIdentityMock,
}));

vi.mock("@/lib/usuariosRecaServer", () => ({
  upsertUsuariosRecaRows: upsertUsuariosRecaRowsMock,
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

import { POST } from "@/app/api/formularios/contratacion/route";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/formularios/contratacion", {
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
    formData: normalizeContratacionValues(
      {
        fecha_visita: "2026-04-15",
        modalidad: "Presencial",
        nit_empresa: "900123456",
        desarrollo_actividad: "Actividad compartida",
        ajustes_recomendaciones: "Ajuste final",
        asistentes: [
          { nombre: "Marta Ruiz", cargo: "Profesional RECA" },
          { nombre: "Laura Gomez", cargo: "Gerente" },
        ],
        vinculados: [
          {
            numero: "1",
            nombre_oferente: "Ana Perez",
            cedula: "123",
            certificado_porcentaje: "45%",
            discapacidad: "Discapacidad auditiva",
            telefono_oferente: "3000000000",
            genero: "Binario",
            correo_oferente: "ana@correo.com",
            fecha_nacimiento: "1990-01-01",
            edad: "34",
            lgtbiq: "No aplica",
            grupo_etnico: "No",
            grupo_etnico_cual: "No aplica",
            cargo_oferente: "Analista",
            contacto_emergencia: "Mario Perez",
            parentesco: "Hermano",
            telefono_emergencia: "3010000000",
            certificado_discapacidad: "Si",
            lugar_firma_contrato: "Bogota",
            fecha_firma_contrato: "2026-04-15",
            tipo_contrato: "Contrato de trabajo a termino fijo",
            fecha_fin: "2027-04-15",
            contrato_lee_nivel_apoyo: "0. No requiere apoyo.",
            contrato_lee_observacion: "0. No requiere apoyo.",
            contrato_lee_nota: "Sin novedad",
            contrato_comprendido_nivel_apoyo: "0. No requiere apoyo.",
            contrato_comprendido_observacion:
              "0. Comprende con claridad el contrato.",
            contrato_comprendido_nota: "Sin novedad",
            contrato_tipo_nivel_apoyo: "0. No requiere apoyo.",
            contrato_tipo_observacion:
              "0. El vinculado tiene claras las condiciones del tipo de contrato a firmar.",
            contrato_tipo_contrato: "Contrato a termino fijo.",
            contrato_jornada: "Tiempo Completo.",
            contrato_clausulas: "Clausula de confidencialidad.",
            contrato_tipo_nota: "Sin novedad",
            condiciones_salariales_nivel_apoyo: "0. No requiere apoyo.",
            condiciones_salariales_observacion:
              "0. Tiene claras las condiciones salariales asignadas al cargo.",
            condiciones_salariales_frecuencia_pago: "Pago Mensual.",
            condiciones_salariales_forma_pago: "Abono a cuenta bancaria.",
            condiciones_salariales_nota: "Sin novedad",
            prestaciones_cesantias_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_cesantias_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_cesantias_nota: "Sin novedad",
            prestaciones_auxilio_transporte_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_auxilio_transporte_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_auxilio_transporte_nota: "Sin novedad",
            prestaciones_prima_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_prima_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_prima_nota: "Sin novedad",
            prestaciones_seguridad_social_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_seguridad_social_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_seguridad_social_nota: "Sin novedad",
            prestaciones_vacaciones_nivel_apoyo: "0. No requiere apoyo.",
            prestaciones_vacaciones_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_vacaciones_nota: "Sin novedad",
            prestaciones_auxilios_beneficios_nivel_apoyo:
              "0. No requiere apoyo.",
            prestaciones_auxilios_beneficios_observacion:
              "0. Conoce los beneficios y la aplicacion.",
            prestaciones_auxilios_beneficios_nota: "Sin novedad",
            conducto_regular_nivel_apoyo: "0. No requiere apoyo.",
            conducto_regular_observacion: "0. Conoce el conducto regular.",
            descargos_observacion:
              "Si conoce que es una diligencia de descargos.",
            tramites_observacion:
              "Conoce como es el proceso para realizar tramites administrativos (certificaciones, afiliaciones, descuentos, desprendibles de nomina).",
            permisos_observacion:
              "Conoce como es el proceso de solicitud de permisos.",
            conducto_regular_nota: "Sin novedad",
            causales_fin_nivel_apoyo: "0. No requiere apoyo.",
            causales_fin_observacion:
              "0. Tiene claro las causales de cancelacion del contrato.",
            causales_fin_nota: "Sin novedad",
            rutas_atencion_nivel_apoyo: "0. No requiere apoyo.",
            rutas_atencion_observacion:
              "0. Tiene claro cuales son las rutas de atencion.",
            rutas_atencion_nota: "Sin novedad",
          },
        ],
      },
      empresa as never
    ),
    finalization_identity: {
      draft_id: "draft-contratacion-1",
      local_draft_session_id: "session-contratacion-1",
    },
  };
}

describe("POST /api/formularios/contratacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.GOOGLE_SHEETS_MASTER_ID = "master-sheet-id";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "drive-folder-id";
    process.env.GOOGLE_DRIVE_PDF_FOLDER_ID = "pdf-folder-id";

    getUserMock.mockResolvedValue({
      data: { user: { id: "user-3", email: "aaron@example.com" } },
      error: null,
    });
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "token-3" } },
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
    getFinalizationUserIdentityMock.mockResolvedValue({
      usuarioLogin: "aaron_vercel",
      nombreUsuario: "aaron",
    });

    reviewFinalizationTextMock.mockImplementation(
      async ({ value }: { value: unknown }) => ({
        status: "reviewed",
        value,
        reason: "ok",
        reviewedCount: 2,
      })
    );

    getOrCreateFolderMock.mockResolvedValue("folder-id");
    exportSheetToPdfMock.mockResolvedValue(Buffer.from("pdf-bytes"));
    uploadPdfMock.mockResolvedValue({
      fileId: "pdf-file-id",
      webViewLink: "https://drive.example/contratacion.pdf",
    });
    uploadJsonArtifactMock.mockResolvedValue({
      fileId: "json-file-id",
      webViewLink: "https://drive.example/contratacion-raw.json",
    });

    prepareCompanySpreadsheetMock.mockResolvedValue({
      spreadsheetId: "spreadsheet-id",
      effectiveMutation: { writes: [] },
      activeSheetName: "5. CONTRATACIÓN INCLUYENTE",
      sheetLink: "https://sheets.example/contratacion",
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

  it("returns 200 replaying the cached response when the request already succeeded", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "replay",
      responsePayload: {
        success: true,
        sheetLink: "https://sheets.example/cached-contratacion",
        pdfLink: "https://drive.example/cached-contratacion.pdf",
      },
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/cached-contratacion",
      pdfLink: "https://drive.example/cached-contratacion.pdf",
    });
    expect(withGoogleRetryMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(markFinalizationRequestSucceededMock).not.toHaveBeenCalled();
  });

  it("returns 409 while an identical finalization is still in progress", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "in_progress",
      retryAfterSeconds: 17,
    });

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).toBe("17");
    await expect(response.json()).resolves.toEqual({
      error:
        "Ya hay una finalizacion en curso para esta acta. Intenta de nuevo en unos segundos.",
      code: "finalization_in_progress",
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
    const body = buildValidBody();
    const reviewedFormData = {
      ...body.formData,
      vinculados: body.formData.vinculados.map((row, index) =>
        index === 0 ? { ...row, cargo_oferente: "Cargo revisado" } : row
      ),
    };
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "contratacion",
        user_id: "user-3",
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
    reviewFinalizationTextMock.mockResolvedValueOnce({
      status: "reviewed",
      value: reviewedFormData,
      reason: "ok",
      reviewedCount: 2,
    });

    const response = await POST(buildRequest(body));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/contratacion",
      pdfLink: "https://drive.example/contratacion.pdf",
    });
    expect(reviewFinalizationTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        formSlug: "contratacion",
      })
    );
    expect(beginFinalizationRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestHash: buildContratacionRequestHash(reviewedFormData),
      })
    );
    expect(withGoogleRetryMock).toHaveBeenCalledTimes(6);
    expect(getOrCreateFolderMock).toHaveBeenCalledTimes(3);
    expect(prepareCompanySpreadsheetMock).toHaveBeenCalledOnce();
    expect(prepareCompanySpreadsheetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeSheetName: "5. CONTRATACIÓN INCLUYENTE",
        mutation: expect.objectContaining({
          writes: expect.arrayContaining([
            expect.objectContaining({
              range: expect.stringContaining("!A15"),
              value: "Actividad compartida",
            }),
          ]),
        }),
      })
    );
    expect(applyFormSheetMutationMock).toHaveBeenCalledOnce();
    expect(exportSheetToPdfMock).toHaveBeenCalledOnce();
    expect(exportSheetToPdfMock).toHaveBeenCalledWith("spreadsheet-id");
    expect(uploadPdfMock).toHaveBeenCalledOnce();
    expect(uploadJsonArtifactMock).toHaveBeenCalledOnce();
    expect(upsertUsuariosRecaRowsMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario_login: "aaron_vercel",
      })
    );
    expect(markFinalizationRequestStageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "supabase.sync_usuarios_reca",
      })
    );
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-3",
        stage: "succeeded",
        responsePayload: {
          success: true,
          sheetLink: "https://sheets.example/contratacion",
          pdfLink: "https://drive.example/contratacion.pdf",
        },
      })
    );
    expect(markFinalizationRequestFailedMock).not.toHaveBeenCalled();
    expect(profilerFailMock).not.toHaveBeenCalled();
  });

  it("keeps the finalization successful when usuarios RECA sync fails", async () => {
    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "contratacion",
        user_id: "user-3",
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
    upsertUsuariosRecaRowsMock.mockRejectedValue(
      new Error("usuarios reca sync failed")
    );

    const response = await POST(buildRequest(buildValidBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/contratacion",
      pdfLink: "https://drive.example/contratacion.pdf",
    });
    expect(upsertUsuariosRecaRowsMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledOnce();
    expect(markFinalizationRequestStageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "supabase.sync_usuarios_reca",
      })
    );
    expect(markFinalizationRequestStageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "supabase.sync_usuarios_reca_failed",
      })
    );
    expect(markFinalizationRequestFailedMock).not.toHaveBeenCalled();
    expect(markFinalizationRequestSucceededMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "succeeded",
      })
    );
  });
});
