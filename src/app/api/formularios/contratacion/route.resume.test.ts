import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeContratacionValues } from "@/lib/contratacion";
import { CONTRATACION_SHEET_NAME } from "@/lib/finalization/contratacionSheet";

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

function buildBody(options?: {
  vinculadosCount?: number;
  asistentesCount?: number;
}) {
  const empresa = buildEmpresa();
  const vinculadosCount = Math.max(1, options?.vinculadosCount ?? 1);
  const asistentesCount = Math.max(2, options?.asistentesCount ?? 5);
  const baseVinculado = {
    numero: "1",
    nombre_oferente: "Ana Perez",
    cedula: "123",
    certificado_porcentaje: "45%",
    discapacidad: "Discapacidad auditiva",
    telefono_oferente: "3000000000",
    genero: "Hombre",
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
  };

  return {
    empresa,
    formData: normalizeContratacionValues(
      {
        fecha_visita: "2026-04-15",
        modalidad: "Presencial",
        nit_empresa: "900123456",
        desarrollo_actividad: "Actividad compartida",
        ajustes_recomendaciones: "Ajuste final",
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
        vinculados: Array.from({ length: vinculadosCount }, (_, index) => ({
          ...baseVinculado,
          numero: String(index + 1),
          nombre_oferente: `Vinculado ${index + 1}`,
          cedula: String(123 + index),
          correo_oferente: `vinculado${index + 1}@correo.com`,
        })),
      },
      empresa as never
    ),
    finalization_identity: {
      draft_id: "draft-contratacion-1",
      local_draft_session_id: "session-contratacion-1",
    },
  };
}

function buildResumeArtifacts(overrides: Record<string, unknown> = {}) {
  return {
    sheetLink: "https://sheets.example/contratacion",
    spreadsheetId: "spreadsheet-id",
    companyFolderId: "company-folder-id",
    activeSheetName: "5. CONTRATACIÓN INCLUYENTE",
    actaRef: "ACTA-CTR-1",
    footerActaRefs: [
      {
        sheetName: "5. CONTRATACIÓN INCLUYENTE",
        actaRef: "ACTA-CTR-1",
      },
    ],
    footerMutationMarkers: [
      {
        sheetName: "5. CONTRATACIÓN INCLUYENTE",
        actaRef: "ACTA-CTR-1",
        initialRowIndex: 110,
        expectedFinalRowIndex: 110,
      },
    ],
    effectiveSheetReplacements: null,
    spreadsheetResourceMode: "legacy_company",
    prewarmStateSnapshot: null,
    prewarmStatus: "disabled",
    prewarmReused: false,
    prewarmStructureSignature: null,
    mutationAppliedAt: "2026-04-23T12:00:00.000Z",
    hiddenSheetsAppliedAt: "2026-04-23T12:00:01.000Z",
    pdfLink: "https://drive.example/cached-contratacion.pdf",
    ...overrides,
  };
}

function buildStructuralResumeArtifacts(overrides: Record<string, unknown> = {}) {
  return {
    ...buildResumeArtifacts(),
    activeSheetName: CONTRATACION_SHEET_NAME,
    footerActaRefs: [
      {
        sheetName: CONTRATACION_SHEET_NAME,
        actaRef: "ACTA-CTR-1",
      },
    ],
    footerMutationMarkers: [
      {
        sheetName: CONTRATACION_SHEET_NAME,
        actaRef: "ACTA-CTR-1",
        initialRowIndex: 110,
        expectedFinalRowIndex: 111,
      },
    ],
    ...overrides,
  };
}

describe("POST /api/formularios/contratacion resume", () => {
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
        reviewedCount: 2,
      })
    );

    beginFinalizationRequestMock.mockResolvedValue({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "contratacion",
        user_id: "user-3",
        identity_key: "draft-contratacion-1",
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
        external_artifacts: buildResumeArtifacts(),
        external_stage: "drive.upload_pdf",
        externalized_at: "2026-04-23T12:00:02.000Z",
        started_at: "2026-04-23T12:00:00.000Z",
        completed_at: null,
        updated_at: "2026-04-23T12:00:02.000Z",
      },
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValue({
      kind: "resume",
      externalStage: "drive.upload_pdf",
      externalArtifacts: buildResumeArtifacts(),
    });
    recoverPersistedFinalizationResponseMock.mockResolvedValue(null);
    persistFinalizationExternalArtifactsMock.mockResolvedValue(undefined);
    prepareFinalizationSpreadsheetPipelineMock.mockResolvedValue(undefined);
    inspectFooterActaWritesMock.mockResolvedValue([]);
    writeFooterActaMarkerMock.mockResolvedValue(undefined);
    applyFormSheetStructureInsertionsMock.mockResolvedValue(undefined);
    applyFormSheetCellWritesMock.mockResolvedValue(undefined);
    getOrCreateFolderMock.mockResolvedValue("pdf-folder-id");
    exportSheetToPdfMock.mockResolvedValue(Buffer.from("pdf-bytes"));
    uploadPdfMock.mockResolvedValue({
      fileId: "pdf-file-id",
      webViewLink: "https://drive.example/contratacion.pdf",
    });
    uploadJsonArtifactMock.mockResolvedValue({
      fileId: "json-file-id",
      webViewLink: "https://drive.example/contratacion-raw.json",
    });
    upsertUsuariosRecaRowsMock.mockResolvedValue(1);
  });

  it("skips PDF folder resolution and PDF export when resume artifacts already include pdfLink", async () => {
    const response = await POST(buildRequest(buildBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/contratacion",
      pdfLink: "https://drive.example/cached-contratacion.pdf",
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
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it("resumes after a crash between structural insertions and final cell writes without rewriting the sheet", async () => {
    const overflowBody = buildBody({
      vinculadosCount: 6,
      asistentesCount: 5,
    });
    prepareFinalizationSpreadsheetPipelineMock.mockResolvedValue({
      preparedSpreadsheet: {
        spreadsheetId: "spreadsheet-id",
        companyFolderId: "company-folder-id",
        spreadsheetResourceMode: "legacy_company",
        prewarmStateSnapshot: null,
        effectiveSheetReplacements: null,
        effectiveMutation: { writes: [] },
        activeSheetName: CONTRATACION_SHEET_NAME,
        activeSheetId: 901,
        sheetLink: "https://sheets.example/contratacion",
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
    beginFinalizationRequestMock
      .mockResolvedValueOnce({
        kind: "claimed",
        row: {
          idempotency_key: "key",
          form_slug: "contratacion",
          user_id: "user-3",
          identity_key: "draft-contratacion-1",
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
          form_slug: "contratacion",
          user_id: "user-3",
          identity_key: "draft-contratacion-1",
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
          external_artifacts: {
            ...buildStructuralResumeArtifacts({
              footerMutationMarkers: [
                {
                  sheetName: CONTRATACION_SHEET_NAME,
                  actaRef: "ACTA-CTR-1",
                  initialRowIndex: 338,
                  expectedFinalRowIndex: 599,
                },
              ],
            }),
            mutationAppliedAt: null,
            hiddenSheetsAppliedAt: null,
            pdfLink: null,
            footerMarkerWrittenAt: "2026-04-23T12:00:00.000Z",
            structureInsertionsAppliedAt: "2026-04-23T12:00:01.000Z",
          },
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
        externalArtifacts: {
          ...buildStructuralResumeArtifacts({
            footerMutationMarkers: [
              {
                sheetName: CONTRATACION_SHEET_NAME,
                actaRef: "ACTA-CTR-1",
                initialRowIndex: 338,
                expectedFinalRowIndex: 599,
              },
            ],
          }),
          mutationAppliedAt: null,
          hiddenSheetsAppliedAt: null,
          pdfLink: null,
          footerMarkerWrittenAt: "2026-04-23T12:00:00.000Z",
          structureInsertionsAppliedAt: "2026-04-23T12:00:01.000Z",
        },
      });
    inspectFooterActaWritesMock
      .mockResolvedValueOnce([
        {
          sheetName: CONTRATACION_SHEET_NAME,
          rowIndex: 110,
          columnIndex: 0,
          range: "'5. CONTRATACIÃ“N INCLUYENTE'!A111",
          value: "www.recacolombia.org\nACTA ID: ACTA-CTR-1",
          currentValue: "www.recacolombia.org",
          applied: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          sheetName: CONTRATACION_SHEET_NAME,
          rowIndex: 110,
          columnIndex: 0,
          range: "'5. CONTRATACIÃ“N INCLUYENTE'!A111",
          value: "www.recacolombia.org\nACTA ID: ACTA-CTR-1",
          currentValue: "www.recacolombia.org\nACTA ID: ACTA-CTR-1",
          applied: true,
        },
      ]);
    inspectFooterActaWritesMock.mockReset();
    inspectFooterActaWritesMock
      .mockResolvedValueOnce([
        {
          sheetName: CONTRATACION_SHEET_NAME,
          rowIndex: 338,
          columnIndex: 0,
          range: `'${CONTRATACION_SHEET_NAME}'!A339`,
          value: "www.recacolombia.org\nACTA ID: ACTA-CTR-1",
          currentValue: "www.recacolombia.org",
          applied: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          sheetName: CONTRATACION_SHEET_NAME,
          rowIndex: 599,
          columnIndex: 0,
          range: `'${CONTRATACION_SHEET_NAME}'!A600`,
          value: "www.recacolombia.org\nACTA ID: ACTA-CTR-1",
          currentValue: "www.recacolombia.org\nACTA ID: ACTA-CTR-1",
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
      sheetLink: "https://sheets.example/contratacion",
      pdfLink: "https://drive.example/contratacion.pdf",
    });
    expect(prepareFinalizationSpreadsheetPipelineMock).toHaveBeenCalledTimes(1);
    expect(writeFooterActaMarkerMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetStructureInsertionsMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledTimes(2);
    expect(exportSheetToPdfMock).toHaveBeenCalledWith("spreadsheet-id");
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it("does not trip the footer guard when attendee rows are already in post-block coordinates", async () => {
    const overflowBody = buildBody({
      vinculadosCount: 6,
      asistentesCount: 5,
    });
    prepareFinalizationSpreadsheetPipelineMock.mockResolvedValueOnce({
      preparedSpreadsheet: {
        spreadsheetId: "spreadsheet-id",
        companyFolderId: "company-folder-id",
        spreadsheetResourceMode: "legacy_company",
        prewarmStateSnapshot: null,
        effectiveSheetReplacements: null,
        effectiveMutation: { writes: [] },
        activeSheetName: CONTRATACION_SHEET_NAME,
        activeSheetId: 901,
        sheetLink: "https://sheets.example/contratacion",
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
    beginFinalizationRequestMock.mockResolvedValueOnce({
      kind: "claimed",
      row: {
        idempotency_key: "key",
        form_slug: "contratacion",
        user_id: "user-3",
        identity_key: "draft-contratacion-1",
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
    });
    resolveFinalizationRecoveryDecisionMock.mockResolvedValueOnce({
      kind: "cold",
    });
    inspectFooterActaWritesMock.mockResolvedValueOnce([
      {
        sheetName: CONTRATACION_SHEET_NAME,
        rowIndex: 78,
        columnIndex: 0,
        range: `'${CONTRATACION_SHEET_NAME}'!A79`,
        value: "www.recacolombia.org\nACTA ID: ACTA-CTR-1",
        currentValue: "www.recacolombia.org",
        applied: false,
      },
    ]);

    const response = await POST(buildRequest(overflowBody));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sheetLink: "https://sheets.example/contratacion",
      pdfLink: "https://drive.example/contratacion.pdf",
    });
    expect(writeFooterActaMarkerMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetStructureInsertionsMock).toHaveBeenCalledTimes(1);
    expect(applyFormSheetCellWritesMock).toHaveBeenCalledTimes(1);
  });
});
