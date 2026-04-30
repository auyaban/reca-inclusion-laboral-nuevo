import { cleanText, cleanName, cleanNit, cleanCedula, toIsoDate, normalizeText, isPersonCandidate, parseDurationHours } from "./common";
import { extractPdfActaId } from "./pdfActaId";
import { extractPdfValue, extractPdfAsistentesCandidates } from "./generalPdfParser";

export type InterpreterPdfResult = {
  file_path: string;
  acta_ref: string;
  nit_empresa: string;
  nits_empresas: string[];
  nombre_empresa: string;
  fecha_servicio: string;
  nombre_profesional: string;
  interpretes: string[];
  candidatos_profesional: string[];
  asistentes: string[];
  modalidad_servicio: string;
  participantes: Array<Record<string, string>>;
  interpreter_process_name: string;
  interpreter_total_time_raw: string;
  sumatoria_horas_interpretes_raw: string;
  total_horas_interprete: number | string;
  sumatoria_horas_interpretes: number | string;
  is_fallido: boolean;
  warnings: string[];
};

export function parseInterpreterPdf(firstPage: string, fullText: string, filePath: string): InterpreterPdfResult {
  const asistentesCandidates = extractPdfAsistentesCandidates(fullText);

  const fechaRaw = extractPdfValue(fullText, /1\.\s*datos de la empresa\s*fecha:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i);
  const fecha_servicio = toIsoDate(fechaRaw);

  const empresa = extractPdfValue(fullText, /nombre de la empresa:\s*(.+?)(?:direcci[oó]n:|contacto en la empresa:|modalidad servicio:|2\.)/i);

  const modalidadMatch = fullText.match(/modalidad servicio:\s*(?:(?:int\S?rprete|nombre int\S?rprete)\s*:\s*.+?\s+)?(?<modalidad>virtual|presencial|h[ií]brida?)\b/is);
  const modalidad = modalidadMatch && modalidadMatch.groups ? cleanText(modalidadMatch.groups.modalidad) : "";

  const profesionalReca = extractPdfValue(fullText, /profesional reca:\s*(.+?)(?:\bvirtual\b|\bpresencial\b|\bh[ií]brida?\b|2\.|3\.)/i);

  const interpreterNames = extractInterpreterNames(fullText);
  const [participants, processName] = extractInterpreterParticipants(fullText);

  const sumatoriaRaw = extractPdfValue(fullText, /sumatoria horas int\S?rpretes:\s*(.+?)(?:observaciones:|3\.)/is);
  const totalTimeRaw = extractPdfValue(fullText, /total tiempo:\s*(.+?)(?:si el servicio fue realizado en sabana|sumatoria horas int\S?rpretes:)/is);

  const totalTimeHours = parseDurationHours(totalTimeRaw);
  const sumatoriaHours = parseDurationHours(sumatoriaRaw);
  const horas = sumatoriaHours !== null && sumatoriaHours !== undefined ? sumatoriaHours : totalTimeHours;

  const nit = cleanNit(extractPdfValue(firstPage, /n\S?mero de nit:\s*([0-9.\- ]+)/i));
  const nits = nit ? [nit] : [];

  const warnings: string[] = [];
  if (!empresa) warnings.push("No se detecto nombre de empresa en el PDF.");
  if (!fecha_servicio) warnings.push("No se detecto fecha de servicio en formato valido.");
  if (participants.length === 0) warnings.push("No se detectaron oferentes en el PDF.");
  if (horas === null || horas === undefined) warnings.push("No se detecto total de horas interprete en el PDF.");
  if (interpreterNames.length === 0 && asistentesCandidates.length === 0) warnings.push("No se detectaron interpretes ni asistentes en el PDF.");

  return {
    file_path: filePath,
    acta_ref: extractPdfActaId(fullText),
    nit_empresa: nit,
    nits_empresas: nits,
    nombre_empresa: empresa,
    fecha_servicio,
    nombre_profesional: interpreterNames[0] || (asistentesCandidates[0] || (profesionalReca || "")),
    interpretes: interpreterNames,
    candidatos_profesional: interpreterNames.length > 0 ? interpreterNames : asistentesCandidates,
    asistentes: asistentesCandidates,
    modalidad_servicio: modalidad,
    participantes: participants,
    interpreter_process_name: processName,
    interpreter_total_time_raw: totalTimeRaw,
    sumatoria_horas_interpretes_raw: sumatoriaRaw,
    total_horas_interprete: totalTimeHours !== null && totalTimeHours !== undefined ? totalTimeHours : "",
    sumatoria_horas_interpretes: sumatoriaHours !== null && sumatoriaHours !== undefined ? sumatoriaHours : "",
    is_fallido: normalizeText(fullText).includes("fallido"),
    warnings,
  };
}

function extractInterpreterNames(text: string): string[] {
  const names: string[] = [];
  const pattern = /nombre\s+int\S?rprete\s*(?:no\s*\d+)?\s*:\s*(?<nombre>.+?)(?:hora\s+inicial:|hora\s+final:|total\s+tiempo:|\n|$)/gis;
  for (const match of text.matchAll(pattern)) {
    const candidate = cleanName(match.groups?.nombre || "");
    if (candidate && isPersonCandidate(candidate) && !names.includes(candidate)) {
      names.push(candidate);
    }
  }
  return names;
}

function extractInterpreterParticipants(text: string): [Array<Record<string, string>>, string] {
  const sectionMatch = text.match(/2\.\s*datos de los oferentes\/ vinculados(?<section>.*?)(?:nombre\s+int\S?rprete|3\.)/is);
  const section = sectionMatch && sectionMatch.groups ? cleanText(sectionMatch.groups.section) : cleanText(text);
  let processName = "";
  const participants: Array<Record<string, string>> = [];
  const pattern = /(?<idx>\d+)\s+(?<nombre>.+?)\s+(?<cedula>\d{6,12})\s+(?<proceso>.+?)(?=(?:\s+\d+\s+[A-Z])|$)/gi;
  for (const match of section.matchAll(pattern)) {
    const nombre = cleanName(match.groups?.nombre || "");
    const cedula = cleanCedula(match.groups?.cedula || "");
    const proceso = cleanText(match.groups?.proceso || "");
    if (!nombre || !cedula) continue;
    if (!processName && proceso) processName = proceso;
    participants.push({
      nombre_usuario: nombre,
      cedula_usuario: cedula,
      discapacidad_usuario: "",
      genero_usuario: "",
    });
  }
  return [dedupeInterpreterParticipants(participants), processName];
}

function dedupeInterpreterParticipants(participants: Array<Record<string, string>>): Array<Record<string, string>> {
  const seen = new Set<string>();
  const unique: Array<Record<string, string>> = [];
  for (const item of participants) {
    const ced = cleanCedula(item.cedula_usuario || "");
    if (!ced) continue;
    if (seen.has(ced.toLowerCase())) continue;
    seen.add(ced.toLowerCase());
    unique.push({
      nombre_usuario: cleanName(item.nombre_usuario || ""),
      cedula_usuario: ced,
      discapacidad_usuario: cleanText(item.discapacidad_usuario || ""),
      genero_usuario: cleanText(item.genero_usuario || ""),
    });
  }
  return unique;
}
