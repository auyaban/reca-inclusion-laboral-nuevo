import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
import { buildFinalizedRecordInsert } from "@/lib/finalization/finalizedRecord";
import {
  buildPersistedFinalizationMetadata,
  withPersistedFinalizationMetadata,
} from "@/lib/finalization/finalizationStatus";
import {
  buildFinalizationRecoverableBody,
  buildFinalizationClaimExhaustedBody,
  buildFinalizationInProgressBody,
  buildFinalizationRouteErrorBody,
  getFinalizationClaimExhaustedRetryAfterSeconds,
  isFinalizationClaimExhaustedError,
  markFinalizationRequestFailedSafely,
  markFinalizationRequestSucceededSafely,
} from "@/lib/finalization/finalizationFeedback";
import {
  POST_PERSISTENCE_CONFIRMATION_STAGE,
  recoverPersistedFinalizationResponse,
  resolveFinalizationRecoveryDecision,
} from "@/lib/finalization/persistedRecovery";
import {
  FINALIZATION_IN_PROGRESS_CODE,
  buildFinalizationExternalArtifacts,
  persistFinalizationExternalArtifacts,
  type FinalizationExternalArtifacts,
  type FinalizationRequestsSupabaseClient,
  beginFinalizationRequest,
  markFinalizationRequestStage,
} from "@/lib/finalization/requests";
import type { FinalizationSuccessResponse } from "@/lib/finalization/idempotency";
import { getFinalizationIdentityKey } from "@/lib/finalization/idempotencyCore";
import { getFinalizationUserIdentity } from "@/lib/finalization/finalizationUser";
import { createFinalizationProfiler } from "@/lib/finalization/profiler";
import { reviewFinalizationText } from "@/lib/finalization/textReview";
import {
  buildDraftSpreadsheetProvisionalName,
  buildFinalDocumentBaseName,
} from "@/lib/finalization/documentNaming";
import {
  buildFinalizationProfilerPersistence,
  buildPreparedSpreadsheetFromExternalArtifacts,
  sealPreparedSpreadsheetAfterPersistence,
  type FinalizationSpreadsheetSupabaseClient,
  getFinalizationPrewarmErrorContext,
  prepareFinalizationSpreadsheetPipeline,
} from "@/lib/finalization/finalizationSpreadsheet";
import { buildPrewarmHintForForm } from "@/lib/finalization/prewarmRegistry";
import {
  buildSection1Data,
  createGoogleStepRunner,
  ensureFinalizationSheetMutationApplied,
  logNormalizationAudit,
  toEmpresaRecord,
} from "@/lib/finalization/routeHelpers";
import {
  buildInduccionOperativaCompletionPayloads,
  INDUCCION_OPERATIVA_FORM_NAME,
} from "@/lib/finalization/induccionOperativaPayload";
import { generateActaRef } from "@/lib/finalization/actaRef";
import {
  buildInduccionOperativaSheetMutation,
  INDUCCION_OPERATIVA_SHEET_NAME,
} from "@/lib/finalization/induccionOperativaSheet";
import {
  buildInduccionOperativaIdempotencyKey,
  buildInduccionOperativaRequestHash,
  normalizeInduccionOperativaValues,
} from "@/lib/induccionOperativa";
import { buildUsuariosRecaRowsFromInduccion } from "@/lib/usuariosReca";
import { upsertUsuariosRecaRows } from "@/lib/usuariosRecaServer";
import { induccionOperativaFinalizeRequestSchema } from "@/lib/validations/induccionOperativa";

const PAYLOAD_SOURCE = "form_web";
export const maxDuration = 60;

export async function POST(request: Request) {
  const profiler = createFinalizationProfiler("induccion-operativa");
  let supabaseClient: Awaited<ReturnType<typeof createClient>> | null = null;
  let finalizationRequestContext:
    | {
        idempotencyKey: string;
        userId: string;
      }
    | null = null;
  let finalizationStage = "request.parse_json";
  let crossedPersistenceBoundary = false;
  let finalizationPrewarmContext: {
    prewarmStatus?: string | null;
    prewarmReused?: boolean | null;
    prewarmStructureSignature?: string | null;
  } | null = null;
  let finalizationExternalArtifacts: FinalizationExternalArtifacts | null = null;

  try {
    const body = await request.json();
    profiler.mark("request.parse_json");
    const parsed = induccionOperativaFinalizeRequestSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue?.message ?? "Datos invalidos" },
        { status: 400 }
      );
    }

    const { empresa, formData, finalization_identity: finalizationIdentity } =
      parsed.data;
    const empresaRecord = toEmpresaRecord(empresa);
    const normalizedFormData = normalizeInduccionOperativaValues(
      formData,
      empresaRecord
    );
    logNormalizationAudit({
      formSlug: "induccion-operativa",
      before: formData,
      after: normalizedFormData,
      source: "induccion-operativa.finalization_request",
    });

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

    const sessionResult =
      typeof supabaseClient.auth.getSession === "function"
        ? await supabaseClient.auth.getSession()
        : { data: { session: null }, error: null };
    profiler.mark("auth.get_session");

    const textReview = await reviewFinalizationText({
      formSlug: "induccion-operativa",
      accessToken: sessionResult.data.session?.access_token ?? "",
      value: normalizedFormData,
    });
    profiler.mark(`text_review.${textReview.status}`);

    if (textReview.status === "failed") {
      console.warn("[induccion_operativa.text_review] failed", {
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
    const requestHash = buildInduccionOperativaRequestHash(normalizedFormData);
    const identityKey = getFinalizationIdentityKey(finalizationIdentity);
    const idempotencyKey = buildInduccionOperativaIdempotencyKey({
      userId: user.id,
      identity: finalizationIdentity,
      requestHash,
    });
    const requestDecision = await (async () => {
      try {
        return await beginFinalizationRequest({
          supabase: finalizationRequestsSupabase,
          idempotencyKey,
          formSlug: "induccion-operativa",
          userId: user.id,
          identityKey,
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
    const recoveryDecision = await resolveFinalizationRecoveryDecision({
      supabase:
        supabaseClient as unknown as Parameters<
          typeof resolveFinalizationRecoveryDecision
        >[0]["supabase"],
      requestRow: requestDecision.row,
      formSlug: "induccion-operativa",
      idempotencyKey,
      userId: user.id,
      source: "induccion_operativa.finalization_request",
      ...buildFinalizationProfilerPersistence({ profiler }),
      prewarmStatus: null,
      prewarmReused: null,
      prewarmStructureSignature: null,
    });

    if (recoveryDecision.kind === "replay") {
      return NextResponse.json(recoveryDecision.responsePayload);
    }

    if (recoveryDecision.kind === "resume") {
      finalizationExternalArtifacts = recoveryDecision.externalArtifacts;
      finalizationPrewarmContext = {
        prewarmStatus: finalizationExternalArtifacts.prewarmStatus,
        prewarmReused: finalizationExternalArtifacts.prewarmReused,
        prewarmStructureSignature:
          finalizationExternalArtifacts.prewarmStructureSignature,
      };
    }
    let currentExternalStage =
      recoveryDecision.kind === "resume" ? recoveryDecision.externalStage : null;
    const { runGoogleStep, runGoogleStepWithoutRetry } = createGoogleStepRunner({
      markStage,
      profiler,
    });
    const now = new Date();
    const registroId = crypto.randomUUID();
    const actaRef = finalizationExternalArtifacts?.actaRef ?? generateActaRef();

    const empresaNombre = empresa.nombre_empresa;
    const sanitizedEmpresa = sanitizeFileName(empresaNombre);
    const finalDocumentBaseName = buildFinalDocumentBaseName({
      formSlug: "induccion-operativa",
      formData: reviewedFormData,
    });
    const pdfBaseName = finalDocumentBaseName;
    const finalizationSpreadsheetSupabase =
      supabaseClient as unknown as FinalizationSpreadsheetSupabaseClient;

    const section1Data = buildSection1Data(empresaRecord, normalizedFormData);
    const meaningfulAsistentes = normalizePayloadAsistentes(
      normalizedFormData.asistentes
    );
    const mutation = {
      ...buildInduccionOperativaSheetMutation({
        section1Data,
        formData: reviewedFormData,
        asistentes: meaningfulAsistentes,
      }),
      footerActaRefs: [
        {
          sheetName: INDUCCION_OPERATIVA_SHEET_NAME,
          actaRef,
        },
      ],
    };
    const prewarmHint = buildPrewarmHintForForm({
      formSlug: "induccion-operativa",
      formData: {
        ...normalizedFormData,
        asistentes: meaningfulAsistentes,
      },
      provisionalName: buildDraftSpreadsheetProvisionalName({
        formSlug: "induccion-operativa",
        draftId: finalizationIdentity.draft_id,
        localDraftSessionId: finalizationIdentity.local_draft_session_id,
      }),
    });
    let preparedSpreadsheet:
      | Awaited<
          ReturnType<typeof prepareFinalizationSpreadsheetPipeline>
        >["preparedSpreadsheet"]
      | null = null;
    let sealAfterPersistence:
      | Awaited<
          ReturnType<typeof prepareFinalizationSpreadsheetPipeline>
        >["sealAfterPersistence"]
      | null = null;

    if (!finalizationExternalArtifacts) {
      const spreadsheetPipeline = await prepareFinalizationSpreadsheetPipeline({
        supabase: finalizationSpreadsheetSupabase,
        userId: user.id,
        formSlug: "induccion-operativa",
        masterTemplateId,
        sheetsFolderId,
        empresaNombre,
        identity: finalizationIdentity,
        hint: prewarmHint,
        fallbackSpreadsheetName: empresaNombre,
        activeSheetName: INDUCCION_OPERATIVA_SHEET_NAME,
        mutation,
        runGoogleStep,
        markStage,
        tracker: profiler,
        logPrefix: "induccion-operativa",
      });
      preparedSpreadsheet = spreadsheetPipeline.preparedSpreadsheet;
      sealAfterPersistence = spreadsheetPipeline.sealAfterPersistence;
      finalizationPrewarmContext = spreadsheetPipeline.trackingContext;
      if (!preparedSpreadsheet) {
        throw new Error("No se pudo preparar el spreadsheet de finalizacion.");
      }

      finalizationExternalArtifacts = buildFinalizationExternalArtifacts({
        preparedSpreadsheet: preparedSpreadsheet!,
        actaRef,
        footerActaRefs: mutation.footerActaRefs ?? [],
      });
      await persistFinalizationExternalArtifacts({
        supabase: finalizationRequestsSupabase,
        idempotencyKey,
        userId: user.id,
        stage: "spreadsheet.prepared",
        artifacts: finalizationExternalArtifacts,
      });
      currentExternalStage = "spreadsheet.prepared";
    }

    {
      const mutationResume = await ensureFinalizationSheetMutationApplied({
        resumeFromPersistedArtifacts: recoveryDecision.kind === "resume",
        currentExternalStage,
        artifacts: finalizationExternalArtifacts,
        mutation,
        onSheetStep: profiler.mark,
        runGoogleStep,
        persistArtifacts: (stage, artifacts) =>
          persistFinalizationExternalArtifacts({
            supabase: finalizationRequestsSupabase,
            idempotencyKey,
            userId: user.id,
            stage,
            artifacts,
          }),
        profiler,
      });
      finalizationExternalArtifacts = mutationResume.artifacts;
      currentExternalStage = mutationResume.externalStage;
    }

    const { sheetLink, spreadsheetId, companyFolderId } =
      finalizationExternalArtifacts;
    let pdfLink = finalizationExternalArtifacts.pdfLink ?? null;

    if (!pdfLink) {
      const pdfEmpresaFolderId = await runGoogleStep(
        "drive.resolve_pdf_folder",
        () => getOrCreateFolder(pdfFolderId, sanitizedEmpresa)
      );
      const pdfBytes = await runGoogleStep("drive.export_pdf", () =>
        exportSheetToPdf(spreadsheetId)
      );
      const uploadResult = await runGoogleStepWithoutRetry(
        "drive.upload_pdf",
        () => uploadPdf(pdfBytes, `${pdfBaseName}.pdf`, pdfEmpresaFolderId)
      );
      pdfLink = uploadResult.webViewLink;
      finalizationExternalArtifacts = {
        ...finalizationExternalArtifacts,
        pdfLink,
      };
      await persistFinalizationExternalArtifacts({
        supabase: finalizationRequestsSupabase,
        idempotencyKey,
        userId: user.id,
        stage: "drive.upload_pdf",
        artifacts: finalizationExternalArtifacts,
      });
    }

    const {
      payloadRaw,
      payloadNormalized: basePayloadNormalized,
      payloadMetadata,
    } = buildInduccionOperativaCompletionPayloads({
      actaRef,
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
        getOrCreateFolder(companyFolderId, RAW_PAYLOADS_FOLDER_NAME)
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
      console.error("[induccion_operativa.raw_payload_upload] failed", {
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
        formSlug: "induccion-operativa",
        identity: finalizationIdentity,
        requestHash,
        idempotencyKey,
      })
    );

    await markStage("supabase.insert_finalized");
    const { error: insertError } = await supabaseClient
      .from("formatos_finalizados_il")
      .insert(
        buildFinalizedRecordInsert({
          registroId,
          actaRef,
          usuarioLogin: finalizationUser.usuarioLogin,
          nombreUsuario: finalizationUser.nombreUsuario,
          nombreFormato: INDUCCION_OPERATIVA_FORM_NAME,
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
    crossedPersistenceBoundary = true;
    await markStage(POST_PERSISTENCE_CONFIRMATION_STAGE);

    await markStage("supabase.sync_usuarios_reca");
    try {
      await upsertUsuariosRecaRows(
        buildUsuariosRecaRowsFromInduccion(
          normalizedFormData.vinculado,
          section1Data
        )
      );
      profiler.mark("supabase.sync_usuarios_reca");
    } catch (syncError) {
      void markStage("supabase.sync_usuarios_reca_failed").catch(
        (stageError) => {
          console.error("[induccion_operativa.sync_usuarios_reca_stage] failed", {
            stageError,
          });
        }
      );
      profiler.mark("supabase.sync_usuarios_reca_failed");
      console.error(
        "[induccion_operativa.usuarios_reca_sync] failed (non-fatal)",
        syncError
      );
    }

    const responsePayload: FinalizationSuccessResponse = {
      success: true,
      sheetLink,
      pdfLink,
    };

    if (sealAfterPersistence) {
      await sealAfterPersistence({
        supabase: finalizationSpreadsheetSupabase,
        userId: user.id,
        identity: finalizationIdentity,
        hint: prewarmHint,
        finalDocumentBaseName,
      });
    } else {
      await sealPreparedSpreadsheetAfterPersistence({
        supabase: finalizationSpreadsheetSupabase,
        userId: user.id,
        identity: finalizationIdentity,
        preparedSpreadsheet:
          buildPreparedSpreadsheetFromExternalArtifacts(
            finalizationExternalArtifacts
          ),
        hint: prewarmHint,
        finalDocumentBaseName,
      });
    }

    await markFinalizationRequestSucceededSafely({
      supabase: finalizationRequestsSupabase,
      idempotencyKey,
      userId: user.id,
      stage: "succeeded",
      responsePayload,
      source: "induccion_operativa.finalization_request",
      ...buildFinalizationProfilerPersistence({ profiler }),
      prewarmStatus: finalizationExternalArtifacts.prewarmStatus,
      prewarmReused: finalizationExternalArtifacts.prewarmReused,
      prewarmStructureSignature:
        finalizationExternalArtifacts.prewarmStructureSignature,
    });

    profiler.finish({
      spreadsheetReused:
        preparedSpreadsheet?.reusedSpreadsheet ??
        finalizationExternalArtifacts.prewarmReused,
      writes: mutation.writes.length,
      asistentes: meaningfulAsistentes.length,
      targetSheetName: finalizationExternalArtifacts.activeSheetName,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    const failedPrewarmContext = getFinalizationPrewarmErrorContext(error);
    if (failedPrewarmContext) {
      finalizationPrewarmContext = {
        ...finalizationPrewarmContext,
        ...failedPrewarmContext,
      };
    }

    if (crossedPersistenceBoundary && finalizationRequestContext && supabaseClient) {
      try {
        const recoveredResponse = await recoverPersistedFinalizationResponse({
          supabase:
            supabaseClient as unknown as Parameters<
              typeof recoverPersistedFinalizationResponse
            >[0]["supabase"],
          formSlug: "induccion-operativa",
          idempotencyKey: finalizationRequestContext.idempotencyKey,
          userId: finalizationRequestContext.userId,
          source: "induccion_operativa.finalization_request",
          ...buildFinalizationProfilerPersistence({ profiler }),
          prewarmStatus: finalizationPrewarmContext?.prewarmStatus,
          prewarmReused: finalizationPrewarmContext?.prewarmReused,
          prewarmStructureSignature:
            finalizationPrewarmContext?.prewarmStructureSignature,
        });

        if (recoveredResponse) {
          console.info(
            "[induccion_operativa.finalization_request] post_persist_recovery_succeeded",
            {
              formSlug: "induccion-operativa",
              idempotencyKey: finalizationRequestContext.idempotencyKey,
              userId: finalizationRequestContext.userId,
              stage: finalizationStage,
            }
          );
          profiler.finish({
            postPersistRecovered: true,
            recoveryStage: finalizationStage,
          });
          return NextResponse.json(recoveredResponse);
        }

        console.warn(
          "[induccion_operativa.finalization_request] post_persist_recovery_pending",
          {
            formSlug: "induccion-operativa",
            idempotencyKey: finalizationRequestContext.idempotencyKey,
            userId: finalizationRequestContext.userId,
            stage: finalizationStage,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      } catch (recoveryError) {
        console.error(
          "[induccion_operativa.finalization_request] post_persist_recovery_failed",
          {
            formSlug: "induccion-operativa",
            idempotencyKey: finalizationRequestContext.idempotencyKey,
            userId: finalizationRequestContext.userId,
            stage: finalizationStage,
            error: error instanceof Error ? error.message : String(error),
            recoveryError,
          }
        );
      }

      profiler.fail(error, {
        postPersistRecoveryPending: true,
        recoveryStage: finalizationStage,
      });
      return NextResponse.json(
        buildFinalizationRecoverableBody({
          stage: finalizationStage,
        }),
        { status: 409 }
      );
    }

    if (supabaseClient && finalizationRequestContext) {
      await markFinalizationRequestFailedSafely({
        supabase:
          supabaseClient as unknown as FinalizationRequestsSupabaseClient,
        idempotencyKey: finalizationRequestContext.idempotencyKey,
        userId: finalizationRequestContext.userId,
        stage: finalizationStage,
        errorMessage:
          error instanceof Error
            ? error.message
            : "No se pudo finalizar el formulario.",
        source: "induccion_operativa.finalization_request",
        ...buildFinalizationProfilerPersistence({ profiler }),
        prewarmStatus: finalizationPrewarmContext?.prewarmStatus,
        prewarmReused: finalizationPrewarmContext?.prewarmReused,
        prewarmStructureSignature:
          finalizationPrewarmContext?.prewarmStructureSignature,
      });
    }

    console.error("[induccion_operativa.finalize] failed", error);
    return NextResponse.json(
      buildFinalizationRouteErrorBody({
        stage: finalizationStage,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo finalizar el formulario.",
      }),
      {
        status:
          failedPrewarmContext?.prewarmStatus === "inline_skipped_low_budget"
            ? 503
            : 500,
      }
    );
  }
}
