import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyFormSheetMutation, type CellWrite } from "@/lib/google/sheets";
import {
  buildRawPayloadFileName,
  getOrCreateFolder,
  RAW_PAYLOADS_FOLDER_NAME,
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
  buildFinalizationIdempotencyKey,
  buildFinalizationRequestHash,
  type FinalizationSuccessResponse,
} from "@/lib/finalization/idempotency";
import { getFinalizationIdentityKey } from "@/lib/finalization/idempotencyCore";
import { buildFinalizedRecordInsert } from "@/lib/finalization/finalizedRecord";
import {
  buildPersistedFinalizationMetadata,
  withPersistedFinalizationMetadata,
} from "@/lib/finalization/finalizationStatus";
import { withGoogleRetry } from "@/lib/finalization/googleRetry";
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
} from "@/lib/finalization/persistedRecovery";
import {
  FINALIZATION_IN_PROGRESS_CODE,
  type FinalizationRequestsSupabaseClient,
  beginFinalizationRequest,
  markFinalizationRequestStage,
} from "@/lib/finalization/requests";
import {
  buildSensibilizacionCompletionPayloads,
  SENSIBILIZACION_FORM_NAME,
} from "@/lib/finalization/sensibilizacionPayload";
import { generateActaRef } from "@/lib/finalization/actaRef";
import { getFinalizationUserIdentity } from "@/lib/finalization/finalizationUser";
import { createFinalizationProfiler } from "@/lib/finalization/profiler";
import { reviewFinalizationText } from "@/lib/finalization/textReview";
import { getEmpresaSedeCompensarValue } from "@/lib/empresaFields";
import {
  buildDraftSpreadsheetProvisionalName,
  buildFinalDocumentBaseName,
} from "@/lib/finalization/documentNaming";
import {
  buildFinalizationProfilerPersistence,
  type FinalizationSpreadsheetSupabaseClient,
  getFinalizationPrewarmErrorContext,
  prepareFinalizationSpreadsheetPipeline,
} from "@/lib/finalization/finalizationSpreadsheet";
import { buildPrewarmHintForForm } from "@/lib/finalization/prewarmRegistry";
import {
  SENSIBILIZACION_ATTENDEES_BASE_ROWS,
  SENSIBILIZACION_ATTENDEES_CARGO_COL,
  SENSIBILIZACION_ATTENDEES_NAME_COL,
  SENSIBILIZACION_ATTENDEES_START_ROW,
  SENSIBILIZACION_OBSERVACIONES_CELL,
  SENSIBILIZACION_SHEET_NAME,
} from "@/lib/finalization/sensibilizacionSheet";
import { sensibilizacionFinalizeRequestSchema } from "@/lib/validations/finalization";

const PAYLOAD_SOURCE = "form_web";
export const maxDuration = 60;

const SECTION_1_MAP: Record<string, string> = {
  fecha_visita: "D7",
  modalidad: "N7",
  nombre_empresa: "D8",
  ciudad_empresa: "N8",
  direccion_empresa: "D9",
  nit_empresa: "N9",
  correo_1: "D10",
  telefono_empresa: "N10",
  contacto_empresa: "D11",
  cargo: "N11",
  asesor: "D12",
  sede_empresa: "N12",
};

function cellRef(cell: string) {
  return `'${SENSIBILIZACION_SHEET_NAME}'!${cell}`;
}

export async function POST(request: Request) {
  const profiler = createFinalizationProfiler("sensibilizacion");
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

  try {
    const body = await request.json();
    profiler.mark("request.parse_json");
    const parsed = sensibilizacionFinalizeRequestSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { empresa, finalization_identity: finalizationIdentity, ...formData } =
      parsed.data;

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
      formSlug: "sensibilizacion",
      accessToken: sessionResult.data.session?.access_token ?? "",
      value: formData,
    });
    profiler.mark(`text_review.${textReview.status}`);

    if (textReview.status === "failed") {
      console.warn("[sensibilizacion.text_review] failed", {
        reason: textReview.reason,
      });
    }

    const reviewedFormData = textReview.value;

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

    const requestHash = buildFinalizationRequestHash(
      "sensibilizacion",
      formData as Record<string, unknown>
    );
    const identityKey = getFinalizationIdentityKey(finalizationIdentity);
    const idempotencyKey = buildFinalizationIdempotencyKey({
      formSlug: "sensibilizacion",
      userId: user.id,
      identity: finalizationIdentity,
      requestHash,
    });
    const requestDecision = await (async () => {
      try {
        return await beginFinalizationRequest({
          supabase: finalizationRequestsSupabase,
          idempotencyKey,
          formSlug: "sensibilizacion",
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
    const now = new Date();
    const registroId = crypto.randomUUID();
    const actaRef = generateActaRef();

    const empresaNombre = empresa.nombre_empresa;
    const finalDocumentBaseName = buildFinalDocumentBaseName({
      formSlug: "sensibilizacion",
      formData: reviewedFormData,
    });
    const finalizationSpreadsheetSupabase =
      supabaseClient as unknown as FinalizationSpreadsheetSupabaseClient;

    const section1Data = {
      fecha_visita: formData.fecha_visita,
      modalidad: formData.modalidad,
      nombre_empresa: empresaNombre,
      ciudad_empresa: empresa.ciudad_empresa ?? "",
      direccion_empresa: empresa.direccion_empresa ?? "",
      nit_empresa: formData.nit_empresa,
      correo_1: empresa.correo_1 ?? "",
      telefono_empresa: empresa.telefono_empresa ?? "",
      contacto_empresa: empresa.contacto_empresa ?? "",
      cargo: empresa.cargo ?? "",
      asesor: empresa.asesor ?? "",
      sede_empresa: getEmpresaSedeCompensarValue(empresa),
      profesional_asignado: empresa.profesional_asignado ?? "",
      correo_profesional: empresa.correo_profesional ?? "",
      correo_asesor: empresa.correo_asesor ?? "",
      caja_compensacion: empresa.caja_compensacion ?? "",
    };

    const writes: CellWrite[] = [];

    for (const [field, cell] of Object.entries(SECTION_1_MAP)) {
      const value = section1Data[field as keyof typeof section1Data];
      if (value) {
        writes.push({ range: cellRef(cell), value });
      }
    }

    writes.push({
      range: cellRef(SENSIBILIZACION_OBSERVACIONES_CELL),
      value: reviewedFormData.observaciones,
    });

    const meaningfulAsistentes = normalizePayloadAsistentes(
      reviewedFormData.asistentes
    );

    meaningfulAsistentes.forEach((asistente, index) => {
      const row = SENSIBILIZACION_ATTENDEES_START_ROW + index;
      if (asistente.nombre) {
        writes.push({
          range: cellRef(`${SENSIBILIZACION_ATTENDEES_NAME_COL}${row}`),
          value: asistente.nombre,
        });
      }
      if (asistente.cargo) {
        writes.push({
          range: cellRef(`${SENSIBILIZACION_ATTENDEES_CARGO_COL}${row}`),
          value: asistente.cargo,
        });
      }
    });

    const extraRows = Math.max(
      0,
      meaningfulAsistentes.length - SENSIBILIZACION_ATTENDEES_BASE_ROWS
    );
    const mutation = {
      writes,
      footerActaRefs: [
        {
          sheetName: SENSIBILIZACION_SHEET_NAME,
          actaRef,
        },
      ],
      rowInsertions:
        extraRows > 0
          ? [
              {
                sheetName: SENSIBILIZACION_SHEET_NAME,
                insertAtRow:
                  SENSIBILIZACION_ATTENDEES_START_ROW +
                  SENSIBILIZACION_ATTENDEES_BASE_ROWS -
                  1,
                count: extraRows,
                templateRow:
                  SENSIBILIZACION_ATTENDEES_START_ROW +
                  SENSIBILIZACION_ATTENDEES_BASE_ROWS -
                  1,
              },
            ]
          : [],
    };
    const prewarmHint = buildPrewarmHintForForm({
      formSlug: "sensibilizacion",
      formData: {
        ...reviewedFormData,
        asistentes: meaningfulAsistentes,
      },
      provisionalName: buildDraftSpreadsheetProvisionalName({
        formSlug: "sensibilizacion",
        draftId: finalizationIdentity.draft_id,
        localDraftSessionId: finalizationIdentity.local_draft_session_id,
      }),
    });
    const spreadsheetPipeline = await prepareFinalizationSpreadsheetPipeline({
      supabase: finalizationSpreadsheetSupabase,
      userId: user.id,
      formSlug: "sensibilizacion",
      masterTemplateId,
      sheetsFolderId,
      empresaNombre,
      identity: finalizationIdentity,
      hint: prewarmHint,
      fallbackSpreadsheetName: empresaNombre,
      activeSheetName: SENSIBILIZACION_SHEET_NAME,
      mutation,
      runGoogleStep,
      markStage,
      tracker: profiler,
      logPrefix: "sensibilizacion",
    });
    const {
      preparedSpreadsheet,
      trackingContext,
      sealAfterPersistence,
    } = spreadsheetPipeline;
    finalizationPrewarmContext = trackingContext;

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
    } = buildSensibilizacionCompletionPayloads({
      actaRef,
      section1Data,
      observaciones: reviewedFormData.observaciones,
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
        getOrCreateFolder(
          preparedSpreadsheet.companyFolderId,
          RAW_PAYLOADS_FOLDER_NAME
        )
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
      console.error("[sensibilizacion.raw_payload_upload] failed", {
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
        formSlug: "sensibilizacion",
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
          nombreFormato: SENSIBILIZACION_FORM_NAME,
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

    const responsePayload: FinalizationSuccessResponse = {
      success: true,
      sheetLink,
    };

    await sealAfterPersistence({
      supabase: finalizationSpreadsheetSupabase,
      userId: user.id,
      identity: finalizationIdentity,
      hint: prewarmHint,
      finalDocumentBaseName,
    });

    await markFinalizationRequestSucceededSafely({
      supabase: finalizationRequestsSupabase,
      idempotencyKey,
      userId: user.id,
      stage: "succeeded",
      responsePayload,
      source: "sensibilizacion.finalization_request",
      ...buildFinalizationProfilerPersistence({ profiler }),
      prewarmStatus: preparedSpreadsheet.prewarmStatus,
      prewarmReused: preparedSpreadsheet.prewarmReused,
      prewarmStructureSignature: preparedSpreadsheet.prewarmStructureSignature,
    });

    profiler.finish({
      spreadsheetReused: preparedSpreadsheet.reusedSpreadsheet,
      writes: writes.length,
      asistentes: meaningfulAsistentes.length,
      targetSheetName: preparedSpreadsheet.activeSheetName,
      rawPayloadArtifactStatus: rawPayloadArtifact.status,
      textReviewStatus: textReview.status,
      textReviewReason: textReview.reason,
      textReviewReviewedCount: textReview.reviewedCount,
      textReviewModel: textReview.usage?.model,
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
          formSlug: "sensibilizacion",
          idempotencyKey: finalizationRequestContext.idempotencyKey,
          userId: finalizationRequestContext.userId,
          source: "sensibilizacion.finalization_request",
          ...buildFinalizationProfilerPersistence({ profiler }),
          prewarmStatus: finalizationPrewarmContext?.prewarmStatus,
          prewarmReused: finalizationPrewarmContext?.prewarmReused,
          prewarmStructureSignature:
            finalizationPrewarmContext?.prewarmStructureSignature,
        });

        if (recoveredResponse) {
          console.info(
            "[sensibilizacion.finalization_request] post_persist_recovery_succeeded",
            {
              formSlug: "sensibilizacion",
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
          "[sensibilizacion.finalization_request] post_persist_recovery_pending",
          {
            formSlug: "sensibilizacion",
            idempotencyKey: finalizationRequestContext.idempotencyKey,
            userId: finalizationRequestContext.userId,
            stage: finalizationStage,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      } catch (recoveryError) {
        console.error(
          "[sensibilizacion.finalization_request] post_persist_recovery_failed",
          {
            formSlug: "sensibilizacion",
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

    if (finalizationRequestContext && supabaseClient) {
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
        source: "sensibilizacion.finalization_request",
        ...buildFinalizationProfilerPersistence({ profiler }),
        prewarmStatus: finalizationPrewarmContext?.prewarmStatus,
        prewarmReused: finalizationPrewarmContext?.prewarmReused,
        prewarmStructureSignature:
          finalizationPrewarmContext?.prewarmStructureSignature,
      });
    }

    profiler.fail(error);
    console.error("Error en API sensibilizacion:", error);
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
