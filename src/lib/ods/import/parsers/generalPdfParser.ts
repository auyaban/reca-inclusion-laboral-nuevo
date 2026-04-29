import {
  cleanText,
  cleanName,
  cleanNit,
  cleanCedula,
  toIsoDate,
  normalizeText,
  isPersonCandidate,
  companyFromEmailDomain,
  extractCedulaFromOferenteToken,
} from "./common";
import type { ParserTrace } from "./parserTrace";
import { createParserTrace, recordPatternAttempt, recordPatternFailure, recordParticipantSource } from "./parserTrace";
import type { ExtractionErrors } from "./extractionErrors";

export type GeneralPdfFields = {
  nombre_empresa: string;
  fecha_servicio: string;
  modalidad_servicio: string;
  nit_empresa: string;
  nits_empresas: string[];
  nombre_profesional: string;
  asistentes: string[];
  participantes: Array<Record<string, string>>;
  cargo_objetivo: string;
  total_vacantes: number;
  numero_seguimiento: string;
};

export function extractPdfGeneralFields(firstPage: string): {
  empresa: string;
  fecha_servicio: string;
  modalidad: string;
} {
  const headerText = firstPage.replace(
    /(?<!\n)(fecha de la visita:|modalidad:|nombre de la empresa:|ciudad\/municipio:|direcci[oó]n de la empresa:|n[uú]mero de nit:|correo electr[oó]nico:|tel[eé]fonos:|contacto de la empresa:|empresa afiliada a caja(?:de)? compensaci[oó]n:|sede compensar:|asesor:|profesional asignado\s*reca:)/gi,
    "\n$1"
  );

  const empresa = extractPdfValue(
    headerText,
    /nombre de la empresa:\s*([^\n]+?)(?:\s*(?:ciudad\/municipio:|direcci[oó]n de la empresa:|n[uú]mero de nit:|correo electr[oó]nico:|tel[eé]fonos:|contacto de la empresa:|empresa afiliada a caja(?:de)? compensaci[oó]n:|$))/i
  );
  const fechaRaw = extractPdfValue(headerText, /fecha de la visita:\s*([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{4})/i);
  const fecha_servicio = toIsoDate(fechaRaw);
  const modalidad = extractPdfValue(
    headerText,
    /modalidad:\s*([^\n]+?)(?:\s*(?:nombre de la empresa:|ciudad\/municipio:|direcci[oó]n de la empresa:|n[uú]mero de nit:|correo electr[oó]nico:|tel[eé]fonos:|$))/i
  ).replace(/\.$/, "");

  let finalEmpresa = empresa;
  if (normalizeText(finalEmpresa).match(/^(nombre de la empresa|direccion de la empresa)/)) {
    finalEmpresa = "";
  }

  if (finalEmpresa && fecha_servicio && modalidad) {
    return { empresa: finalEmpresa, fecha_servicio, modalidad };
  }

  const lines = firstPage.split(/\r?\n/).map((l) => cleanText(l)).filter(Boolean);
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const normalized = normalizeText(line);
    if (!normalized.includes("modalidad:")) continue;

    let finalFecha = fecha_servicio;
    if (!finalFecha) {
      const dateMatch = line.match(/([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{4})\s+modalidad:/i);
      if (dateMatch) {
        finalFecha = toIsoDate(dateMatch[1]);
      }
    }

    let finalModalidad = modalidad;
    if (!finalModalidad) {
      const modMatch = line.match(/modalidad:\s*(.+)$/i);
      if (modMatch) {
        finalModalidad = cleanText(modMatch[1]).replace(/\.$/, "");
      }
    }

    let finalEmpresa2 = finalEmpresa;
    if (!finalEmpresa2 && idx + 1 < lines.length) {
      const nextLine = lines[idx + 1];
      if (normalizeText(nextLine).includes("ciudad/municipio:")) {
        finalEmpresa2 = cleanText(nextLine.split(/ciudad\/municipio:/i)[0]);
      }
    }

    if (!finalEmpresa2 || normalizeText(finalEmpresa2).match(/^(nombre de la empresa|direccion de la empresa)/)) {
      finalEmpresa2 = companyFromEmailDomain(headerText);
    }

    return { empresa: finalEmpresa2 || finalEmpresa, fecha_servicio: finalFecha || fecha_servicio, modalidad: finalModalidad || modalidad };
  }

  if (!finalEmpresa || normalizeText(finalEmpresa).match(/^(nombre de la empresa|direccion de la empresa)/)) {
    finalEmpresa = companyFromEmailDomain(headerText);
  }

  return { empresa: finalEmpresa, fecha_servicio, modalidad };
}

export function extractPdfValue(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  if (!match) return "";
  return cleanText(match[1]);
}

export function extractPdfNits(text: string): string[] {
  const labeledMatches = text.match(
    /(?:numero de nit|n[uú]mero de nit|nit empresa|razon social \/ nit|nit)\s*:\s*([0-9.\- ]+)/gi
  ) || [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const fullMatch of labeledMatches) {
    const nitMatch = fullMatch.match(/:\s*([0-9.\- ]+)/i);
    if (!nitMatch) continue;
    const clean = cleanNit(nitMatch[1]);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    result.push(clean);
  }
  if (result.length > 0) return result;

  for (const nit of text.match(/\d{6,12}(?:-\d)?/g) || []) {
    const digits = nit.replace(/\D/g, "");
    if (digits.length === 10 && digits.startsWith("3")) continue;
    const clean = cleanNit(nit);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    result.push(clean);
  }
  return result;
}

export function extractPdfParticipants(fullText: string, trace?: ParserTrace, errors?: ExtractionErrors): Array<Record<string, string>> {
  const t = trace || createParserTrace("pdf");

  // 1. Groupal oferente chunks
  recordPatternAttempt(t, "groupal_oferente_chunks");
  const chunkParticipants = extractPdfGroupalOferenteChunks(fullText);
  if (chunkParticipants.length > 0) {
    recordParticipantSource(t, "groupal_oferente_chunks");
    return dedupeParticipants(chunkParticipants);
  }
  recordPatternFailure(t, "groupal_oferente_chunks", "No se encontraron bloques OFERENTE N");

  // 2. Block-based extraction from oferentes section
  recordPatternAttempt(t, "block_pattern");
  const searchText = extractPdfOferentesSection(fullText);
  const blockParticipants = extractPdfParticipantsFromBlocks(searchText);
  if (blockParticipants.length > 0) {
    recordParticipantSource(t, "block_pattern");
    return dedupeParticipants(blockParticipants);
  }
  recordPatternFailure(t, "block_pattern", "No se encontraron participantes en bloques numerados");

  // 3. Inline pattern
  recordPatternAttempt(t, "inline_pattern");
  const inlineParticipants = extractPdfInlineParticipants(searchText);
  if (inlineParticipants.length > 0) {
    recordParticipantSource(t, "inline_pattern");
    return dedupeParticipants(inlineParticipants);
  }
  recordPatternFailure(t, "inline_pattern", "No se encontro patron inline de oferente");

  // 4. Contract pattern
  recordPatternAttempt(t, "contract_pattern");
  const contractParticipants = extractPdfContractParticipants(searchText);
  if (contractParticipants.length > 0) {
    recordParticipantSource(t, "contract_pattern");
    return dedupeParticipants(contractParticipants);
  }
  recordPatternFailure(t, "contract_pattern", "No se encontro patron de contrato");

  // 5. Line pattern (fallback)
  recordPatternAttempt(t, "line_pattern");
  const lineParticipants = extractPdfLineParticipants(fullText);
  if (lineParticipants.length > 0) {
    recordParticipantSource(t, "line_pattern");
    return dedupeParticipants(lineParticipants);
  }
  recordPatternFailure(t, "line_pattern", "No se encontro patron de linea con Discapacidad");

  // 6. Follow-up pattern
  recordPatternAttempt(t, "follow_up_pattern");
  const followUpParticipants = extractPdfFollowUpParticipants(fullText);
  if (followUpParticipants.length > 0) {
    recordParticipantSource(t, "follow_up_pattern");
    return dedupeParticipants(followUpParticipants);
  }
  recordPatternFailure(t, "follow_up_pattern", "No se encontro patron de seguimiento");

  if (errors) {
    errors.participantes = {
      reason: "No se pudieron extraer participantes con ningun patron conocido",
      attempted_patterns: t.patterns_attempted,
    };
  }

  return [];
}

function extractPdfGroupalOferenteChunks(text: string): Array<Record<string, string>> {
  const pattern = /OFERENTE\s+(?<label_idx>[1-9])\s*(?:CITADO\s+A\s+ENTREVISTA.*?DISCAPACIDAD)?\s*(?<row_idx>[1-9])\s*(?<nombre>.+?)(?<token>\d[\d.,% ]*(?:No\s*aplica\.)?)\s*Discapacidad\s+(?<discapacidad>[^0-9]+?)\s*(?<telefonos>\d[\d\s-]{6,30})?\s*(?<resultado>Pendiente|Aprobado|No aprobado)(?=\s*CARGO|4\.)/gis;
  const participants: Array<Record<string, string>> = [];
  for (const match of text.matchAll(pattern)) {
    const nombre = cleanName(match.groups?.nombre || "");
    const cedula = extractCedulaFromOferenteToken(match.groups?.token || "");
    if (!nombre || !cedula || !isPersonCandidate(nombre)) continue;
    participants.push({
      nombre_usuario: nombre,
      cedula_usuario: cedula,
      discapacidad_usuario: cleanText(match.groups?.discapacidad || ""),
      genero_usuario: "",
    });
  }
  return dedupeParticipants(participants);
}

function extractPdfOferentesSection(text: string): string {
  const match = text.match(/(?<!\d)2\.\s*datos del oferente(?<section>.*?)(?=(?<!\d)3\.\s*\S)/gis);
  if (!match) return text;
  const sectionMatch = text.match(/(?<!\d)2\.\s*datos del oferente(?<section>.*?)(?=(?<!\d)3\.\s*\S)/is);
  if (sectionMatch && sectionMatch.groups) return cleanText(sectionMatch.groups.section);
  return text;
}

function extractPdfParticipantsFromBlocks(searchText: string): Array<Record<string, string>> {
  const blockRe = /(?:^|\n)\s*([1-9])\s+(.*?)(?=(?:\n\s*[1-9]\s+[A-Z])|\Z)/gms;
  const participants: Array<Record<string, string>> = [];
  for (const match of searchText.matchAll(blockRe)) {
    const body = cleanText(match[2]);
    const strictParticipant = extractStrictParticipantFromBlock(body);
    if (strictParticipant) {
      participants.push(strictParticipant);
      continue;
    }
    const looseParticipant = extractLooseParticipantFromBlock(body);
    if (looseParticipant) {
      participants.push(looseParticipant);
    }
  }
  return participants;
}

function extractStrictParticipantFromBlock(body: string): Record<string, string> | null {
  if (!normalizeText(body).includes("discapacidad")) return null;
  const firstLine = body.split(" Agente de ")[0];
  const firstMatch = firstLine.match(/^(?<nombre>.+?)(?<token>\d{7,13}(?:[.,]\d{1,2})?%?)(?:\s*)Discapacidad\s+(?<tail>.+)$/i);
  if (!firstMatch || !firstMatch.groups) return null;
  const nombre = cleanName(firstMatch.groups.nombre);
  if (!nombre || !isPersonCandidate(nombre)) return null;
  const cedula = extractCedulaFromOferenteToken(firstMatch.groups.token);
  if (!cedula) return null;
  const tail = cleanText(firstMatch.groups.tail);
  const tailMatch = tail.match(/^(?<discapacidad>[^0-9]+?)(?<telefono>\d[\d ]{6,15})(?<resultado>Pendiente|Aprobado|No aprobado|No aplica)/i);
  if (!tailMatch || !tailMatch.groups) return null;
  return {
    nombre_usuario: nombre,
    cedula_usuario: cedula,
    discapacidad_usuario: cleanText(tailMatch.groups.discapacidad),
    genero_usuario: "",
  };
}

function extractLooseParticipantFromBlock(body: string): Record<string, string> | null {
  const compact = cleanText(body);
  if (!compact) return null;
  const nameMatch = compact.match(/^(?<nombre>[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00DC\u00F1' .-]{6,}?)(?<rest>\d.*)$/);
  if (!nameMatch || !nameMatch.groups) return null;
  const nombre = cleanName(nameMatch.groups.nombre);
  const rest = nameMatch.groups.rest || "";
  const tokenWindow = rest.split(/(?:Discapacidad|Cra\.\s*|CARGO\b|CONTACTO\b|PARENTESCO\b|TEL[EÉ]FONO\b|FECHA DE NACIMIENTO\b|EDAD\b|Pendiente|Aprobado|No aprobado|No aplica|[¿?]|4\.\s*CARACTERIZACI)/)[0];
  const cedula = extractCedulaFromOferenteToken(tokenWindow.slice(0, 40));
  if (!nombre || !cedula || !isPersonCandidate(nombre)) return null;

  let discapacidad = "";
  for (const window of [rest.slice(0, 220), compact.slice(0, 420)]) {
    const discMatch = window.match(/Discapacidad\s+(?<value>.+?)(?=(?:\d{7,12}|Pendiente|Aprobado|No aprobado|No aplica|CARGO\b|CONTACTO\b|PARENTESCO\b|TEL[EÉ]FONO\b|FECHA DE NACIMIENTO\b|EDAD\b|OBSERVACIONES\b|[¿?]|OFERENTE\s+[1-9]|4\.\s*CARACTERIZACI|$))/is);
    if (discMatch && discMatch.groups) {
      discapacidad = cleanText(discMatch.groups.value);
      break;
    }
  }

  return {
    nombre_usuario: nombre,
    cedula_usuario: cedula,
    discapacidad_usuario: discapacidad,
    genero_usuario: "",
  };
}

function extractPdfInlineParticipants(searchText: string): Array<Record<string, string>> {
  const pattern = /(?<!\d)(?<idx>[1-9])\s+(?<nombre>.+?)(?<token>\d{7,13}(?:[.,]\d{1,2})?%?)(?:\s*)Discapacidad\s+(?<tail>.*?)(?=(?:(?<!\d)[1-9]\s+\S)|(?:(?<!\d)[3-9]\.\s*\S)|\Z)/gis;
  const participants: Array<Record<string, string>> = [];
  for (const match of searchText.matchAll(pattern)) {
    const nombre = cleanName(match.groups?.nombre || "");
    if (!nombre || !isPersonCandidate(nombre)) continue;
    const cedula = extractCedulaFromOferenteToken(match.groups?.token || "");
    if (!cedula) continue;
    const tail = cleanText(match.groups?.tail || "");
    const tailMatch = tail.match(/^(?<discapacidad>[^0-9]+?)(?<telefono>\d[\d ]{6,15})(?<resultado>Pendiente|Aprobado|No aprobado)/i);
    if (!tailMatch) continue;
    participants.push({
      nombre_usuario: nombre,
      cedula_usuario: cedula,
      discapacidad_usuario: cleanText(tailMatch.groups?.discapacidad || ""),
      genero_usuario: "",
    });
  }
  return participants;
}

function extractPdfContractParticipants(searchText: string): Array<Record<string, string>> {
  const pattern = /(?:^|\n)\s*(?<idx>[1-9])\s+(?<nombre>.+?)(?<token>\d{7,13}(?:[.,]\d{1,2})?%?)\s*Discapacidad\s+(?<discapacidad>[^0-9]+?)(?<telefono>\d[\d ]{6,15})(?=\s*(?:Masculino|Femenino|Otro)\b)/gims;
  const participants: Array<Record<string, string>> = [];
  for (const match of searchText.matchAll(pattern)) {
    const nombre = cleanName(match.groups?.nombre || "");
    if (!nombre || !isPersonCandidate(nombre)) continue;
    const cedula = extractCedulaFromOferenteToken(match.groups?.token || "");
    if (!cedula) continue;
    participants.push({
      nombre_usuario: nombre,
      cedula_usuario: cedula,
      discapacidad_usuario: cleanText(match.groups?.discapacidad || ""),
      genero_usuario: "",
    });
  }
  return participants;
}

function extractPdfLineParticipants(text: string): Array<Record<string, string>> {
  const linePattern = /(?<nombre>[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1a-z\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00DC\u00F1' .-]{8,}?)\s+(?<cedula>\d{6,12})\s+Discapacidad\s+(?<discapacidad>.+?)\s+(?<telefono>\d[\d ]{6,15})\s+(?<resultado>Pendiente|Aprobado|No aprobado)\b/i;
  const participants: Array<Record<string, string>> = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = cleanText(rawLine);
    if (!normalizeText(line).includes("discapacidad")) continue;
    const match = line.match(linePattern);
    if (!match || !match.groups) continue;
    const nombre = cleanName(match.groups.nombre);
    const cedula = cleanCedula(match.groups.cedula);
    if (!nombre || !cedula || !isPersonCandidate(nombre)) continue;
    participants.push({
      nombre_usuario: nombre,
      cedula_usuario: cedula,
      discapacidad_usuario: cleanText(match.groups.discapacidad),
      genero_usuario: "",
    });
  }
  return participants;
}

function extractPdfFollowUpParticipants(text: string): Array<Record<string, string>> {
  const patterns = [
    /persona que atiende la\s*visita.*?(?<nombre>[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00DC\u00F1' .-]{8,}?)(?<cedula_phone>\d{17,22})(?<email>[\w.+-]+@[\w.-]+)(?<contacto>[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00DC\u00F1' .-]{4,})(?:Hermana|Hermano|Madre|Padre|Esposa|Esposo|Pareja|Amiga|Amigo|Tia|Tio|Prima|Primo)\s+\d{7,12}\s+(?<cargo>.+?)\s+Si\s+No aplica\.\s+Discapacidad\s+(?<discapacidad>.+?)(?=\s+\d{1,2}\/\d{1,2}\/\d{4}\b)/gis,
    /(?<nombre>[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00DC\u00F1' .-]{8,}?)(?<cedula_phone>\d{17,22})(?<email>[\w.+-]+@[\w.-]+)(?<contacto>[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00DC\u00F1' .-]{4,}?)(?:Hermana|Hermano|Madre|Padre|Esposa|Esposo|Pareja|Amiga|Amigo|Tia|Tio|Prima|Primo)\s+\d{7,12}\s+(?<cargo>.+?)\s+Si\s+No aplica\.\s+Discapacidad\s+(?<discapacidad>.+?)(?=\s+(?:Seguimiento\s*[1-9]:|\d{1,2}\/\d{1,2}\/\d{4}\b)|$)/gis,
    /(?<nombre>[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00DC\u00F1' .-]{8,}?)(?<cedula_phone>\d{17,22})(?<email>[\w.+-]+@[\w.-]+)(?<contacto>[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00DC\u00F1' .-]{4,}?)(?:Hermana|Hermano|Madre|Padre|Esposa|Esposo|Pareja|Amiga|Amigo|Tia|Tio|Prima|Primo)\s+\d{7,12}\s+(?<cargo>.+?)\s+Si\s+(?:(?<porcentaje>\d{1,3}(?:[.,]\d{1,2})?)|No refiere|No aplica\.)\s+Discapacidad\s+(?<discapacidad>.+?)(?=\s+(?:Contrato de trabajo|Seguimiento\s*[1-9]:|\d{1,2}\/\d{1,2}\/\d{4}\b)|$)/gis,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const fullMatch = text.match(pattern);
    if (!fullMatch) continue;
    const reExec = pattern.exec(text);
    if (!reExec || !reExec.groups) continue;
    const nombre = cleanName(reExec.groups.nombre);
    const [cedula] = splitJoinedCedulaPhone(reExec.groups.cedula_phone || "");
    const discapacidad = cleanText(reExec.groups.discapacidad || "");
    if (nombre && cedula && isPersonCandidate(nombre)) {
      return [{
        nombre_usuario: nombre,
        cedula_usuario: cedula,
        discapacidad_usuario: discapacidad,
        genero_usuario: "",
      }];
    }
  }
  return [];
}

function dedupeParticipants(participants: Array<Record<string, string>>): Array<Record<string, string>> {
  const seen = new Set<string>();
  const unique: Array<Record<string, string>> = [];
  for (const item of participants) {
    const ced = cleanCedula(item.cedula_usuario || "");
    if (!ced) continue;
    const key = ced.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({
      nombre_usuario: cleanName(item.nombre_usuario || ""),
      cedula_usuario: ced,
      discapacidad_usuario: cleanText(item.discapacidad_usuario || ""),
      genero_usuario: cleanText(item.genero_usuario || ""),
    });
  }
  return unique;
}

export function extractPdfAsistentesCandidates(text: string): string[] {
  function collect(sourceText: string): string[] {
    const found: string[] = [];
    const normalized = sourceText.replace(/(?<!\n)(nombre completo:)/gi, "\n$1");
    for (const rawLine of normalized.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || !line.toLowerCase().includes("nombre completo:")) continue;
      const explicitName = line.match(/nombre completo:\s*(?<nombre>[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00DC\u00F1' -]+?)(?=(?:\s*cargo:|\s+profesional\b|\s+lider\b|\s+coordinacion\b|\s+psicolog[a\u00E1]\b|$))/i);
      if (explicitName && explicitName.groups) {
        const candidate = cleanName(explicitName.groups.nombre);
        if (candidate && isPersonCandidate(candidate) && !found.includes(candidate)) {
          found.push(candidate);
        }
        continue;
      }
      for (const chunk of line.split(/nombre completo:\s*/i)) {
        const candidate = cleanName(chunk.split(/cargo:\s*/i)[0]);
        if (candidate && isPersonCandidate(candidate) && !found.includes(candidate)) {
          found.push(candidate);
        }
      }
    }
    return found;
  }

  const startMatch = text.match(/\b\d+\.\s*asistentes\b/i);
  const asistentesText = startMatch ? text.slice(startMatch.index!) : text;
  const candidates = collect(asistentesText);
  if (candidates.length > 0 || !startMatch) return candidates;
  return collect(text);
}
