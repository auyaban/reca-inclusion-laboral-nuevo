export { cleanText, cleanCedula, cleanNit, cleanName, normalizeText, isPersonCandidate, looksLikePersonNameForCompany, toIsoDate, splitJoinedCedulaPercentage, splitJoinedCedulaPhone, extractCedulaFromOferenteToken, companyFromEmailDomain, parseDurationHours, decodeMojibake } from "./common";
export type { ParserTrace } from "./parserTrace";
export { createParserTrace, recordPatternAttempt, recordPatternFailure, recordParticipantSource } from "./parserTrace";
export type { ExtractionErrors } from "./extractionErrors";
export { createExtractionErrors, hasErrors, errorSummary } from "./extractionErrors";
export { extractActaIdFromInput, extractActaIdFromText, extractGoogleArtifactReference } from "./actaIdParser";
export type { GoogleArtifactReference } from "./actaIdParser";
export { extractPdfGeneralFields, extractPdfNits, extractPdfParticipants, extractPdfAsistentesCandidates, extractPdfValue } from "./generalPdfParser";
export type { GeneralPdfFields } from "./generalPdfParser";
export { parseInterpreterPdf } from "./interpreterPdfParser";
export type { InterpreterPdfResult } from "./interpreterPdfParser";
export { extractPdfVacancyFields, extractPdfSelectionCargo } from "./vacancyPdfParser";
export { extractPdfGroupalOferenteChunks, extractSelectionCargoFromSection } from "./selectionPdfParser";
export { extractPdfFollowUpNumber, extractNameFromFollowUpFilename, extractFollowUpParticipantFromFilename } from "./followUpPdfParser";
export { parseActaExcel } from "./excelParser";
export type { ExcelParseResult } from "./excelParser";

import { extractActaIdFromText } from "./actaIdParser";
import { extractPdfGeneralFields, extractPdfNits, extractPdfParticipants, extractPdfAsistentesCandidates, extractPdfValue } from "./generalPdfParser";
import { parseInterpreterPdf } from "./interpreterPdfParser";
import { extractPdfVacancyFields, extractPdfSelectionCargo } from "./vacancyPdfParser";
import { extractPdfFollowUpNumber, extractFollowUpParticipantFromFilename } from "./followUpPdfParser";
import { parseActaExcel } from "./excelParser";
import { cleanNit, normalizeText } from "./common";
import type { ParserTrace } from "./parserTrace";
import { createParserTrace } from "./parserTrace";
import type { ExtractionErrors } from "./extractionErrors";
import { createExtractionErrors } from "./extractionErrors";

export type ActaParseResult = {
  file_path: string;
  source_type: "local_pdf" | "local_excel" | "google_sheets" | "google_drive_file" | "acta_ref";
  acta_ref?: string;
  nit_empresa?: string;
  nits_empresas?: string[];
  nombre_empresa?: string;
  fecha_servicio?: string;
  nombre_profesional?: string;
  candidatos_profesional?: string[];
  modalidad_servicio?: string;
  cargo_objetivo?: string;
  total_vacantes?: number;
  numero_seguimiento?: string;
  participantes?: Array<Record<string, string>>;
  interpretes?: string[];
  interpreter_process_name?: string;
  interpreter_total_time_raw?: string;
  sumatoria_horas_interpretes_raw?: string;
  total_horas_interprete?: number | string;
  sumatoria_horas_interpretes?: number | string;
  is_fallido?: boolean;
  warnings: string[];
  parser_trace?: ParserTrace;
  extraction_errors?: ExtractionErrors;
};

export async function parseActaSource(
  source: string,
  options?: { fileBuffer?: ArrayBuffer; fileType?: "pdf" | "excel" }
): Promise<ActaParseResult> {
  const sourceText = (source || "").trim();
  if (!sourceText) {
    throw new Error("Debe indicar la ruta o URL del acta.");
  }

  const fileType = options?.fileType || (sourceText.toLowerCase().endsWith(".pdf") ? "pdf" : "excel");
  const trace = createParserTrace(fileType);
  const errors = createExtractionErrors();

  if (options?.fileBuffer) {
    if (fileType === "pdf") {
      return await parsePdfFromBuffer(options.fileBuffer, sourceText, trace, errors);
    }
    return await parseExcelFromBuffer(options.fileBuffer, sourceText, trace, errors);
  }

  throw new Error("parseActaSource requiere fileBuffer para parsing local. Para Google Drive/Sheets, use el endpoint API correspondiente.");
}

async function parsePdfFromBuffer(buffer: ArrayBuffer, filePath: string, trace: ParserTrace, errors: ExtractionErrors): Promise<ActaParseResult> {
  const { loadPdfjs } = await import("../pdfjsServer");
  const pdfjsLib = await loadPdfjs();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 0; i < (pdf.numPages as number); i++) {
    const page = await pdf.getPage(i + 1);
    const content = await page.getTextContent();
    const strings = (content.items as Array<{ str?: string }>).map((item) => item.str || "");
    const pageText = strings.join(" ").replace(/\s+/g, " ").trim();
    if (pageText) pages.push(pageText);
  }

  if (pages.length === 0) {
    throw new Error("El PDF no contiene paginas legibles.");
  }

  const fullText = pages.join("\n");
  const firstPage = pages[0] || "";
  const actaRef = extractActaIdFromText(fullText);
  const normalizedFirstPage = normalizeText(firstPage);

  if (normalizedFirstPage.includes("interprete") && normalizeText(fullText).includes("sumatoria horas interpretes")) {
    const result = parseInterpreterPdf(firstPage, fullText, filePath);
    return {
      file_path: filePath,
      source_type: "local_pdf",
      acta_ref: result.acta_ref,
      nit_empresa: result.nit_empresa,
      nits_empresas: result.nits_empresas,
      nombre_empresa: result.nombre_empresa,
      fecha_servicio: result.fecha_servicio,
      nombre_profesional: result.nombre_profesional,
      candidatos_profesional: result.candidatos_profesional,
      modalidad_servicio: result.modalidad_servicio,
      participantes: result.participantes,
      interpretes: result.interpretes,
      interpreter_process_name: result.interpreter_process_name,
      interpreter_total_time_raw: result.interpreter_total_time_raw,
      sumatoria_horas_interpretes_raw: result.sumatoria_horas_interpretes_raw,
      total_horas_interprete: result.total_horas_interprete,
      sumatoria_horas_interpretes: result.sumatoria_horas_interpretes,
      is_fallido: result.is_fallido,
      warnings: result.warnings,
      parser_trace: trace,
      extraction_errors: errors,
    };
  }

  const nit = cleanNit(extractPdfValue(firstPage, /n(?:u|ú|\u00C3\u00BA)mero de nit:\s*([0-9.\- ]+)/i));
  const { empresa, fecha_servicio, modalidad } = extractPdfGeneralFields(firstPage);
  const asistentesCandidates = extractPdfAsistentesCandidates(fullText);
  const profesionalReca = extractPdfValue(firstPage, /profesional asignado\s*reca:\s*(.*?)(?:modalidad:|\n|se informa|$)/i);
  const asesor = extractPdfValue(firstPage, /asesor:\s*(.+?)(?:sede compensar:|correo electr[oó]nico:|$)/i);

  let profesional = "";
  if (asistentesCandidates.length > 0) {
    profesional = asistentesCandidates[0];
  } else if (profesionalReca) {
    profesional = profesionalReca;
  } else if (asesor) {
    profesional = asesor;
  }

  if (normalizeText(profesionalReca).startsWith("modalidad")) {
    // profesionalReca no se usa como profesional si empieza con "modalidad"
  }

  const participantes = extractPdfParticipants(fullText, trace, errors);
  let finalParticipants = participantes;
  if (finalParticipants.length === 0) {
    finalParticipants = extractFollowUpParticipantFromFilename(fullText, filePath);
  }

  const nits = extractPdfNits(fullText);
  const numero_seguimiento = extractPdfFollowUpNumber(fullText);
  const [cargo_objetivo, total_vacantes] = extractPdfVacancyFields(fullText);
  let finalCargo = cargo_objetivo;
  if (!finalCargo && normalizedFirstPage.includes("proceso de seleccion incluyente")) {
    finalCargo = extractPdfSelectionCargo(fullText);
  }

  const finalNit = !nit && nits.length > 0 ? nits[0] : nit;

  const warnings: string[] = [];
  if (!finalNit) {
    warnings.push("No se detecto NIT en el PDF.");
    errors.nit_empresa = { reason: "No se encontro NIT con ningun patron conocido", attempted_patterns: ["número de nit regex", "bare NIT regex"] };
  }
  if (!empresa) {
    warnings.push("No se detecto nombre de empresa en el PDF.");
    errors.nombre_empresa = { reason: "No se encontro nombre de empresa en header ni fallback" };
  }
  if (!fecha_servicio) {
    warnings.push("No se detecto fecha de servicio en formato valido.");
    errors.fecha_servicio = { reason: "No se encontro fecha con formato valido" };
  }
  if (finalParticipants.length === 0 && !normalizedFirstPage.includes("evaluacion de accesibilidad") && !normalizedFirstPage.includes("revision de las condiciones de la vacante")) {
    warnings.push("No se detectaron oferentes en el PDF.");
  }

  return {
    file_path: filePath,
    source_type: "local_pdf",
    acta_ref: actaRef,
    nit_empresa: finalNit,
    nits_empresas: nits,
    nombre_empresa: empresa,
    fecha_servicio,
    nombre_profesional: profesional,
    candidatos_profesional: asistentesCandidates.length > 0 ? asistentesCandidates : (profesionalReca ? [profesionalReca] : (asesor ? [asesor] : [])),
    modalidad_servicio: modalidad,
    cargo_objetivo: finalCargo,
    total_vacantes,
    numero_seguimiento,
    participantes: finalParticipants,
    warnings,
    parser_trace: trace,
    extraction_errors: errors,
  };
}

async function parseExcelFromBuffer(buffer: ArrayBuffer, filePath: string, trace: ParserTrace, errors: ExtractionErrors): Promise<ActaParseResult> {
  const result = await parseActaExcel(buffer, filePath);
  if (!result.nit_empresa) {
    errors.nit_empresa = { reason: "No se encontro NIT en ninguna hoja", attempted_patterns: ["numero de nit", "nit empresa", "razon social / nit", "nit:"] };
  }
  if (!result.fecha_servicio) {
    errors.fecha_servicio = { reason: "No se encontro fecha con formato valido" };
  }
  return {
    file_path: result.file_path,
    source_type: "local_excel",
    nit_empresa: result.nit_empresa,
    nombre_empresa: result.nombre_empresa,
    fecha_servicio: result.fecha_servicio,
    nombre_profesional: result.nombre_profesional,
    candidatos_profesional: result.candidatos_profesional,
    modalidad_servicio: result.modalidad_servicio,
    participantes: result.participantes,
    warnings: result.warnings,
    parser_trace: trace,
    extraction_errors: errors,
  };
}
