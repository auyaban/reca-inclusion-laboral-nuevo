import { NextResponse } from "next/server";
import { getEmpresaSedeCompensarValue } from "@/lib/empresaFields";
import { buildDraftSpreadsheetProvisionalName, buildFinalDocumentBaseName } from "@/lib/finalization/documentNaming";
import {
  buildFailedRawPayloadArtifact,
  buildUploadedRawPayloadArtifact,
  normalizePayloadAsistentes,
  type RawPayloadArtifact,
  withRawPayloadArtifact,
} from "@/lib/finalization/payloads";
import {
  buildFinalizationProfilerPersistence,
  buildPreparedSpreadsheetFromExternalArtifacts,
  type FinalizationSpreadsheetSupabaseClient,
  getFinalizationPrewarmErrorContext,
  prepareFinalizationSpreadsheetPipeline,
  sealPreparedSpreadsheetAfterPersistence,
} from "@/lib/finalization/finalizationSpreadsheet";
import {
  buildFinalizationRouteErrorBody,
  buildFinalizationClaimExhaustedBody,
  buildFinalizationInProgressBody,
  buildFinalizationRecoverableBody,
  getFinalizationClaimExhaustedRetryAfterSeconds,
  isFinalizationClaimExhaustedError,
  markFinalizationRequestFailedSafely,
  markFinalizationRequestSucceededSafely,
} from "@/lib/finalization/finalizationFeedback";
import { buildFinalizedRecordInsert } from "@/lib/finalization/finalizedRecord";
import {
  buildPersistedFinalizationMetadata,
  withPersistedFinalizationMetadata,
} from "@/lib/finalization/finalizationStatus";
import {
  INTERPRETE_LSC_FORM_NAME,
  buildInterpreteLscCompletionPayloads,
  type InterpreteLscSection1Data,
} from "@/lib/finalization/interpreteLscPayload";
import {
  INTERPRETE_LSC_SHEET_NAME,
  buildInterpreteLscSheetMutation,
} from "@/lib/finalization/interpreteLscSheet";
import {
  buildFinalizationIdempotencyKey,
  buildFinalizationRequestHash,
  type FinalizationSuccessResponse,
} from "@/lib/finalization/idempotency";
import { getFinalizationIdentityKey } from "@/lib/finalization/idempotencyCore";
import {
  FINALIZATION_IN_PROGRESS_CODE,
  buildFinalizationExternalArtifacts,
  hasReachedFinalizationExternalStage,
  markFinalizationExternalArtifactsHiddenSheetsApplied,
  persistFinalizationExternalArtifacts,
  type FinalizationExternalArtifacts,
  type FinalizationRequestsSupabaseClient,
  beginFinalizationRequest,
  markFinalizationRequestStage,
} from "@/lib/finalization/requests";
import {
  POST_PERSISTENCE_CONFIRMATION_STAGE,
  recoverPersistedFinalizationResponse,
  resolveFinalizationRecoveryDecision,
} from "@/lib/finalization/persistedRecovery";
import { buildPrewarmHintForForm } from "@/lib/finalization/prewarmRegistry";
import { createFinalizationProfiler } from "@/lib/finalization/profiler";
import {
  createGoogleStepRunner,
  ensureFinalizationSheetMutationApplied,
  logNormalizationAudit,
  toEmpresaRecord,
} from "@/lib/finalization/routeHelpers";
import { resolveFinalizationTemplateId } from "@/lib/finalization/templateResolution";
import { generateActaRef } from "@/lib/finalization/actaRef";
import { getFinalizationUserIdentity } from "@/lib/finalization/finalizationUser";
import {
  buildRawPayloadFileName,
  exportSheetToPdf,
  getOrCreateFolder,
  RAW_PAYLOADS_FOLDER_NAME,
  sanitizeFileName,
  uploadJsonArtifact,
  uploadPdf,
} from "@/lib/google/drive";
import { hideSheets } from "@/lib/google/sheets";
import {
  countMeaningfulInterpreteLscAsistentes,
  countMeaningfulInterpreteLscInterpretes,
  countMeaningfulInterpreteLscOferentes,
  normalizeInterpreteLscValues,
} from "@/lib/interpreteLsc";
import { createClient } from "@/lib/supabase/server";
import { interpreteLscSchema } from "@/lib/validations/interpreteLsc";
import { interpreteLscFinalizeRequestSchema } from "@/lib/validations/finalization";

const PAYLOAD_SOURCE = "form_web";

export const maxDuration = 60;

function buildInterpreteLscSection1Data(
  empresaRecord: ReturnType<typeof toEmpresaRecord>,
  formData: ReturnType<typeof normalizeInterpreteLscValues>
): InterpreteLscSection1Data {
  return {
    fecha_visita: formData.fecha_visita,
    modalidad_interprete: formData.modalidad_interprete,
    modalidad_profesional_reca: formData.modalidad_profesional_reca,
    nombre_empresa: empresaRecord.nombre_empresa,
    ciudad_empresa: empresaRecord.ciudad_empresa ?? "",
    direccion_empresa: empresaRecord.direccion_empresa ?? "",
    nit_empresa: formData.nit_empresa,
    contacto_empresa: empresaRecord.contacto_empresa ?? "",
    cargo: empresaRecord.cargo ?? "",
    asesor: empresaRecord.asesor ?? "",
    sede_empresa: getEmpresaSedeCompensarValue(empresaRecord),
    profesional_asignado: empresaRecord.profesional_asignado ?? "",
    correo_profesional: empresaRecord.correo_profesional ?? "",
    correo_asesor: empresaRecord.correo_asesor ?? "",
    caja_compensacion: empresaRecord.caja_compensacion ?? "",
  };
}

export async function POST(request: Request) {
  const profiler = createFinalizationProfiler("interprete-lsc");
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
    const parsed = interpreteLscFinalizeRequestSchema.safeParse(body);

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
    const normalizedFormData = normalizeInterpreteLscValues(formData, empresaRecord);
    const normalizedValidation = interpreteLscSchema.safeParse(normalizedFormData);

    if (!normalizedValidation.success) {
      const issue = normalizedValidation.error.issues[0];
      return NextResponse.json(
        { error: issue?.message ?? "Datos invalidos" },
        { status: 400 }
      );
    }
    const canonicalFormData = normalizedValidation.data;
    logNormalizationAudit({
      formSlug: "interprete-lsc",
      before: formData,
      after: canonicalFormData,
      source: "interprete-lsc.finalization_request",
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

    const masterTemplateId = resolveFinalizationTemplateId("interprete-lsc");
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
      "interprete-lsc",
      canonicalFormData as unknown as Record<string, unknown>
    );
    const identityKey = getFinalizationIdentityKey(finalizationIdentity);
    const idempotencyKey = buildFinalizationIdempotencyKey({
      formSlug: "interprete-lsc",
      userId: user.id,
      identity: finalizationIdentity,
      requestHash,
    });
    const requestDecision = await (async () => {
      try {
        return await beginFinalizationRequest({
          supabase: finalizationRequestsSupabase,
          idempotencyKey,
          formSlug: "interprete-lsc",
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
      formSlug: "interprete-lsc",
      idempotencyKey,
      userId: user.id,
      source: "interprete-lsc.finalization_request",
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
      formSlug: "interprete-lsc",
      formData: canonicalFormData,
    });
    const finalizationSpreadsheetSupabase =
      supabaseClient as unknown as FinalizationSpreadsheetSupabaseClient;

    const section1Data = buildInterpreteLscSection1Data(
      empresaRecord,
      canonicalFormData
    );
    const meaningfulAsistentes = normalizePayloadAsistentes(
      canonicalFormData.asistentes
    );
    const finalizationFormData: ReturnType<typeof normalizeInterpreteLscValues> = {
      ...canonicalFormData,
      asistentes: meaningfulAsistentes,
    };
    const mutation = {
      ...buildInterpreteLscSheetMutation({
        section1Data,
        formData: finalizationFormData,
      }),
      footerActaRefs: [
        {
          sheetName: INTERPRETE_LSC_SHEET_NAME,
          actaRef,
        },
      ],
    };

    const prewarmHint = buildPrewarmHintForForm({
      formSlug: "interprete-lsc",
      formData: finalizationFormData,
      provisionalName: buildDraftSpreadsheetProvisionalName({
        formSlug: "interprete-lsc",
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
        formSlug: "interprete-lsc",
        masterTemplateId,
        sheetsFolderId,
        empresaNombre,
        identity: finalizationIdentity,
        hint: prewarmHint,
        fallbackSpreadsheetName: empresaNombre,
        activeSheetName: INTERPRETE_LSC_SHEET_NAME,
        mutation,
        runGoogleStep,
        markStage,
        tracker: profiler,
        logPrefix: "interprete-lsc",
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

    if (
      !hasReachedFinalizationExternalStage(
        currentExternalStage,
        "spreadsheet.hide_unused_sheets_done"
      )
    ) {
      if (!finalizationExternalArtifacts) {
        throw new Error(
          "No se pudo recuperar el spreadsheet antes de ocultar hojas."
        );
      }
      const artifactsForHide = finalizationExternalArtifacts;
      await runGoogleStep(
        "spreadsheet.hide_unused_sheets",
        () =>
          hideSheets(artifactsForHide.spreadsheetId, [artifactsForHide.activeSheetName]),
        "spreadsheet.hide_unused_sheets_done"
      );
      finalizationExternalArtifacts =
        markFinalizationExternalArtifactsHiddenSheetsApplied(
          finalizationExternalArtifacts
        );
      await persistFinalizationExternalArtifacts({
        supabase: finalizationRequestsSupabase,
        idempotencyKey,
        userId: user.id,
        stage: "spreadsheet.hide_unused_sheets_done",
        artifacts: finalizationExternalArtifacts,
      });
      currentExternalStage = "spreadsheet.hide_unused_sheets_done";
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
        () => uploadPdf(pdfBytes, `${finalDocumentBaseName}.pdf`, pdfEmpresaFolderId)
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
    } = buildInterpreteLscCompletionPayloads({
      actaRef,
      section1Data,
      formData: finalizationFormData,
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
      console.error("[interprete-lsc.raw_payload_upload] failed", {
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
        formSlug: "interprete-lsc",
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
          nombreFormato: INTERPRETE_LSC_FORM_NAME,
          nombreEmpresa: empresaNombre,
          pathFormato: sheetLink,
          payloadRaw,
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
      source: "interprete-lsc.finalization_request",
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
      oferentes: countMeaningfulInterpreteLscOferentes(canonicalFormData.oferentes),
      interpretes: countMeaningfulInterpreteLscInterpretes(
        canonicalFormData.interpretes
      ),
      asistentes: countMeaningfulInterpreteLscAsistentes(meaningfulAsistentes),
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
          formSlug: "interprete-lsc",
          idempotencyKey: finalizationRequestContext.idempotencyKey,
          userId: finalizationRequestContext.userId,
          source: "interprete-lsc.finalization_request",
          ...buildFinalizationProfilerPersistence({ profiler }),
          prewarmStatus: finalizationPrewarmContext?.prewarmStatus,
          prewarmReused: finalizationPrewarmContext?.prewarmReused,
          prewarmStructureSignature:
            finalizationPrewarmContext?.prewarmStructureSignature,
        });

        if (recoveredResponse) {
          console.info(
            "[interprete-lsc.finalization_request] post_persist_recovery_succeeded",
            {
              formSlug: "interprete-lsc",
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
          "[interprete-lsc.finalization_request] post_persist_recovery_pending",
          {
            formSlug: "interprete-lsc",
            idempotencyKey: finalizationRequestContext.idempotencyKey,
            userId: finalizationRequestContext.userId,
            stage: finalizationStage,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      } catch (recoveryError) {
        console.error(
          "[interprete-lsc.finalization_request] post_persist_recovery_failed",
          {
            formSlug: "interprete-lsc",
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
        source: "interprete-lsc.finalization_request",
        ...buildFinalizationProfilerPersistence({ profiler }),
        prewarmStatus: finalizationPrewarmContext?.prewarmStatus,
        prewarmReused: finalizationPrewarmContext?.prewarmReused,
        prewarmStructureSignature:
          finalizationPrewarmContext?.prewarmStructureSignature,
      });
    }

    console.error("[interprete-lsc.finalize] failed", error);
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
