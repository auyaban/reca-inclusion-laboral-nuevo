import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyFormSheetMutation } from "@/lib/google/sheets";
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
  normalizePayloadAsistentes,
  type RawPayloadArtifact,
  withRawPayloadArtifact,
} from "@/lib/finalization/payloads";
import {
  buildFinalizationIdempotencyKey,
  buildSeleccionRequestHash,
  type FinalizationSuccessResponse,
} from "@/lib/finalization/idempotency";
import { buildFinalizedRecordInsert } from "@/lib/finalization/finalizedRecord";
import {
  FINALIZATION_IN_PROGRESS_CODE,
  type FinalizationRequestsSupabaseClient,
  beginFinalizationRequest,
  markFinalizationRequestFailed,
  markFinalizationRequestStage,
  markFinalizationRequestSucceeded,
} from "@/lib/finalization/requests";
import {
  buildSeleccionCompletionPayloads,
  SELECCION_FORM_NAME,
} from "@/lib/finalization/seleccionPayload";
import {
  buildSeleccionSheetMutation,
  SELECCION_SHEET_NAME,
} from "@/lib/finalization/seleccionSheet";
import { createFinalizationProfiler } from "@/lib/finalization/profiler";
import { reviewFinalizationText } from "@/lib/finalization/textReview";
import { prepareCompanySpreadsheet } from "@/lib/google/companySpreadsheet";
import { normalizeSeleccionValues } from "@/lib/seleccion";
import {
  buildSection1Data,
  createGoogleStepRunner,
  toEmpresaRecord,
} from "@/lib/finalization/routeHelpers";
import {
  seleccionFinalizeRequestSchema,
} from "@/lib/validations/finalization";

const PAYLOAD_SOURCE = "form_web";

export async function POST(request: Request) {
  const profiler = createFinalizationProfiler("seleccion");
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
    const parsed = seleccionFinalizeRequestSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue?.message ?? "Datos invalidos" },
        { status: 400 }
      );
    }

    const {
      empresa,
      formData,
      finalization_identity: finalizationIdentity,
    } = parsed.data;
    const empresaRecord = toEmpresaRecord(empresa);
    const normalizedFormData = normalizeSeleccionValues(formData, empresaRecord);

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
      formSlug: "seleccion",
      accessToken: sessionResult.data.session?.access_token ?? "",
      value: normalizedFormData,
    });
    profiler.mark(`text_review.${textReview.status}`);

    if (textReview.status === "failed") {
      console.warn("[seleccion.text_review] failed", {
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
    const requestHash = buildSeleccionRequestHash(reviewedFormData);
    const idempotencyKey = buildFinalizationIdempotencyKey({
      formSlug: "seleccion",
      userId: user.id,
      identity: finalizationIdentity,
      requestHash,
    });
    const requestDecision = await beginFinalizationRequest({
      supabase: finalizationRequestsSupabase,
      idempotencyKey,
      formSlug: "seleccion",
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
            "Ya hay una finalizacion en curso para esta acta. Intenta de nuevo en unos segundos.",
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
    const { runGoogleStep, runGoogleStepWithoutRetry } =
      createGoogleStepRunner({
        markStage,
        profiler,
      });

    const empresaNombre = empresa.nombre_empresa;
    const sanitizedEmpresa = sanitizeFileName(empresaNombre);
    const spreadsheetName = sanitizedEmpresa;
    const pdfBaseName = `${sanitizedEmpresa} - Seleccion Incluyente - ${normalizedFormData.fecha_visita}`;
    const empresaFolderId = await runGoogleStep("drive.resolve_sheet_folder", () =>
      getOrCreateFolder(sheetsFolderId, sanitizedEmpresa)
    );

    const section1Data = buildSection1Data(empresa, reviewedFormData);
    const meaningfulAsistentes = normalizePayloadAsistentes(
      reviewedFormData.asistentes
    );
    const mutation = buildSeleccionSheetMutation({
      section1Data,
      formData: reviewedFormData,
      asistentes: meaningfulAsistentes,
    });

    const preparedSpreadsheet = await runGoogleStep(
      "spreadsheet.prepare_company_file",
      () =>
        prepareCompanySpreadsheet({
          masterTemplateId,
          companyFolderId: empresaFolderId,
          spreadsheetName,
          activeSheetName: SELECCION_SHEET_NAME,
          mutation,
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

    const { sheetLink, spreadsheetId } = preparedSpreadsheet;
    const pdfEmpresaFolderPromise = runGoogleStep("drive.resolve_pdf_folder", () =>
      getOrCreateFolder(pdfFolderId, sanitizedEmpresa)
    );
    const pdfBytes = await runGoogleStep("drive.export_pdf", () =>
      exportSheetToPdf(spreadsheetId)
    );
    const pdfEmpresaFolderId = await pdfEmpresaFolderPromise;
    const { webViewLink: pdfLink } = await runGoogleStepWithoutRetry(
      "drive.upload_pdf",
      () => uploadPdf(pdfBytes, `${pdfBaseName}.pdf`, pdfEmpresaFolderId)
    );

    const now = new Date();
    const registroId = crypto.randomUUID();
    const {
      payloadRaw,
      payloadNormalized: basePayloadNormalized,
      payloadMetadata,
    } = buildSeleccionCompletionPayloads({
      section1Data,
      formData: reviewedFormData,
      asistentes: meaningfulAsistentes,
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
      console.error("[seleccion.raw_payload_upload] failed", {
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
          nombreFormato: SELECCION_FORM_NAME,
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
      writes: mutation.writes.length,
      oferentes: reviewedFormData.oferentes.length,
      asistentes: meaningfulAsistentes.length,
      targetSheetName: preparedSpreadsheet.activeSheetName,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    if (supabaseClient && finalizationRequestContext) {
      await markFinalizationRequestFailed({
        supabase:
          supabaseClient as unknown as FinalizationRequestsSupabaseClient,
        idempotencyKey: finalizationRequestContext.idempotencyKey,
        userId: finalizationRequestContext.userId,
        stage: finalizationStage,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }

    console.error("[seleccion.finalize] failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo finalizar el formulario.",
      },
      { status: 500 }
    );
  }
}
