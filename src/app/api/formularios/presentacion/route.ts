import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  applyFormSheetMutation,
  type CellWrite,
} from "@/lib/google/sheets";
import {
  getOrCreateFolder,
  exportSheetToPdf,
  uploadPdf,
  sanitizeFileName,
} from "@/lib/google/drive";
import {
  buildPresentacionCompletionPayloads,
  getPresentacionFormName,
} from "@/lib/finalization/presentacionPayload";
import {
  normalizePresentacionMotivacion,
  normalizePresentacionTipoVisita,
} from "@/lib/presentacion";
import { prepareCompanySpreadsheet } from "@/lib/google/companySpreadsheet";
import { presentacionFinalizeRequestSchema } from "@/lib/validations/finalization";

const PAYLOAD_SOURCE = "form_web";

const SECTION_1_MAP: Record<string, string> = {
  fecha_visita: "D7",
  modalidad: "Q7",
  nombre_empresa: "D8",
  direccion_empresa: "D9",
  correo_1: "D10",
  contacto_empresa: "D11",
  caja_compensacion: "D12",
  profesional_asignado: "D13",
  asesor: "D14",
  ciudad_empresa: "Q8",
  nit_empresa: "Q9",
  telefono_empresa: "Q10",
  cargo: "Q11",
  sede_empresa: "Q12",
  correo_profesional: "Q13",
  correo_asesor: "Q14",
};

const MOTIVACION_MAP: Record<string, string> = {
  "Responsabilidad Social Empresarial": "U60",
  "Objetivos y metas para la diversidad, equidad e inclusión.": "U61",
  "Avances a nivel global de impacto en Colombia": "U62",
  "Beneficios Tributarios": "U63",
  "Beneficios en la contratación de población en riesgo de exclusión": "U64",
  "Ventaja en licitaciones públicas": "U65",
  "Cumplimiento de la normativa establecida por el Estado Colombiano.": "U66",
  "Experiencia en la vinculación de personas en condición de discapacidad.":
    "U67",
};

const ACUERDOS_CELL = "A71";
const ASISTENTES_START_ROW = 75;
const ASISTENTES_NAME_COL = "C";
const ASISTENTES_CARGO_COL = "N";
const ASISTENTES_BASE_ROWS = 3;

function getSheetName(tipoVisita: string) {
  return tipoVisita === "Reactivación"
    ? "1.2 REACTIVACIÓN DEL PROGRAMA IL"
    : "1. PRESENTACIÓN DEL PROGRAMA IL";
}

function cellRef(sheetName: string, cell: string) {
  return `'${sheetName}'!${cell}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = presentacionFinalizeRequestSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { empresa, ...formData } = parsed.data;
    const tipoVisita = normalizePresentacionTipoVisita(formData.tipo_visita);
    const motivacionSeleccionada = normalizePresentacionMotivacion(
      formData.motivacion
    );

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

    const targetSheetName = getSheetName(tipoVisita);
    const empresaNombre = empresa.nombre_empresa;
    const fechaVisita = formData.fecha_visita;
    const sanitizedEmpresa = sanitizeFileName(empresaNombre);
    const spreadsheetName = sanitizedEmpresa;
    const pdfBaseName = `${sanitizedEmpresa} - ${tipoVisita} - ${fechaVisita}`;

    const empresaFolderId = await getOrCreateFolder(sheetsFolderId, sanitizedEmpresa);

    const section1Data = {
      fecha_visita: fechaVisita,
      modalidad: formData.modalidad,
      nit_empresa: formData.nit_empresa,
      nombre_empresa: empresaNombre,
      direccion_empresa: empresa.direccion_empresa ?? "",
      correo_1: empresa.correo_1 ?? "",
      contacto_empresa: empresa.contacto_empresa ?? "",
      caja_compensacion: empresa.caja_compensacion ?? "",
      profesional_asignado: empresa.profesional_asignado ?? "",
      asesor: empresa.asesor ?? "",
      ciudad_empresa: empresa.ciudad_empresa ?? "",
      telefono_empresa: empresa.telefono_empresa ?? "",
      cargo: empresa.cargo ?? "",
      sede_empresa: empresa.sede_empresa ?? empresa.zona_empresa ?? "",
      correo_profesional: empresa.correo_profesional ?? "",
      correo_asesor: empresa.correo_asesor ?? "",
      tipo_visita: tipoVisita,
    };

    const writes: CellWrite[] = [];

    for (const [field, cell] of Object.entries(SECTION_1_MAP)) {
      const value = section1Data[field as keyof typeof section1Data];
      if (value) {
        writes.push({
          range: cellRef(targetSheetName, cell),
          value,
        });
      }
    }

    for (const [opcion, cell] of Object.entries(MOTIVACION_MAP)) {
      writes.push({
        range: cellRef(targetSheetName, cell),
        value: motivacionSeleccionada.includes(opcion),
      });
    }

    writes.push({
      range: cellRef(targetSheetName, ACUERDOS_CELL),
      value: formData.acuerdos_observaciones,
    });

    const asistentes = formData.asistentes;
    asistentes.forEach((asistente, index) => {
      const row = ASISTENTES_START_ROW + index;
      if (asistente.nombre) {
        writes.push({
          range: cellRef(targetSheetName, `${ASISTENTES_NAME_COL}${row}`),
          value: asistente.nombre,
        });
      }
      if (asistente.cargo) {
        writes.push({
          range: cellRef(targetSheetName, `${ASISTENTES_CARGO_COL}${row}`),
          value: asistente.cargo,
        });
      }
    });

    const extraRows = Math.max(0, asistentes.length - ASISTENTES_BASE_ROWS);
    const preparedSpreadsheet = await prepareCompanySpreadsheet({
      masterTemplateId,
      companyFolderId: empresaFolderId,
      spreadsheetName,
      activeSheetName: targetSheetName,
      mutation: {
        writes,
        rowInsertions:
          extraRows > 0
            ? [
                {
                  sheetName: targetSheetName,
                  insertAtRow: ASISTENTES_START_ROW + ASISTENTES_BASE_ROWS - 1,
                  count: extraRows,
                  templateRow: ASISTENTES_START_ROW + ASISTENTES_BASE_ROWS - 1,
                },
              ]
            : [],
        checkboxValidations: [
          {
            sheetName: targetSheetName,
            cells: Object.values(MOTIVACION_MAP),
          },
        ],
      },
    });

    await applyFormSheetMutation(preparedSpreadsheet.spreadsheetId, preparedSpreadsheet.effectiveMutation);

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
      buildPresentacionCompletionPayloads({
        tipoVisita,
        section1Data,
        motivacionSeleccionada,
        acuerdosObservaciones: formData.acuerdos_observaciones,
        asistentes,
        output: { sheetLink, pdfLink },
        generatedAt: now,
        payloadSource: PAYLOAD_SOURCE,
      });

    const { error: insertError } = await supabase.from("formatos_finalizados_il").insert({
      usuario_login: session.user.email ?? session.user.id,
      nombre_usuario: session.user.email?.split("@")[0] ?? session.user.id,
      nombre_formato: getPresentacionFormName(tipoVisita),
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

    return NextResponse.json({ success: true, sheetLink, pdfLink });
  } catch (error) {
    console.error("Error en API presentacion:", error);
    return NextResponse.json(
      { error: "No se pudo finalizar el formulario." },
      { status: 500 }
    );
  }
}
