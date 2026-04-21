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
  buildCondicionesVacanteRequestHash,
  buildFinalizationIdempotencyKey,
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
  buildCondicionesVacanteCompletionPayloads,
  CONDICIONES_VACANTE_FORM_NAME,
  type CondicionesVacanteSection1Data,
} from "@/lib/finalization/condicionesVacantePayload";
import { generateActaRef } from "@/lib/finalization/actaRef";
import {
  buildCondicionesVacanteSheetMutation,
  CONDICIONES_VACANTE_SHEET_NAME,
} from "@/lib/finalization/condicionesVacanteSheet";
import { getFinalizationUserIdentity } from "@/lib/finalization/finalizationUser";
import { createFinalizationProfiler } from "@/lib/finalization/profiler";
import { reviewFinalizationText } from "@/lib/finalization/textReview";
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
import { normalizeCondicionesVacanteValues } from "@/lib/condicionesVacante";
import { getEmpresaSedeCompensarValue } from "@/lib/empresaFields";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  condicionesVacanteFinalizeRequestSchema,
  type EmpresaPayload,
} from "@/lib/validations/finalization";

const PAYLOAD_SOURCE = "form_web";

function buildSection1Data(
  empresa: {
    nombre_empresa: string;
    ciudad_empresa?: string | null;
    direccion_empresa?: string | null;
    correo_1?: string | null;
    telefono_empresa?: string | null;
    contacto_empresa?: string | null;
    cargo?: string | null;
    caja_compensacion?: string | null;
    sede_empresa?: string | null;
    zona_empresa?: string | null;
    asesor?: string | null;
    profesional_asignado?: string | null;
    correo_profesional?: string | null;
    correo_asesor?: string | null;
  },
  formData: {
    fecha_visita: string;
    modalidad: string;
    nit_empresa: string;
  }
): CondicionesVacanteSection1Data {
  return {
    fecha_visita: formData.fecha_visita,
    modalidad: formData.modalidad,
    nombre_empresa: empresa.nombre_empresa,
    ciudad_empresa: empresa.ciudad_empresa ?? "",
    direccion_empresa: empresa.direccion_empresa ?? "",
    nit_empresa: formData.nit_empresa,
    correo_1: empresa.correo_1 ?? "",
    telefono_empresa: empresa.telefono_empresa ?? "",
    contacto_empresa: empresa.contacto_empresa ?? "",
    cargo: empresa.cargo ?? "",
    caja_compensacion: empresa.caja_compensacion ?? "",
    sede_empresa: getEmpresaSedeCompensarValue(empresa),
    asesor: empresa.asesor ?? "",
    profesional_asignado: empresa.profesional_asignado ?? "",
    correo_profesional: empresa.correo_profesional ?? "",
    correo_asesor: empresa.correo_asesor ?? "",
  };
}

function toEmpresaRecord(empresa: EmpresaPayload): Empresa {
  return {
    id: empresa.id,
    nombre_empresa: empresa.nombre_empresa,
    nit_empresa: empresa.nit_empresa ?? null,
    direccion_empresa: empresa.direccion_empresa ?? null,
    ciudad_empresa: empresa.ciudad_empresa ?? null,
    sede_empresa: empresa.sede_empresa ?? null,
    zona_empresa: empresa.zona_empresa ?? null,
    correo_1: empresa.correo_1 ?? null,
    contacto_empresa: empresa.contacto_empresa ?? null,
    telefono_empresa: empresa.telefono_empresa ?? null,
    cargo: empresa.cargo ?? null,
    profesional_asignado: empresa.profesional_asignado ?? null,
    correo_profesional: empresa.correo_profesional ?? null,
    asesor: empresa.asesor ?? null,
    correo_asesor: empresa.correo_asesor ?? null,
    caja_compensacion: empresa.caja_compensacion ?? null,
  };
}

export async function POST(request: Request) {
  const profiler = createFinalizationProfiler("condiciones-vacante");
  let supabaseClient: Awaited<ReturnType<typeof createClient>> | null = null;
  let finalizationRequestContext:
    | {
        idempotencyKey: string;
        userId: string;
      }
    | null = null;
  let finalizationStage = "request.parse_json";
  let finalizationPrewarmContext: {
    prewarmStatus?: string | null;
    prewarmReused?: boolean | null;
    prewarmStructureSignature?: string | null;
  } | null = null;

  try {
    const body = await request.json();
    profiler.mark("request.parse_json");
    const parsed = condicionesVacanteFinalizeRequestSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const {
      empresa,
      formData,
      finalization_identity: finalizationIdentity,
    } = parsed.data;
    const empresaRecord = toEmpresaRecord(empresa);
    const normalizedFormData = normalizeCondicionesVacanteValues(
      formData,
      empresaRecord
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

    const finalizationUser = await getFinalizationUserIdentity(user);
    profiler.mark("auth.resolve_usuario_login");

    const sessionResult =
      typeof supabaseClient.auth.getSession === "function"
        ? await supabaseClient.auth.getSession()
        : { data: { session: null }, error: null };
    profiler.mark("auth.get_session");

    const textReview = await reviewFinalizationText({
      formSlug: "condiciones-vacante",
      accessToken: sessionResult.data.session?.access_token ?? "",
      value: normalizedFormData,
    });
    profiler.mark(`text_review.${textReview.status}`);

    if (textReview.status === "failed") {
      console.warn("[condiciones_vacante.text_review] failed", {
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
    const requestHash = buildCondicionesVacanteRequestHash(normalizedFormData);
    const identityKey = getFinalizationIdentityKey(finalizationIdentity);
    const idempotencyKey = buildFinalizationIdempotencyKey({
      formSlug: "condiciones-vacante",
      userId: user.id,
      identity: finalizationIdentity,
      requestHash,
    });
    const requestDecision = await (async () => {
      try {
        return await beginFinalizationRequest({
          supabase: finalizationRequestsSupabase,
          idempotencyKey,
          formSlug: "condiciones-vacante",
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

    const runGoogleStepWithoutRetry = async <T>(
      stage: string,
      operation: () => Promise<T>,
      successLabel = stage
    ) => {
      await markStage(stage);
      const result = await operation();
      profiler.mark(successLabel);
      return result;
    };

    const empresaNombre = empresa.nombre_empresa;
    const now = new Date();
    const registroId = crypto.randomUUID();
    const actaRef = generateActaRef();
    const sanitizedEmpresa = sanitizeFileName(empresaNombre);
    const finalDocumentBaseName = buildFinalDocumentBaseName({
      formSlug: "condiciones-vacante",
      formData: reviewedFormData,
    });
    const pdfBaseName = finalDocumentBaseName;
    const finalizationSpreadsheetSupabase =
      supabaseClient as unknown as FinalizationSpreadsheetSupabaseClient;

    const section1Data = buildSection1Data(empresa, reviewedFormData);
    const meaningfulAsistentes = normalizePayloadAsistentes(
      reviewedFormData.asistentes
    );
    const mutation = {
      ...buildCondicionesVacanteSheetMutation({
        section1Data,
        formData: reviewedFormData,
        asistentes: meaningfulAsistentes,
      }),
      footerActaRefs: [
        {
          sheetName: CONDICIONES_VACANTE_SHEET_NAME,
          actaRef,
        },
      ],
    };

    const prewarmHint = buildPrewarmHintForForm({
      formSlug: "condiciones-vacante",
      formData: {
        ...reviewedFormData,
        asistentes: meaningfulAsistentes,
      },
      provisionalName: buildDraftSpreadsheetProvisionalName({
        formSlug: "condiciones-vacante",
        draftId: finalizationIdentity.draft_id,
        localDraftSessionId: finalizationIdentity.local_draft_session_id,
      }),
    });
    const spreadsheetPipeline = await prepareFinalizationSpreadsheetPipeline({
      supabase: finalizationSpreadsheetSupabase,
      userId: user.id,
      formSlug: "condiciones-vacante",
      masterTemplateId,
      sheetsFolderId,
      empresaNombre,
      identity: finalizationIdentity,
      hint: prewarmHint,
      fallbackSpreadsheetName: empresaNombre,
      activeSheetName: CONDICIONES_VACANTE_SHEET_NAME,
      mutation,
      runGoogleStep,
      markStage,
      tracker: profiler,
      logPrefix: "condiciones-vacante",
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
    const { sheetLink, spreadsheetId } = preparedSpreadsheet;
    const pdfBytes = await runGoogleStep("drive.export_pdf", () =>
      exportSheetToPdf(spreadsheetId)
    );
    const pdfEmpresaFolderId = await runGoogleStep(
      "drive.resolve_pdf_folder",
      () => getOrCreateFolder(pdfFolderId, sanitizedEmpresa)
    );
    const { webViewLink: pdfLink } = await runGoogleStepWithoutRetry(
      "drive.upload_pdf",
      () => uploadPdf(pdfBytes, `${pdfBaseName}.pdf`, pdfEmpresaFolderId)
    );

    const {
      payloadRaw,
      payloadNormalized: basePayloadNormalized,
      payloadMetadata,
    } = buildCondicionesVacanteCompletionPayloads({
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
      console.error("[condiciones_vacante.raw_payload_upload] failed", {
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
        formSlug: "condiciones-vacante",
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
          nombreFormato: CONDICIONES_VACANTE_FORM_NAME,
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
      source: "condiciones_vacante.finalization_request",
      ...buildFinalizationProfilerPersistence({ profiler }),
      prewarmStatus: preparedSpreadsheet.prewarmStatus,
      prewarmReused: preparedSpreadsheet.prewarmReused,
      prewarmStructureSignature: preparedSpreadsheet.prewarmStructureSignature,
    });

    profiler.finish({
      spreadsheetReused: preparedSpreadsheet.reusedSpreadsheet,
      writes: mutation.writes.length,
      asistentes: meaningfulAsistentes.length,
      discapacidades: reviewedFormData.discapacidades.filter((row) =>
        row.discapacidad.trim()
      ).length,
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
        source: "condiciones-vacante.finalization_request",
        ...buildFinalizationProfilerPersistence({ profiler }),
        prewarmStatus: finalizationPrewarmContext?.prewarmStatus,
        prewarmReused: finalizationPrewarmContext?.prewarmReused,
        prewarmStructureSignature:
          finalizationPrewarmContext?.prewarmStructureSignature,
      });
    }

    profiler.fail(error);
    console.error("Error en API condiciones vacante:", error);
    return NextResponse.json(
      buildFinalizationRouteErrorBody({
        stage: finalizationStage,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo finalizar el formulario.",
      }),
      { status: 500 }
    );
  }
}
