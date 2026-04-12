import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  applyFormSheetMutation,
  type CellWrite,
} from "@/lib/google/sheets";
import {
  buildRawPayloadFileName,
  exportSheetToPdf,
  getOrCreateFolder,
  RAW_PAYLOADS_FOLDER_NAME,
  sanitizeFileName,
  uploadPdf,
  uploadJsonArtifact,
} from "@/lib/google/drive";
import {
  buildFailedRawPayloadArtifact,
  type RawPayloadArtifact,
  buildUploadedRawPayloadArtifact,
  withRawPayloadArtifact,
} from "@/lib/finalization/payloads";
import {
  buildSensibilizacionCompletionPayloads,
  SENSIBILIZACION_FORM_NAME,
} from "@/lib/finalization/sensibilizacionPayload";
import { createFinalizationProfiler } from "@/lib/finalization/profiler";
import { prepareCompanySpreadsheet } from "@/lib/google/companySpreadsheet";
import { sensibilizacionFinalizeRequestSchema } from "@/lib/validations/finalization";
import { buildFinalizedRecordInsert } from "@/lib/finalization/finalizedRecord";

const PAYLOAD_SOURCE = "form_web";
const SHEET_NAME = "8. SENSIBILIZACION";
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

    const { empresa, ...formData } = parsed.data;

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    profiler.mark("auth.get_session");

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

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

    const empresaNombre = empresa.nombre_empresa;
    const sanitizedEmpresa = sanitizeFileName(empresaNombre);
    const spreadsheetName = sanitizedEmpresa;
    const pdfBaseName = `${sanitizedEmpresa} - Sensibilizacion - ${formData.fecha_visita}`;

    const empresaFolderId = await getOrCreateFolder(sheetsFolderId, sanitizedEmpresa);
    profiler.mark("drive.resolve_sheet_folder");

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
      sede_empresa: empresa.sede_empresa ?? empresa.zona_empresa ?? "",
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
      value: formData.observaciones,
    });

    formData.asistentes.forEach((asistente, index) => {
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

    const extraRows = Math.max(0, formData.asistentes.length - ASISTENTES_BASE_ROWS);
    const preparedSpreadsheet = await prepareCompanySpreadsheet({
      masterTemplateId,
      companyFolderId: empresaFolderId,
      spreadsheetName,
      activeSheetName: SHEET_NAME,
      mutation: {
        writes,
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
    });
    profiler.mark("spreadsheet.prepare_company_file");

    await applyFormSheetMutation(
      preparedSpreadsheet.spreadsheetId,
      preparedSpreadsheet.effectiveMutation,
      { onStep: profiler.mark }
    );
    profiler.mark("spreadsheet.apply_mutation_done");

    const { spreadsheetId, sheetLink } = preparedSpreadsheet;

    const pdfBytes = await exportSheetToPdf(spreadsheetId);
    profiler.mark("drive.export_pdf");
    const pdfEmpresaFolderId = await getOrCreateFolder(pdfFolderId, sanitizedEmpresa);
    profiler.mark("drive.resolve_pdf_folder");
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
    } =
      buildSensibilizacionCompletionPayloads({
        section1Data,
        observaciones: formData.observaciones,
        asistentes: formData.asistentes,
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
      const rawPayloadFolderId = await getOrCreateFolder(
        empresaFolderId,
        RAW_PAYLOADS_FOLDER_NAME
      );
      profiler.mark("drive.resolve_raw_payload_folder");
      rawPayloadStage = "drive.upload_raw_payload";

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

    const payloadNormalized = withRawPayloadArtifact(
      basePayloadNormalized,
      rawPayloadArtifact
    );

    const { error: insertError } = await supabase
      .from("formatos_finalizados_il")
      .insert(
        buildFinalizedRecordInsert({
          registroId,
          usuarioLogin: session.user.email ?? session.user.id,
          nombreUsuario: session.user.email?.split("@")[0] ?? session.user.id,
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
    profiler.finish({
      company: sanitizedEmpresa,
      spreadsheetReused: preparedSpreadsheet.reusedSpreadsheet,
      writes: writes.length,
      asistentes: formData.asistentes.length,
      targetSheetName: preparedSpreadsheet.activeSheetName,
      rawPayloadArtifactStatus: rawPayloadArtifact.status,
    });

    return NextResponse.json({
      success: true,
      sheetLink,
      pdfLink,
    });
  } catch (error) {
    profiler.fail(error);
    console.error("Error en API sensibilizacion:", error);
    return NextResponse.json(
      { error: "No se pudo finalizar el formulario." },
      { status: 500 }
    );
  }
}
