import { cleanText, cleanName, normalizeText, splitJoinedCedulaPhone } from "./common";

export function extractPdfFollowUpNumber(text: string): string {
  let lastNumber = "";
  for (const match of text.matchAll(/seguimiento\s*(?<number>[1-9])\s*:\s*(?<date>[0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{4})/gi)) {
    if (match.groups && match.groups.date) {
      const dateParts = match.groups.date.split(/[\/-]/);
      if (dateParts.length === 3) {
        lastNumber = match.groups.number;
      }
    }
  }
  return lastNumber;
}

export function extractNameFromFollowUpFilename(stem: string): string {
  const suffixMatch = stem.match(/\s*-\s*\d{2}_[A-Za-z]{3,4}_\d{4}$/);
  if (!suffixMatch) return "";
  const prefix = stem.slice(0, suffixMatch.index);
  if (!prefix.includes(" - ")) return "";
  const name = prefix.split(" - ").pop() || "";
  return cleanName(name.replace(/^\(\d+\)\s*/, ""));
}

export function extractFollowUpParticipantFromFilename(text: string, filePath: string): Array<Record<string, string>> {
  if (!normalizeText(text).includes("seguimiento al proceso de inclusion laboral")) return [];

  const cedulaMatch = text.match(/(?<cedula_phone>\d{17,22})/i);
  const discapacidadMatch = text.match(/Si\s+(?:\d{1,3}(?:[.,]\d{1,2})?%?|No refiere|No aplica\.)\s+Discapacidad\s+(?<discapacidad>.+?)(?=\s+(?:Contrato de trabajo|Seguimiento\s*[1-9]:|\d{1,2}\/\d{1,2}\/\d{4}\b)|$)/is);

  if (!cedulaMatch || !discapacidadMatch || !discapacidadMatch.groups) return [];

  const path = filePath;
  const lastSlash = path.lastIndexOf("/");
  const lastBackslash = path.lastIndexOf("\\");
  const separator = Math.max(lastSlash, lastBackslash);
  const fileName = separator >= 0 ? path.slice(separator + 1) : path;
  const stem = fileName.replace(/\.[^.]+$/, "");

  const nombre = extractNameFromFollowUpFilename(stem);
  const [cedula] = splitJoinedCedulaPhone(cedulaMatch.groups?.cedula_phone || "");
  const discapacidad = cleanText(discapacidadMatch.groups.discapacidad);

  if (!nombre || !cedula) return [];

  return [{
    nombre_usuario: nombre,
    cedula_usuario: cedula,
    discapacidad_usuario: discapacidad,
    genero_usuario: "",
  }];
}
