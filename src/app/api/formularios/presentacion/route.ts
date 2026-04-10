import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  copyTemplate,
  batchWriteCells,
  insertRows,
  setCheckboxValidation,
  type CellWrite,
} from "@/lib/google/sheets";
import {
  getOrCreateFolder,
  exportSheetToPdf,
  uploadPdf,
  sanitizeFileName,
} from "@/lib/google/drive";
import {
  normalizePresentacionMotivacion,
  normalizePresentacionTipoVisita,
} from "@/lib/presentacion";

// ── Mapeo de celdas (replicado de presentacion_programa.py) ──────────────

const SECTION_1_MAP: Record<string, string> = {
  fecha_visita:         "D7",
  modalidad:            "Q7",
  nombre_empresa:       "D8",
  direccion_empresa:    "D9",
  correo_1:             "D10",
  contacto_empresa:     "D11",
  caja_compensacion:    "D12",
  profesional_asignado: "D13",
  asesor:               "D14",
  ciudad_empresa:       "Q8",
  nit_empresa:          "Q9",
  telefono_empresa:     "Q10",
  cargo:                "Q11",
  sede_empresa:         "Q12",
  correo_profesional:   "Q13",
  correo_asesor:        "Q14",
};

const MOTIVACION_MAP: Record<string, string> = {
  "Responsabilidad Social Empresarial":                                        "U60",
  "Objetivos y metas para la diversidad, equidad e inclusión.":               "U61",
  "Avances a nivel global de impacto en Colombia":                             "U62",
  "Beneficios Tributarios":                                                    "U63",
  "Beneficios en la contratación de población en riesgo de exclusión":         "U64",
  "Ventaja en licitaciones públicas":                                          "U65",
  "Cumplimiento de la normativa establecida por el Estado Colombiano.":        "U66",
  "Experiencia en la vinculación de personas en condición de discapacidad.":   "U67",
};

const ACUERDOS_CELL = "A71";
const ASISTENTES_START_ROW = 75; // fila 1-based
const ASISTENTES_NAME_COL  = "C";
const ASISTENTES_CARGO_COL = "N";
const ASISTENTES_BASE_ROWS = 3; // filas pre-existentes en el template

// ── Helper ────────────────────────────────────────────────────────────────

function sheetName(tipoVisita: string) {
  return tipoVisita === "Reactivación"
    ? "1.2 REACTIVACIÓN DEL PROGRAMA IL"
    : "1. PRESENTACIÓN DEL PROGRAMA IL";
}

function cellRef(tab: string, cell: string) {
  return `'${tab}'!${cell}`;
}

// ── Handler ───────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { empresa, ...formData } = body;
    const tipoVisita = normalizePresentacionTipoVisita(formData.tipo_visita);
    const motivacionSeleccionada = normalizePresentacionMotivacion(
      formData.motivacion
    );

    // 1. Verificar sesión
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const tab = sheetName(tipoVisita);
    const empresaNombre = empresa.nombre_empresa as string;
    const fechaVisita = formData.fecha_visita as string;

    // ── 2. Google Sheets: copiar template ─────────────────────────────────
    const masterTemplateId = process.env.GOOGLE_SHEETS_MASTER_ID!;
    const sheetsFolderId   = process.env.GOOGLE_DRIVE_FOLDER_ID!;
    const pdfFolderId      = process.env.GOOGLE_DRIVE_PDF_FOLDER_ID
                             ?? process.env.GOOGLE_DRIVE_FOLDER_ID!;

    const sanitizedEmpresa = sanitizeFileName(empresaNombre);
    const baseName = `${sanitizedEmpresa} - ${tipoVisita} - ${fechaVisita}`;

    // Subcarpeta por empresa
    const empresaFolderId = await getOrCreateFolder(sheetsFolderId, sanitizedEmpresa);

    // Copiar template
    const { fileId: spreadsheetId, webViewLink: sheetLink } =
      await copyTemplate(masterTemplateId, baseName, empresaFolderId);

    // ── 3. Construir writes Sección 1 ─────────────────────────────────────
    const section1Data: Record<string, string> = {
      fecha_visita:         fechaVisita,
      modalidad:            formData.modalidad,
      nit_empresa:          formData.nit_empresa,
      nombre_empresa:       empresaNombre,
      direccion_empresa:    empresa.direccion_empresa ?? "",
      correo_1:             empresa.correo_1 ?? "",
      contacto_empresa:     empresa.contacto_empresa ?? "",
      caja_compensacion:    empresa.caja_compensacion ?? "",
      profesional_asignado: empresa.profesional_asignado ?? "",
      asesor:               empresa.asesor ?? "",
      ciudad_empresa:       empresa.ciudad_empresa ?? "",
      telefono_empresa:     empresa.telefono_empresa ?? "",
      cargo:                empresa.cargo ?? "",
      sede_empresa:         empresa.sede_empresa ?? empresa.zona_empresa ?? "",
      correo_profesional:   empresa.correo_profesional ?? "",
      correo_asesor:        empresa.correo_asesor ?? "",
    };

    const writes: CellWrite[] = [];

    // Sección 1
    for (const [field, cell] of Object.entries(SECTION_1_MAP)) {
      const val = section1Data[field];
      if (val !== undefined && val !== "") {
        writes.push({ range: cellRef(tab, cell), value: val });
      }
    }

    // Sección 3 item 8 — motivación (TRUE/FALSE)
    for (const [opcion, cell] of Object.entries(MOTIVACION_MAP)) {
      writes.push({
        range: cellRef(tab, cell),
        value: motivacionSeleccionada.includes(opcion),
      });
    }

    // Sección 4 — acuerdos
    writes.push({
      range: cellRef(tab, ACUERDOS_CELL),
      value: formData.acuerdos_observaciones ?? "",
    });

    // ── 4. Asistentes: insertar filas extra si es necesario ───────────────
    const asistentes: { nombre: string; cargo: string }[] = formData.asistentes ?? [];
    const extraRows = Math.max(0, asistentes.length - ASISTENTES_BASE_ROWS);

    if (extraRows > 0) {
      // Insertar filas ANTES de escribir (índice 0-based)
      const insertAt = ASISTENTES_START_ROW + ASISTENTES_BASE_ROWS - 1;
      await insertRows(spreadsheetId, tab, insertAt, extraRows);
    }

    // Sección 5 — asistentes (después de posibles inserciones)
    asistentes.forEach((asistente, i) => {
      const row = ASISTENTES_START_ROW + i;
      if (asistente.nombre) {
        writes.push({ range: cellRef(tab, `${ASISTENTES_NAME_COL}${row}`), value: asistente.nombre });
      }
      if (asistente.cargo) {
        writes.push({ range: cellRef(tab, `${ASISTENTES_CARGO_COL}${row}`), value: asistente.cargo });
      }
    });

    // ── 5. Batch write de todas las celdas ───────────────────────────────
    await batchWriteCells(spreadsheetId, writes);

    // ── 6. Establecer checkboxes nativos en motivación ───────────────────
    await setCheckboxValidation(
      spreadsheetId,
      tab,
      Object.values(MOTIVACION_MAP)
    );

    // ── 7. Exportar a PDF y subir ─────────────────────────────────────────
    const pdfBytes = await exportSheetToPdf(spreadsheetId);

    const pdfEmpresaFolderId = await getOrCreateFolder(pdfFolderId, sanitizedEmpresa);
    const { webViewLink: pdfLink } = await uploadPdf(
      pdfBytes,
      `${baseName}.pdf`,
      pdfEmpresaFolderId
    );

    // ── 8. Guardar en Supabase ────────────────────────────────────────────
    const now = new Date();
    const payload_raw = {
      schema_version: 1,
      form_id: "presentacion_programa",
      cache_snapshot: {
        section_1: section1Data,
        section_3_item_8: motivacionSeleccionada,
        section_4: { acuerdos_observaciones: formData.acuerdos_observaciones },
        section_5: asistentes,
      },
      output: { sheetLink, pdfLink },
      metadata: { generated_at: now.toISOString(), payload_source: "form_web" },
    };

    const payload_normalized = {
      schema_version: 1,
      form_id: "presentacion_programa",
      attachment: {
        document_kind: tipoVisita === "Reactivación"
          ? "program_reactivation" : "program_presentation",
        document_label: tipoVisita === "Reactivación"
          ? "Reactivación del programa" : "Presentación del programa",
        is_ods_candidate: true,
      },
      parsed_raw: {
        nit_empresa: formData.nit_empresa,
        nombre_empresa: empresaNombre,
        fecha_servicio: fechaVisita,
        nombre_profesional: empresa.profesional_asignado ?? "",
        modalidad_servicio: formData.modalidad,
        asistentes,
        ciudad_empresa: empresa.ciudad_empresa ?? "",
        sede_empresa: empresa.sede_empresa ?? empresa.zona_empresa ?? "",
        caja_compensacion: empresa.caja_compensacion ?? "",
        asesor_empresa: empresa.asesor ?? "",
        motivacion: motivacionSeleccionada,
        acuerdos_observaciones: formData.acuerdos_observaciones,
        sheet_link: sheetLink,
        pdf_link: pdfLink,
      },
    };

    await supabase.from("formatos_finalizados_il").insert({
      usuario_login: session.user.email,
      nombre_usuario: session.user.email?.split("@")[0] ?? "",
      nombre_formato: `${tipoVisita} del Programa`,
      nombre_empresa: empresaNombre,
      finalizado_at_iso: now.toISOString(),
      path_formato: sheetLink,
      drive_file_id: spreadsheetId,
      upload_status: "uploaded",
      uploaded_at: now.toISOString(),
      payload_raw,
      payload_normalized,
      payload_schema_version: 1,
      payload_source: "form_web",
      payload_generated_at: now.toISOString(),
    });

    return NextResponse.json({ success: true, sheetLink, pdfLink });

  } catch (err) {
    console.error("Error en API presentacion:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
