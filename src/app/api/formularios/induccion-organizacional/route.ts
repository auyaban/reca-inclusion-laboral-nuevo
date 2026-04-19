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
import type { FinalizationSuccessResponse } from "@/lib/finalization/idempotency";
import { getFinalizationUserIdentity } from "@/lib/finalization/finalizationUser";
import { createFinalizationProfiler } from "@/lib/finalization/profiler";
import { prepareCompanySpreadsheet } from "@/lib/google/companySpreadsheet";
import {
  buildSection1Data,
  createGoogleStepRunner,
  toEmpresaRecord,
} from "@/lib/finalization/routeHelpers";
import {
  buildInduccionOrganizacionalCompletionPayloads,
  INDUCCION_ORGANIZACIONAL_FORM_NAME,
} from "@/lib/finalization/induccionOrganizacionalPayload";
import { generateActaRef } from "@/lib/finalization/actaRef";
import {
  buildInduccionOrganizacionalSheetMutation,
  INDUCCION_ORGANIZACIONAL_SHEET_NAME,
} from "@/lib/finalization/induccionOrganizacionalSheet";
import { normalizeInduccionOrganizacionalValues } from "@/lib/induccionOrganizacional";
import { buildUsuariosRecaRowsFromInduccion } from "@/lib/usuariosReca";
import { upsertUsuariosRecaRows } from "@/lib/usuariosRecaServer";
import { induccionOrganizacionalFinalizeRequestSchema } from "@/lib/validations/induccionOrganizacional";
import {
  buildInduccionOrganizacionalIdempotencyKey,
  buildInduccionOrganizacionalRequestHash,
} from "@/lib/finalization/induccionOrganizacionalRequest";

const PAYLOAD_SOURCE = "form_web";

export async function POST(request: Request) {
  const profiler = createFinalizationProfiler("induccion-organizacional");
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
    const parsed = induccionOrganizacionalFinalizeRequestSchema.safeParse(body);

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
    const normalizedFormData = normalizeInduccionOrganizacionalValues(
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
    const requestHash =
      buildInduccionOrganizacionalRequestHash(normalizedFormData);
    const idempotencyKey = buildInduccionOrganizacionalIdempotencyKey({
      userId: user.id,
      identity: finalizationIdentity,
      requestHash,
    });
    const requestDecision = await (async () => {
      try {
        return await beginFinalizationRequest({
          supabase: finalizationRequestsSupabase,
          idempotencyKey,
          formSlug: "induccion-organizacional",
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
    const { runGoogleStep, runGoogleStepWithoutRetry } = createGoogleStepRunner({
      markStage,
      profiler,
    });
    const now = new Date();
    const registroId = crypto.randomUUID();
    const actaRef = generateActaRef();

    const empresaNombre = empresa.nombre_empresa;
    const sanitizedEmpresa = sanitizeFileName(empresaNombre);
    const spreadsheetName = sanitizedEmpresa;
    const pdfBaseName = `${sanitizedEmpresa} - Induccion Organizacional - ${normalizedFormData.fecha_visita}`;
    const empresaFolderId = await runGoogleStep("drive.resolve_sheet_folder", () =>
      getOrCreateFolder(sheetsFolderId, sanitizedEmpresa)
    );

    const section1Data = buildSection1Data(empresaRecord, normalizedFormData);
    const meaningfulAsistentes = normalizePayloadAsistentes(
      normalizedFormData.asistentes
    );
    const mutation = {
      ...buildInduccionOrganizacionalSheetMutation({
        section1Data,
        formData: normalizedFormData,
        asistentes: meaningfulAsistentes,
      }),
      footerActaRefs: [
        {
          sheetName: INDUCCION_ORGANIZACIONAL_SHEET_NAME,
          actaRef,
        },
      ],
    };

    const preparedSpreadsheet = await runGoogleStep(
      "spreadsheet.prepare_company_file",
      () =>
        prepareCompanySpreadsheet({
          masterTemplateId,
          companyFolderId: empresaFolderId,
          spreadsheetName,
          activeSheetName: INDUCCION_ORGANIZACIONAL_SHEET_NAME,
          mutation,
          onStep: profiler.mark,
        })
    );

    await runGoogleStep("spreadsheet.apply_mutation", () =>
      applyFormSheetMutation(preparedSpreadsheet.spreadsheetId, preparedSpreadsheet.effectiveMutation, {
        onStep: profiler.mark,
      })
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

    const {
      payloadRaw,
      payloadNormalized: basePayloadNormalized,
      payloadMetadata,
    } = buildInduccionOrganizacionalCompletionPayloads({
      actaRef,
      section1Data,
      formData: normalizedFormData,
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
      console.error("[induccion_organizacional.raw_payload_upload] failed", {
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
        formSlug: "induccion-organizacional",
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
          nombreFormato: INDUCCION_ORGANIZACIONAL_FORM_NAME,
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
          console.error(
            "[induccion_organizacional.sync_usuarios_reca_stage] failed",
            {
              stageError,
            }
          );
        }
      );
      profiler.mark("supabase.sync_usuarios_reca_failed");
      console.error(
        "[induccion_organizacional.usuarios_reca_sync] failed (non-fatal)",
        syncError
      );
    }

    const responsePayload: FinalizationSuccessResponse = {
      success: true,
      sheetLink,
      pdfLink,
    };

    await markFinalizationRequestSucceededSafely({
      supabase: finalizationRequestsSupabase,
      idempotencyKey,
      userId: user.id,
      stage: "succeeded",
      responsePayload,
      source: "induccion_organizacional.finalization_request",
    });

    profiler.finish({
      spreadsheetReused: preparedSpreadsheet.reusedSpreadsheet,
      writes: mutation.writes.length,
      asistentes: meaningfulAsistentes.length,
      targetSheetName: preparedSpreadsheet.activeSheetName,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
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
        source: "induccion_organizacional.finalization_request",
      });
    }

    console.error("[induccion_organizacional.finalize] failed", error);
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
