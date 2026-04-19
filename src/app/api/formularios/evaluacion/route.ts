import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyFormSheetMutation } from "@/lib/google/sheets";
import {
  buildRawPayloadFileName,
  getOrCreateFolder,
  RAW_PAYLOADS_FOLDER_NAME,
  sanitizeFileName,
  uploadJsonArtifact,
} from "@/lib/google/drive";
import {
  buildFailedRawPayloadArtifact,
  buildUploadedRawPayloadArtifact,
  normalizePayloadAsistentes,
  type RawPayloadArtifact,
  withRawPayloadArtifact,
} from "@/lib/finalization/payloads";
import {
  buildEvaluacionRequestHash,
  buildFinalizationIdempotencyKey,
  type FinalizationSuccessResponse,
} from "@/lib/finalization/idempotency";
import { buildFinalizedRecordInsert } from "@/lib/finalization/finalizedRecord";
import {
  buildPersistedFinalizationMetadata,
  withPersistedFinalizationMetadata,
} from "@/lib/finalization/finalizationStatus";
import {
  buildFinalizationClaimExhaustedBody,
  buildFinalizationInProgressBody,
  buildFinalizationRouteErrorBody,
  getFinalizationClaimExhaustedRetryAfterSeconds,
  isFinalizationClaimExhaustedError,
  markFinalizationRequestFailedSafely,
  markFinalizationRequestSucceededSafely,
} from "@/lib/finalization/finalizationFeedback";
import {
  FINALIZATION_IN_PROGRESS_CODE,
  type FinalizationRequestsSupabaseClient,
  beginFinalizationRequest,
  markFinalizationRequestStage,
} from "@/lib/finalization/requests";
import {
  buildEvaluacionCompletionPayloads,
  EVALUACION_FORM_NAME,
} from "@/lib/finalization/evaluacionPayload";
import { generateActaRef } from "@/lib/finalization/actaRef";
import { getFinalizationUserIdentity } from "@/lib/finalization/finalizationUser";
import {
  buildEvaluacionSheetMutation,
  EVALUACION_SHEET_NAME,
} from "@/lib/finalization/evaluacionSheet";
import { createFinalizationProfiler } from "@/lib/finalization/profiler";
import {
  extractTextReviewTargets,
  reviewFinalizationText,
} from "@/lib/finalization/textReview";
import { prepareCompanySpreadsheet } from "@/lib/google/companySpreadsheet";
import { normalizeEvaluacionValues } from "@/lib/evaluacion";
import {
  buildSection1Data,
  createGoogleStepRunner,
  toEmpresaRecord,
} from "@/lib/finalization/routeHelpers";
import { evaluacionFinalizeRequestSchema } from "@/lib/validations/finalization";

const PAYLOAD_SOURCE = "form_web";
const EVALUACION_EXTRA_VISIBLE_SHEETS = ["2.1 EVALUACION FOTOS"] as const;
export const maxDuration = 60;

export async function POST(request: Request) {
  const profiler = createFinalizationProfiler("evaluacion");
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
    const parsed = evaluacionFinalizeRequestSchema.safeParse(body);

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
    const normalizedFormData = normalizeEvaluacionValues(formData, empresaRecord);

    supabaseClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    profiler.mark("auth.get_user");

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const finalizationUser = await getFinalizationUserIdentity(user);
    profiler.mark("auth.resolve_usuario_login");

    const reviewTargets = extractTextReviewTargets("evaluacion", normalizedFormData);
    const textReview =
      reviewTargets.length === 0
        ? {
            status: "skipped" as const,
            value: normalizedFormData,
            reason: "no_reviewable_text" as const,
            reviewedCount: 0,
            usage: {
              model: process.env.OPENAI_TEXT_REVIEW_MODEL?.trim() || undefined,
              uniqueTexts: 0,
              batches: 0,
            },
          }
        : await (async () => {
            const sessionResult =
              typeof supabaseClient.auth.getSession === "function"
                ? await supabaseClient.auth.getSession()
                : { data: { session: null }, error: null };
            profiler.mark("auth.get_session");

            return reviewFinalizationText({
              formSlug: "evaluacion",
              accessToken: sessionResult.data.session?.access_token ?? "",
              value: normalizedFormData,
            });
          })();
    profiler.mark(`text_review.${textReview.status}`);

    if (textReview.status === "failed") {
      console.warn("[evaluacion.text_review] failed", {
        reason: textReview.reason,
      });
    }

    const reviewedFormData = textReview.value;
    const meaningfulAsistentes = normalizePayloadAsistentes(
      reviewedFormData.asistentes
    );

    const masterTemplateId = process.env.GOOGLE_SHEETS_MASTER_ID;
    const sheetsFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!masterTemplateId || !sheetsFolderId) {
      return NextResponse.json(
        { error: "Faltan variables de entorno de Google Drive o Sheets" },
        { status: 500 }
      );
    }

    const finalizationRequestsSupabase =
      supabaseClient as unknown as FinalizationRequestsSupabaseClient;
    const requestHash = buildEvaluacionRequestHash({
      ...normalizedFormData,
      asistentes: meaningfulAsistentes,
    });
    const idempotencyKey = buildFinalizationIdempotencyKey({
      formSlug: "evaluacion",
      userId: user.id,
      identity: finalizationIdentity,
      requestHash,
    });
    const requestDecision = await (async () => {
      try {
        return await beginFinalizationRequest({
          supabase: finalizationRequestsSupabase,
          idempotencyKey,
          formSlug: "evaluacion",
          userId: user.id,
          requestHash,
          initialStage: "request.validated",
        });
      } catch (error) {
        if (isFinalizationClaimExhaustedError(error)) {
          profiler.mark("request.claim_exhausted");
          return NextResponse.json(buildFinalizationClaimExhaustedBody(), {
            status: 409,
            headers: {
              "Retry-After": String(
                getFinalizationClaimExhaustedRetryAfterSeconds()
              ),
            },
          });
        }

        throw error;
      }
    })();

    if (requestDecision instanceof NextResponse) {
      return requestDecision;
    }

    if (requestDecision.kind === "replay") {
      return NextResponse.json(requestDecision.responsePayload);
    }

    if (requestDecision.kind === "in_progress") {
      return NextResponse.json(
        {
          ...buildFinalizationInProgressBody({
            stage: requestDecision.stage,
            error:
              "Ya hay una finalizacion en curso para esta acta. Verifica el estado antes de reenviarla.",
          }),
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
    const { runGoogleStep } = createGoogleStepRunner({
      markStage,
      profiler,
    });
    const now = new Date();
    const registroId = crypto.randomUUID();
    const actaRef = generateActaRef();

    const empresaNombre = empresa.nombre_empresa;
    const sanitizedEmpresa = sanitizeFileName(empresaNombre);
    const spreadsheetName = sanitizedEmpresa;
    const empresaFolderId = await runGoogleStep("drive.resolve_sheet_folder", () =>
      getOrCreateFolder(sheetsFolderId, sanitizedEmpresa)
    );

    const section1Data = buildSection1Data(empresaRecord, reviewedFormData);
    const preparedSpreadsheet = await runGoogleStep(
      "spreadsheet.prepare_company_file",
      () =>
        prepareCompanySpreadsheet({
          masterTemplateId,
          companyFolderId: empresaFolderId,
          spreadsheetName,
          activeSheetName: EVALUACION_SHEET_NAME,
          extraVisibleSheetNames: [...EVALUACION_EXTRA_VISIBLE_SHEETS],
          mutation: {
            ...buildEvaluacionSheetMutation({
              section1Data,
              formData: reviewedFormData,
              asistentes: meaningfulAsistentes,
            }),
            footerActaRefs: [
              {
                sheetName: EVALUACION_SHEET_NAME,
                actaRef,
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

    const { sheetLink } = preparedSpreadsheet;
    const {
      payloadRaw,
      payloadNormalized: basePayloadNormalized,
      payloadMetadata,
    } = buildEvaluacionCompletionPayloads({
      actaRef,
      section1Data,
      formData: reviewedFormData,
      asistentes: meaningfulAsistentes,
      output: { sheetLink },
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
      console.error("[evaluacion.raw_payload_upload] failed", {
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

    const payloadNormalized = withPersistedFinalizationMetadata(
      withRawPayloadArtifact(basePayloadNormalized, rawPayloadArtifact),
      buildPersistedFinalizationMetadata({
        formSlug: "evaluacion",
        identity: finalizationIdentity,
        requestHash,
        idempotencyKey,
      })
    );

    // Evaluacion does not sync usuarios_reca because this flow has no cedula field
    // that could act as a reliable person-level key for that directory.
    await markStage("supabase.insert_finalized");
    const { error: insertError } = await supabaseClient
      .from("formatos_finalizados_il")
      .insert(
        buildFinalizedRecordInsert({
          registroId,
          actaRef,
          usuarioLogin: finalizationUser.usuarioLogin,
          nombreUsuario: finalizationUser.nombreUsuario,
          nombreFormato: EVALUACION_FORM_NAME,
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

    // This form intentionally does not generate PDF because the auxiliary
    // "2.1 EVALUACIÓN FOTOS" sheet remains operationally manual after publish.
    const responsePayload = {
      success: true,
      sheetLink,
    } satisfies FinalizationSuccessResponse;

    await markFinalizationRequestSucceededSafely({
      supabase: finalizationRequestsSupabase,
      idempotencyKey,
      userId: user.id,
      stage: "succeeded",
      responsePayload,
      source: "evaluacion.finalization_request",
    });
    profiler.mark("finalization_request.succeeded");

    profiler.finish({
      result: "success",
      empresaId: empresa.id,
      hasDraftId: Boolean(finalizationIdentity.draft_id),
      requestHash,
      sheetLink,
      asistentes: meaningfulAsistentes.length,
      textReviewStatus: textReview.status,
      textReviewReason: textReview.reason,
      textReviewReviewedCount: textReview.reviewedCount,
      textReviewModel: textReview.usage?.model,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    const routeErrorMessage =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Error al guardar el formulario.";

    if (supabaseClient && finalizationRequestContext) {
      await markFinalizationRequestFailedSafely({
        supabase:
          supabaseClient as unknown as FinalizationRequestsSupabaseClient,
        idempotencyKey: finalizationRequestContext.idempotencyKey,
        userId: finalizationRequestContext.userId,
        stage: finalizationStage,
        errorMessage: routeErrorMessage,
        source: "evaluacion.finalize",
      });
    }

    profiler.fail(error, {
      requestStage: finalizationStage,
      requestIdempotencyKey: finalizationRequestContext?.idempotencyKey,
      requestUserId: finalizationRequestContext?.userId,
    });
    console.error("[evaluacion.finalize]", error);
    return NextResponse.json(
      buildFinalizationRouteErrorBody({
        stage: finalizationStage,
        error: routeErrorMessage,
      }),
      { status: 500 }
    );
  }
}
