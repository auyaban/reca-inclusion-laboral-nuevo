import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyFormSheetMutation, type CellWrite } from "@/lib/google/sheets";
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
  buildFinalizationIdempotencyKey,
  buildFinalizationRequestHash,
  type FinalizationSuccessResponse,
} from "@/lib/finalization/idempotency";
import { buildFinalizedRecordInsert } from "@/lib/finalization/finalizedRecord";
import {
  buildPersistedFinalizationMetadata,
  withPersistedFinalizationMetadata,
} from "@/lib/finalization/finalizationStatus";
import { withGoogleRetry } from "@/lib/finalization/googleRetry";
import {
  buildFinalizationInProgressBody,
  buildFinalizationRouteErrorBody,
  markFinalizationRequestFailedSafely,
} from "@/lib/finalization/finalizationFeedback";
import {
  FINALIZATION_IN_PROGRESS_CODE,
  type FinalizationRequestsSupabaseClient,
  beginFinalizationRequest,
  markFinalizationRequestStage,
  markFinalizationRequestSucceeded,
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
import { prepareCompanySpreadsheet } from "@/lib/google/companySpreadsheet";
import { sensibilizacionFinalizeRequestSchema } from "@/lib/validations/finalization";

const PAYLOAD_SOURCE = "form_web";
const SHEET_NAME = "8. SENSIBILIZACIÓN";
const OBSERVACIONES_CELL = "A26";
const ASISTENTES_START_ROW = 32;
const ASISTENTES_BASE_ROWS = 4;
const ASISTENTES_NAME_COL = "C";
const ASISTENTES_CARGO_COL = "K";

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
  return `'${SHEET_NAME}'!${cell}`;
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
    const idempotencyKey = buildFinalizationIdempotencyKey({
      formSlug: "sensibilizacion",
      userId: user.id,
      identity: finalizationIdentity,
      requestHash,
    });
    const requestDecision = await beginFinalizationRequest({
      supabase: finalizationRequestsSupabase,
      idempotencyKey,
      formSlug: "sensibilizacion",
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
    const sanitizedEmpresa = sanitizeFileName(empresaNombre);
    const spreadsheetName = sanitizedEmpresa;
    const empresaFolderId = await runGoogleStep(
      "drive.resolve_sheet_folder",
      () => getOrCreateFolder(sheetsFolderId, sanitizedEmpresa)
    );

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
      range: cellRef(OBSERVACIONES_CELL),
      value: reviewedFormData.observaciones,
    });

    const meaningfulAsistentes = normalizePayloadAsistentes(
      reviewedFormData.asistentes
    );

    meaningfulAsistentes.forEach((asistente, index) => {
      const row = ASISTENTES_START_ROW + index;
      if (asistente.nombre) {
        writes.push({
          range: cellRef(`${ASISTENTES_NAME_COL}${row}`),
          value: asistente.nombre,
        });
      }
      if (asistente.cargo) {
        writes.push({
          range: cellRef(`${ASISTENTES_CARGO_COL}${row}`),
          value: asistente.cargo,
        });
      }
    });

    const extraRows = Math.max(
      0,
      meaningfulAsistentes.length - ASISTENTES_BASE_ROWS
    );
    const preparedSpreadsheet = await runGoogleStep(
      "spreadsheet.prepare_company_file",
      () =>
        prepareCompanySpreadsheet({
          masterTemplateId,
          companyFolderId: empresaFolderId,
          spreadsheetName,
          activeSheetName: SHEET_NAME,
          mutation: {
            writes,
            footerActaRefs: [
              {
                sheetName: SHEET_NAME,
                actaRef,
              },
            ],
            rowInsertions:
              extraRows > 0
                ? [
                    {
                      sheetName: SHEET_NAME,
                      insertAtRow: ASISTENTES_START_ROW + ASISTENTES_BASE_ROWS - 1,
                      count: extraRows,
                      templateRow: ASISTENTES_START_ROW + ASISTENTES_BASE_ROWS - 1,
                    },
                  ]
                : [],
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

    const responsePayload: FinalizationSuccessResponse = {
      success: true,
      sheetLink,
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
      { status: 500 }
    );
  }
}
