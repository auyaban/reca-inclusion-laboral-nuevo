import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  applyFormSheetMutation,
  type CellWrite,
} from "@/lib/google/sheets";
import {
  exportSheetToPdf,
  getOrCreateFolder,
  sanitizeFileName,
  uploadPdf,
} from "@/lib/google/drive";
import {
  buildSensibilizacionCompletionPayloads,
  SENSIBILIZACION_FORM_NAME,
} from "@/lib/finalization/sensibilizacionPayload";
import { prepareCompanySpreadsheet } from "@/lib/google/companySpreadsheet";
import { sensibilizacionFinalizeRequestSchema } from "@/lib/validations/finalization";

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
  try {
    const body = await request.json();
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
    });

    await applyFormSheetMutation(
      preparedSpreadsheet.spreadsheetId,
      preparedSpreadsheet.effectiveMutation
    );

    const { spreadsheetId, sheetLink } = preparedSpreadsheet;

    const pdfBytes = await exportSheetToPdf(spreadsheetId);
    const pdfEmpresaFolderId = await getOrCreateFolder(pdfFolderId, sanitizedEmpresa);
    const { webViewLink: pdfLink } = await uploadPdf(
      pdfBytes,
      `${pdfBaseName}.pdf`,
      pdfEmpresaFolderId
    );

    const now = new Date();
    const { payloadRaw, payloadNormalized, payloadMetadata } =
      buildSensibilizacionCompletionPayloads({
        section1Data,
        observaciones: formData.observaciones,
        asistentes: formData.asistentes,
        output: { sheetLink, pdfLink },
        generatedAt: now,
        payloadSource: PAYLOAD_SOURCE,
      });

    const { error: insertError } = await supabase.from("formatos_finalizados_il").insert({
      usuario_login: session.user.email ?? session.user.id,
      nombre_usuario: session.user.email?.split("@")[0] ?? session.user.id,
      nombre_formato: SENSIBILIZACION_FORM_NAME,
      nombre_empresa: empresaNombre,
      finalizado_at_iso: payloadMetadata.generated_at,
      path_formato: sheetLink,
      drive_file_id: spreadsheetId,
      upload_status: "uploaded",
      uploaded_at: payloadMetadata.generated_at,
      payload_raw: payloadRaw,
      payload_normalized: payloadNormalized,
      payload_schema_version: 1,
      payload_source: PAYLOAD_SOURCE,
      payload_generated_at: payloadMetadata.generated_at,
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      sheetLink,
      pdfLink,
    });
  } catch (error) {
    console.error("Error en API sensibilizacion:", error);
    return NextResponse.json(
      { error: "No se pudo finalizar el formulario." },
      { status: 500 }
    );
  }
}
