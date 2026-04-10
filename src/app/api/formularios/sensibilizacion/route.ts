import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sensibilizacionSchema } from "@/lib/validations/sensibilizacion";
import {
  batchWriteCells,
  copyTemplate,
  insertRows,
  type CellWrite,
} from "@/lib/google/sheets";
import {
  exportSheetToPdf,
  getOrCreateFolder,
  sanitizeFileName,
  uploadPdf,
} from "@/lib/google/drive";

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

const empresaPayloadSchema = z.object({
  id: z.string(),
  nombre_empresa: z.string(),
  nit_empresa: z.string().nullable().optional(),
  direccion_empresa: z.string().nullable().optional(),
  ciudad_empresa: z.string().nullable().optional(),
  sede_empresa: z.string().nullable().optional(),
  zona_empresa: z.string().nullable().optional(),
  correo_1: z.string().nullable().optional(),
  contacto_empresa: z.string().nullable().optional(),
  telefono_empresa: z.string().nullable().optional(),
  cargo: z.string().nullable().optional(),
  profesional_asignado: z.string().nullable().optional(),
  correo_profesional: z.string().nullable().optional(),
  asesor: z.string().nullable().optional(),
  correo_asesor: z.string().nullable().optional(),
  caja_compensacion: z.string().nullable().optional(),
});

const requestSchema = sensibilizacionSchema.extend({
  empresa: empresaPayloadSchema,
});

function cellRef(cell: string) {
  return `'${SHEET_NAME}'!${cell}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue?.message ?? "Datos invalidos" },
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
    const baseName = `${sanitizedEmpresa} - Sensibilizacion - ${formData.fecha_visita}`;

    const empresaFolderId = await getOrCreateFolder(sheetsFolderId, sanitizedEmpresa);
    const { fileId: spreadsheetId, webViewLink: sheetLink } = await copyTemplate(
      masterTemplateId,
      baseName,
      empresaFolderId
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
      sede_empresa: empresa.sede_empresa ?? empresa.zona_empresa ?? "",
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

    const extraRows = Math.max(0, formData.asistentes.length - ASISTENTES_BASE_ROWS);
    if (extraRows > 0) {
      const insertAt = ASISTENTES_START_ROW + ASISTENTES_BASE_ROWS - 1;
      await insertRows(spreadsheetId, SHEET_NAME, insertAt, extraRows);
    }

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

    await batchWriteCells(spreadsheetId, writes);

    const pdfBytes = await exportSheetToPdf(spreadsheetId);
    const pdfEmpresaFolderId = await getOrCreateFolder(pdfFolderId, sanitizedEmpresa);
    const { webViewLink: pdfLink } = await uploadPdf(
      pdfBytes,
      `${baseName}.pdf`,
      pdfEmpresaFolderId
    );

    const now = new Date().toISOString();
    const asistentesNombres = formData.asistentes
      .map((asistente) => asistente.nombre.trim())
      .filter(Boolean);

    const payload_raw = {
      schema_version: 1,
      form_id: "sensibilizacion",
      cache_snapshot: {
        section_1: section1Data,
        section_2: {},
        section_3: { observaciones: formData.observaciones },
        section_4: {},
        section_5: formData.asistentes,
      },
      output: { sheetLink, pdfLink },
      metadata: {
        generated_at: now,
        payload_source: "form_web",
      },
    };

    const payload_normalized = {
      schema_version: 1,
      form_id: "sensibilizacion",
      attachment: {
        document_kind: "sensibilizacion",
        document_label: "Sensibilizacion",
        is_ods_candidate: true,
      },
      parsed_raw: {
        nit_empresa: formData.nit_empresa,
        nombre_empresa: empresaNombre,
        fecha_servicio: formData.fecha_visita,
        nombre_profesional: "",
        candidatos_profesional: asistentesNombres,
        modalidad_servicio: formData.modalidad,
        cargo_objetivo: "",
        total_vacantes: "",
        numero_seguimiento: "",
        participantes: [],
        warnings: [],
        asistentes: asistentesNombres,
        ciudad_empresa: empresa.ciudad_empresa ?? "",
        sede_empresa: empresa.sede_empresa ?? empresa.zona_empresa ?? "",
        caja_compensacion: "",
        asesor_empresa: empresa.asesor ?? "",
        sheet_link: sheetLink,
        pdf_link: pdfLink,
      },
    };

    await supabase.from("formatos_finalizados_il").insert({
      usuario_login: session.user.email,
      nombre_usuario: session.user.email?.split("@")[0] ?? "",
      nombre_formato: "Sensibilizacion",
      nombre_empresa: empresaNombre,
      finalizado_at_iso: now,
      path_formato: sheetLink,
      drive_file_id: spreadsheetId,
      upload_status: "uploaded",
      uploaded_at: now,
      payload_raw,
      payload_normalized,
      payload_schema_version: 1,
      payload_source: "form_web",
      payload_generated_at: now,
    });

    return NextResponse.json({
      success: true,
      sheetLink,
      pdfLink,
    });
  } catch (error) {
    console.error("Error en API sensibilizacion:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
