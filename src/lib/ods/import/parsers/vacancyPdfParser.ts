import { cleanText, normalizeText } from "./common";
import { extractPdfValue } from "./generalPdfParser";

export function extractPdfVacancyFields(text: string): [string, number] {
  const cargo = extractPdfValue(
    text,
    /nombre de la vacante:\s*(.+?)(?:n[uú]mero de vacantes:|nivel del cargo:|g[eé]nero:|edad:|modalidad de trabajo:|lugar de trabajo:|$)/is
  );

  let total_vacantes = 0;
  const vacantesRaw = extractPdfValue(
    text,
    /n[uú]mero de vacantes:\s*(.+?)(?:nivel del cargo:|g[eé]nero:|edad:|modalidad de trabajo:|lugar de trabajo:|salario asignado:|$)/is
  );
  const vacantesMatch = vacantesRaw.match(/\d+/);
  if (vacantesMatch) {
    total_vacantes = parseInt(vacantesMatch[0], 10);
  }

  return [cleanText(cargo), total_vacantes];
}

export function extractPdfSelectionCargo(text: string): string {
  const sectionMatch = text.match(/2\.\s*datos del oferente(?<section>.*?)(?:(?<!\d)3\.\s*\S|4\.\s*caracterizaci[oó]n del oferente|$)/is);
  const section = sectionMatch && sectionMatch.groups ? sectionMatch.groups.section : text;
  const compact = section.replace(/\s+/g, " ");

  const headerMatch = compact.match(
    /cargo\s*contacto de emergencia\s*parentesco\s*tel[eé]fono(?:\s*fecha de nacimiento\s*edad)?\s*(?<tail>.+?)(?:(?:[¿?]pendiente otros oferentes|lugar firma de contrato|fecha firma de contrato|3\.|$))/is
  );
  if (headerMatch && headerMatch.groups) {
    let tail = cleanText(headerMatch.groups.tail);
    tail = tail.replace(/(?<=[a-z\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00F1])(?=[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1])/g, " ");
    const contactMatch = tail.match(
      /^(?<cargo>.+?)\s+(?<contacto>[A-Z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1][a-z\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00F1]+(?:\s+[A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00F1]+){0,4})\s+(?<parentesco>Madre|Padre|Hermana|Hermano|Pareja|Esposa|Esposo|Amiga|Amigo|Mam[aá]|Papa|Pap[aá]|Tia|T[ií]o|Abuela|Abuelo)\b/
    );
    const cargo = contactMatch && contactMatch.groups ? cleanText(contactMatch.groups.cargo) : cleanText(tail);
    if (cargo) return cargo;
  }

  const cargo = extractPdfValue(
    section,
    /cargo\s+(?<value>.+?)(?:contacto de emergencia|parentesco|tel[eé]fono|fecha de nacimiento|edad|[¿?]pendiente otros oferentes|lugar firma de contrato|fecha firma de contrato|$)/is
  );
  if (normalizeText(cargo).startsWith("contacto de emergencia")) return "";
  return cleanText(cargo);
}
