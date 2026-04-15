import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyFormSheetMutation, type CellWrite } from "@/lib/google/sheets";
import {
  buildRawPayloadFileName,
  exportSheetToPdf,
  getOrCreateFolder,
  RAW_PAYLOADS_FOLDER_NAME,
  sanitizeFileName,
  uploadJsonArtifact,
  uploadPdf,
} from "@/lib/google/drive";
import {
  buildFailedRawPayloadArtifact,
  buildUploadedRawPayloadArtifact,
  type RawPayloadArtifact,
  withRawPayloadArtifact,
} from "@/lib/finalization/payloads";
import {
  buildFinalizationIdempotencyKey,
  buildFinalizationRequestHash,
  type FinalizationSuccessResponse,
} from "@/lib/finalization/idempotency";
import { buildFinalizedRecordInsert } from "@/lib/finalization/finalizedRecord";
import { withGoogleRetry } from "@/lib/finalization/googleRetry";
import {
  FINALIZATION_IN_PROGRESS_CODE,
  type FinalizationRequestsSupabaseClient,
  beginFinalizationRequest,
  markFinalizationRequestFailed,
  markFinalizationRequestStage,
  markFinalizationRequestSucceeded,
} from "@/lib/finalization/requests";
import {
  buildPresentacionCompletionPayloads,
  getPresentacionFormName,
} from "@/lib/finalization/presentacionPayload";
import { createFinalizationProfiler } from "@/lib/finalization/profiler";
import { reviewFinalizationText } from "@/lib/finalization/textReview";
import { prepareCompanySpreadsheet } from "@/lib/google/companySpreadsheet";
import {
  normalizePresentacionMotivacion,
  normalizePresentacionTipoVisita,
} from "@/lib/presentacion";
import { presentacionFinalizeRequestSchema } from "@/lib/validations/finalization";

const PAYLOAD_SOURCE = "form_web";

const SECTION_1_MAP: Record<string, string> = {
  fecha_visita: "D7",
  modalidad: "Q7",
  nombre_empresa: "D8",
  direccion_empresa: "D9",
  correo_1: "D10",
  contacto_empresa: "D11",
  caja_compensacion: "D12",
  profesional_asignado: "D13",
  asesor: "D14",
  ciudad_empresa: "Q8",
  nit_empresa: "Q9",
  telefono_empresa: "Q10",
  cargo: "Q11",
  sede_empresa: "Q12",
  correo_profesional: "Q13",
  correo_asesor: "Q14",
};

const MOTIVACION_MAP: Record<string, string> = {
  "Responsabilidad Social Empresarial": "U60",
  "Objetivos y metas para la diversidad, equidad e inclusión.": "U61",
  "Avances a nivel global de impacto en Colombia": "U62",
  "Beneficios Tributarios": "U63",
  "Beneficios en la contratación de población en riesgo de exclusión": "U64",
  "Ventaja en licitaciones públicas": "U65",
  "Cumplimiento de la normativa establecida por el Estado Colombiano.": "U66",
  "Experiencia en la vinculación de personas en condición de discapacidad.":
    "U67",
};

const ACUERDOS_CELL = "A71";
const ASISTENTES_START_ROW = 75;
const ASISTENTES_NAME_COL = "C";
const ASISTENTES_CARGO_COL = "N";
const ASISTENTES_BASE_ROWS = 3;

function getSheetName(tipoVisita: string) {
  return tipoVisita === "Reactivación"
    ? "1.2 REACTIVACIÓN DEL PROGRAMA IL"
    : "1. PRESENTACIÓN DEL PROGRAMA IL";
}

function cellRef(sheetName: string, cell: string) {
  return `'${sheetName}'!${cell}`;
}

export async function POST(request: Request) {
  const profiler = createFinalizationProfiler("presentacion");
  let supabaseClient: Awaited<ReturnType<typeof createClient>> | null = null;
  let finalizationRequestContext:
    | {
        idempotencyKey: string;
        userId: string;
      }
    | null = null;
  let finalizationStage = "request.parse_json";

  try {
    const body = await request.json();
    profiler.mark("request.parse_json");
    const parsed = presentacionFinalizeRequestSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { empresa, finalization_identity: finalizationIdentity, ...formData } =
      parsed.data;
    const tipoVisita = normalizePresentacionTipoVisita(formData.tipo_visita);
    const motivacionSeleccionada = normalizePresentacionMotivacion(
      formData.motivacion
    );

    supabaseClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    profiler.mark("auth.get_user");

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const sessionResult =
      typeof supabaseClient.auth.getSession === "function"
        ? await supabaseClient.auth.getSession()
        : { data: { session: null }, error: null };
    profiler.mark("auth.get_session");

    const textReview = await reviewFinalizationText({
      formSlug: "presentacion",
      accessToken: sessionResult.data.session?.access_token ?? "",
      value: formData,
    });
    profiler.mark(`text_review.${textReview.status}`);

    if (textReview.status === "failed") {
      console.warn("[presentacion.text_review] failed", {
        reason: textReview.reason,
      });
    }

    const reviewedFormData = textReview.value;

    const masterTemplateId = process.env.GOOGLE_SHEETS_MASTER_ID;
    const sheetsFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const pdfFolderId =
      process.env.GOOGLE_DRIVE_PDF_FOLDER_ID ?? process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!masterTemplateId || !sheetsFolderId || !pdfFolderId) {
      return NextResponse.json(
        { error: "Faltan variables de entorno de Google Drive o Sheets" },
        { status: 500 }
      );
    }

    const finalizationRequestsSupabase =
      supabaseClient as unknown as FinalizationRequestsSupabaseClient;

    const requestHash = buildFinalizationRequestHash(
      "presentacion",
      formData as Record<string, unknown>
    );
    const idempotencyKey = buildFinalizationIdempotencyKey({
      formSlug: "presentacion",
      userId: user.id,
      identity: finalizationIdentity,
      requestHash,
    });
    const requestDecision = await beginFinalizationRequest({
      supabase: finalizationRequestsSupabase,
      idempotencyKey,
      formSlug: "presentacion",
      userId: user.id,
      requestHash,
      initialStage: "request.validated",
    });

    if (requestDecision.kind === "replay") {
      return NextResponse.json(requestDecision.responsePayload);
    }

    if (requestDecision.kind === "in_progress") {
      return NextResponse.json(
        {
          error:
            "Ya hay una finalización en curso para esta acta. Intenta de nuevo en unos segundos.",
          code: FINALIZATION_IN_PROGRESS_CODE,
        },
        {
          status: 409,
          headers: {
            "Retry-After": String(requestDecision.retryAfterSeconds),
          },
        }
      );
    }

    finalizationRequestContext = {
      idempotencyKey,
      userId: user.id,
    };
    finalizationStage = "request.validated";

    const markStage = async (stage: string) => {
      finalizationStage = stage;
      await markFinalizationRequestStage({
        supabase: finalizationRequestsSupabase,
        idempotencyKey,
        userId: user.id,
        stage,
      });
    };

    const runGoogleStep = async <T>(
      stage: string,
      operation: () => Promise<T>,
      successLabel = stage
    ) => {
      await markStage(stage);
      const result = await withGoogleRetry(operation, {
        onRetry(retryCount) {
          profiler.mark(`google.retry:${stage}:${retryCount}`);
        },
      });
      profiler.mark(successLabel);
      return result;
    };

    const targetSheetName = getSheetName(tipoVisita);
    const empresaNombre = empresa.nombre_empresa;
    const fechaVisita = formData.fecha_visita;
    const sanitizedEmpresa = sanitizeFileName(empresaNombre);
    const spreadsheetName = sanitizedEmpresa;
    const pdfBaseName = `${sanitizedEmpresa} - ${tipoVisita} - ${fechaVisita}`;

    const empresaFolderId = await runGoogleStep(
      "drive.resolve_sheet_folder",
      () => getOrCreateFolder(sheetsFolderId, sanitizedEmpresa)
    );

    const section1Data = {
      fecha_visita: fechaVisita,
      modalidad: formData.modalidad,
      nit_empresa: formData.nit_empresa,
      nombre_empresa: empresaNombre,
      direccion_empresa: empresa.direccion_empresa ?? "",
      correo_1: empresa.correo_1 ?? "",
      contacto_empresa: empresa.contacto_empresa ?? "",
      caja_compensacion: empresa.caja_compensacion ?? "",
      profesional_asignado: empresa.profesional_asignado ?? "",
      asesor: empresa.asesor ?? "",
      ciudad_empresa: empresa.ciudad_empresa ?? "",
      telefono_empresa: empresa.telefono_empresa ?? "",
      cargo: empresa.cargo ?? "",
      sede_empresa: empresa.sede_empresa ?? empresa.zona_empresa ?? "",
      correo_profesional: empresa.correo_profesional ?? "",
      correo_asesor: empresa.correo_asesor ?? "",
      tipo_visita: tipoVisita,
    };

    const writes: CellWrite[] = [];

    for (const [field, cell] of Object.entries(SECTION_1_MAP)) {
      const value = section1Data[field as keyof typeof section1Data];
      if (value) {
        writes.push({
          range: cellRef(targetSheetName, cell),
          value,
        });
      }
    }

    for (const [opcion, cell] of Object.entries(MOTIVACION_MAP)) {
      writes.push({
        range: cellRef(targetSheetName, cell),
        value: motivacionSeleccionada.includes(opcion),
      });
    }

    writes.push({
      range: cellRef(targetSheetName, ACUERDOS_CELL),
      value: reviewedFormData.acuerdos_observaciones,
    });

    const asistentes = reviewedFormData.asistentes;
    asistentes.forEach((asistente, index) => {
      const row = ASISTENTES_START_ROW + index;
      if (asistente.nombre) {
        writes.push({
          range: cellRef(targetSheetName, `${ASISTENTES_NAME_COL}${row}`),
          value: asistente.nombre,
        });
      }
      if (asistente.cargo) {
        writes.push({
          range: cellRef(targetSheetName, `${ASISTENTES_CARGO_COL}${row}`),
          value: asistente.cargo,
        });
      }
    });

    const extraRows = Math.max(0, asistentes.length - ASISTENTES_BASE_ROWS);
    const preparedSpreadsheet = await runGoogleStep(
      "spreadsheet.prepare_company_file",
      () =>
        prepareCompanySpreadsheet({
          masterTemplateId,
          companyFolderId: empresaFolderId,
          spreadsheetName,
          activeSheetName: targetSheetName,
          mutation: {
            writes,
            rowInsertions:
              extraRows > 0
                ? [
                    {
                      sheetName: targetSheetName,
                      insertAtRow: ASISTENTES_START_ROW + ASISTENTES_BASE_ROWS - 1,
                      count: extraRows,
                      templateRow: ASISTENTES_START_ROW + ASISTENTES_BASE_ROWS - 1,
                    },
                  ]
                : [],
            checkboxValidations: [
              {
                sheetName: targetSheetName,
                cells: Object.values(MOTIVACION_MAP),
              },
            ],
          },
          onStep: profiler.mark,
        })
    );

    await runGoogleStep(
      "spreadsheet.apply_mutation",
      () =>
        applyFormSheetMutation(
          preparedSpreadsheet.spreadsheetId,
          preparedSpreadsheet.effectiveMutation,
          { onStep: profiler.mark }
        ),
      "spreadsheet.apply_mutation_done"
    );

    const { spreadsheetId, sheetLink } = preparedSpreadsheet;

    const pdfBytes = await runGoogleStep("drive.export_pdf", () =>
      exportSheetToPdf(spreadsheetId)
    );
    const pdfEmpresaFolderId = await runGoogleStep(
      "drive.resolve_pdf_folder",
      () => getOrCreateFolder(pdfFolderId, sanitizedEmpresa)
    );
    await markStage("drive.upload_pdf");
    const { webViewLink: pdfLink } = await uploadPdf(
      pdfBytes,
      `${pdfBaseName}.pdf`,
      pdfEmpresaFolderId
    );
    profiler.mark("drive.upload_pdf");

    const now = new Date();
    const registroId = crypto.randomUUID();
    const {
      payloadRaw,
      payloadNormalized: basePayloadNormalized,
      payloadMetadata,
    } = buildPresentacionCompletionPayloads({
      tipoVisita,
      section1Data,
      motivacionSeleccionada,
      acuerdosObservaciones: reviewedFormData.acuerdos_observaciones,
      asistentes,
      output: { sheetLink, pdfLink },
      generatedAt: now,
      payloadSource: PAYLOAD_SOURCE,
    });
    const rawPayloadFileName = buildRawPayloadFileName(
      now,
      payloadRaw.form_id,
      registroId
    );
    let rawPayloadArtifact = buildFailedRawPayloadArtifact({
      folderName: RAW_PAYLOADS_FOLDER_NAME,
      fileName: rawPayloadFileName,
    }) as RawPayloadArtifact;
    let rawPayloadStage = "drive.resolve_raw_payload_folder";

    try {
      const rawPayloadFolderId = await runGoogleStep(rawPayloadStage, () =>
        getOrCreateFolder(empresaFolderId, RAW_PAYLOADS_FOLDER_NAME)
      );
      rawPayloadStage = "drive.upload_raw_payload";
      await markStage(rawPayloadStage);

      const uploadedRawPayload = await uploadJsonArtifact(
        payloadRaw,
        rawPayloadFileName,
        rawPayloadFolderId
      );
      profiler.mark("drive.upload_raw_payload");
      rawPayloadArtifact = buildUploadedRawPayloadArtifact({
        folderName: RAW_PAYLOADS_FOLDER_NAME,
        fileId: uploadedRawPayload.fileId,
        webViewLink: uploadedRawPayload.webViewLink,
        fileName: rawPayloadFileName,
        uploadedAt: new Date(),
      });
    } catch (rawPayloadError) {
      profiler.mark("drive.raw_payload_failed");
      console.error("[presentacion.raw_payload_upload] failed", {
        form: payloadRaw.form_id,
        empresa: empresaNombre,
        registroId,
        fileName: rawPayloadFileName,
        stage: rawPayloadStage,
        error:
          rawPayloadError instanceof Error
            ? rawPayloadError.message
            : String(rawPayloadError),
      });
    }

    const payloadNormalized = withRawPayloadArtifact(
      basePayloadNormalized,
      rawPayloadArtifact
    );

    await markStage("supabase.insert_finalized");
    const { error: insertError } = await supabaseClient
      .from("formatos_finalizados_il")
      .insert(
        buildFinalizedRecordInsert({
          registroId,
          usuarioLogin: user.email ?? user.id,
          nombreUsuario: user.email?.split("@")[0] ?? user.id,
          nombreFormato: getPresentacionFormName(tipoVisita),
          nombreEmpresa: empresaNombre,
          pathFormato: sheetLink,
          payloadNormalized,
          payloadSource: PAYLOAD_SOURCE,
          payloadGeneratedAt: payloadMetadata.generated_at,
        })
      );

    if (insertError) {
      throw insertError;
    }
    profiler.mark("supabase.insert_finalized");

    const responsePayload: FinalizationSuccessResponse = {
      success: true,
      sheetLink,
      pdfLink,
    };

    await markFinalizationRequestSucceeded({
      supabase: finalizationRequestsSupabase,
      idempotencyKey,
      userId: user.id,
      stage: "succeeded",
      responsePayload,
    });

    profiler.finish({
      spreadsheetReused: preparedSpreadsheet.reusedSpreadsheet,
      writes: writes.length,
      asistentes: asistentes.length,
      targetSheetName: preparedSpreadsheet.activeSheetName,
      rawPayloadArtifactStatus: rawPayloadArtifact.status,
      textReviewStatus: textReview.status,
      textReviewReason: textReview.reason,
      textReviewReviewedCount: textReview.reviewedCount,
      textReviewModel: textReview.usage?.model,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    if (finalizationRequestContext && supabaseClient) {
      try {
        await markFinalizationRequestFailed({
          supabase:
            supabaseClient as unknown as FinalizationRequestsSupabaseClient,
          idempotencyKey: finalizationRequestContext.idempotencyKey,
          userId: finalizationRequestContext.userId,
          stage: finalizationStage,
          errorMessage:
            error instanceof Error
              ? error.message
              : "No se pudo finalizar el formulario.",
        });
      } catch (finalizationRequestError) {
        console.error(
          "[presentacion.finalization_request] failed_to_mark_failed",
          finalizationRequestError
        );
      }
    }

    profiler.fail(error);
    console.error("Error en API presentacion:", error);
    return NextResponse.json(
      { error: "No se pudo finalizar el formulario." },
      { status: 500 }
    );
  }
}
