import { cleanText, cleanName, cleanCedula, normalizeText, isPersonCandidate, extractCedulaFromOferenteToken } from "./common";

export function extractPdfGroupalOferenteChunks(text: string): Array<Record<string, string>> {
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
  return dedupeOferenteParticipants(participants);
}

export function extractSelectionCargoFromSection(text: string): string {
  const sectionMatch = text.match(/2\.\s*datos del oferente(?<section>.*?)(?:(?<!\d)3\.\s*\S|4\.\s*caracterizaci[oó]n del oferente|$)/is);
  const section = sectionMatch && sectionMatch.groups ? sectionMatch.groups.section : text;
  const compact = section.replace(/\s+/g, " ");

  const headerMatch = compact.match(/cargo\s*contacto de emergencia\s*parentesco\s*tel[eé]fono(?:\s*fecha de nacimiento\s*edad)?\s*(?<tail>.+?)(?:(?:[¿?]pendiente otros oferentes|lugar firma de contrato|fecha firma de contrato|3\.|$))/is);
  if (headerMatch && headerMatch.groups) {
    let tail = cleanText(headerMatch.groups.tail);
    tail = tail.replace(/(?<=[a-z\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00F1])(?=[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1])/g, " ");
    const contactMatch = tail.match(/^(?<cargo>.+?)\s+(?<contacto>[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][a-z\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00F1]+(?:\s+[A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00F1]+){0,4})\s+(?<parentesco>Madre|Padre|Hermana|Hermano|Pareja|Esposa|Esposo|Amiga|Amigo|Mam[aá]|Papa|Pap[aá]|Tia|T[ií]o|Abuela|Abuelo)\b/);
    const cargo = contactMatch && contactMatch.groups ? cleanText(contactMatch.groups.cargo) : cleanText(tail);
    if (cargo) return cargo;
  }

  const cargoMatch = section.match(/cargo\s+(?<value>.+?)(?:contacto de emergencia|parentesco|tel[eé]fono|fecha de nacimiento|edad|[¿?]pendiente otros oferentes|lugar firma de contrato|fecha firma de contrato|$)/is);
  if (cargoMatch && cargoMatch.groups) {
    const cargo = cleanText(cargoMatch.groups.value);
    if (normalizeText(cargo).startsWith("contacto de emergencia")) return "";
    return cargo;
  }
  return "";
}

function dedupeOferenteParticipants(participants: Array<Record<string, string>>): Array<Record<string, string>> {
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
