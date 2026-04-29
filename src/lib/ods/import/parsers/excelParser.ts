import { cleanText, cleanName, cleanNit, cleanCedula, toIsoDate, normalizeText, isPersonCandidate } from "./common";

export type ExcelParseResult = {
  file_path: string;
  nit_empresa: string;
  nombre_empresa: string;
  fecha_servicio: string;
  nombre_profesional: string;
  candidatos_profesional: string[];
  modalidad_servicio: string;
  participantes: Array<Record<string, string>>;
  warnings: string[];
};

export async function parseActaExcel(fileBuffer: ArrayBuffer, filePath: string): Promise<ExcelParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let XLSX: any;
  try {
    XLSX = await import("xlsx");
  } catch {
    throw new Error("No se pudo importar xlsx. Instale el paquete xlsx.");
  }

  const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: true });
  const sheets = workbook.SheetNames.map((name: string) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" }) as unknown[][];
    return [name, rows] as [string, unknown[][]];
  });

  let nit = "";
  let empresa = "";
  let fecha_servicio = "";
  let profesional = "";
  let modalidad = "";
  const participants: Array<Record<string, string>> = [];
  const candidatosProfesional: string[] = [];

  for (const [, rows] of sheets) {
    if (!nit) {
      nit = extractNit(rows);
    }
    if (!empresa) {
      const empresaValue = findLabeledValue(rows, ["nombre de la empresa", "razon social"], true);
      empresa = cleanText(empresaValue);
    }
    if (!fecha_servicio) {
      const fechaValue = findLabeledValue(rows, [
        "fecha de la visita", "fecha servicio", "fecha de firma de contrato", "fecha firma de contrato",
      ], true);
      fecha_servicio = toIsoDate(fechaValue);
    }
    const sheetCandidates = extractAsistentesCandidates(rows);
    for (const candidate of sheetCandidates) {
      if (!candidatosProfesional.includes(candidate)) {
        candidatosProfesional.push(candidate);
      }
    }
    if (!profesional) {
      profesional = sheetCandidates[0] || extractProfesional(rows);
    }
    if (!modalidad) {
      const modalidadValue = findLabeledValue(rows, ["modalidad:", "modalidad"], true);
      modalidad = cleanText(modalidadValue);
    }

    participants.push(...extractParticipants(rows));
  }

  const dedupedParticipants = dedupeParticipants(participants);

  const warnings: string[] = [];
  if (!nit) warnings.push("No se detecto NIT en el archivo.");
  if (!fecha_servicio) warnings.push("No se detecto fecha de servicio en formato valido.");

  return {
    file_path: filePath,
    nit_empresa: nit,
    nombre_empresa: empresa,
    fecha_servicio,
    nombre_profesional: profesional,
    candidatos_profesional: candidatosProfesional,
    modalidad_servicio: modalidad,
    participantes: dedupedParticipants,
    warnings,
  };
}

function isLikelyLabel(text: string): boolean {
  if (!text || text.length > 70) return false;
  return text.endsWith(":") || ["nit", "fecha", "modalidad", "profesional"].some((t) => text.includes(t));
}

function firstNeighborValue(rows: unknown[][], r: number, c: number): unknown {
  for (let dc = 1; dc < 16; dc++) {
    const cc = c + dc;
    if (cc >= rows[r].length) break;
    const value = rows[r][cc];
    if (cleanText(value)) {
      if (cleanText(value).length > 60) continue;
      const norm = normalizeText(String(value));
      if (!isLikelyLabel(norm)) return value;
    }
  }
  for (let dr = 1; dr < 3; dr++) {
    const rr = r + dr;
    if (rr >= rows.length) break;
    for (const dc of [0, 1]) {
      const cc = c + dc;
      if (cc >= rows[rr].length) continue;
      const value = rows[rr][cc];
      if (cleanText(value)) {
        const norm = normalizeText(String(value));
        if (!isLikelyLabel(norm)) return value;
      }
    }
  }
  return null;
}

function findLabeledValue(rows: unknown[][], labelTokens: string[], startsWith = false): unknown {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const value = row[c];
      const norm = normalizeText(String(value));
      if (!norm || norm.length > 55) continue;
      const matched = startsWith
        ? labelTokens.some((token) => norm.startsWith(token))
        : labelTokens.some((token) => norm.includes(token));
      if (matched) {
        const neighbor = firstNeighborValue(rows, r, c);
        if (cleanText(neighbor)) return neighbor;
      }
    }
  }
  return null;
}

function extractProfesional(rows: unknown[][]): string {
  const labels = ["profesional asignado reca", "profesional asignado"];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const value = row[c];
      const norm = normalizeText(String(value));
      if (!norm || norm.length > 60) continue;
      if (!labels.some((token) => norm === token || norm.startsWith(token + ":"))) continue;
      const candidate = firstNeighborValue(rows, r, c);
      if (isPersonCandidate(candidate)) return cleanText(candidate);
    }
  }
  return "";
}

function extractAsistentesCandidates(rows: unknown[][]): string[] {
  let asistRow = -1;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (const value of row) {
      const norm = normalizeText(String(value));
      if (!norm) continue;
      if (/\b\d+\s*\.\s*asistentes\b/.test(norm) || norm === "asistentes" || norm.endsWith(" asistentes")) {
        asistRow = r;
        break;
      }
    }
    if (asistRow >= 0) break;
  }

  if (asistRow < 0) return [];

  const candidates: string[] = [];
  for (let rr = asistRow + 1; rr < Math.min(asistRow + 30, rows.length); rr++) {
    const row = rows[rr];
    if (!row || row.length === 0) continue;
    const rowNorm = row.map((cell) => normalizeText(String(cell)));
    const hasNombreLabel = rowNorm.some((cell) => cell && cell.includes("nombre completo"));
    if (!hasNombreLabel) continue;

    for (const raw of row) {
      const text = cleanText(raw);
      const norm = normalizeText(String(raw));
      if (norm.includes("nombre completo") && text.includes(":")) {
        const inline = text.split(":")[1].trim();
        if (isPersonCandidate(inline)) {
          candidates.push(inline);
          break;
        }
      }
    }

    for (const raw of row) {
      const value = cleanText(raw);
      const norm = normalizeText(String(raw));
      if (!value) continue;
      if (norm.includes("nombre completo")) continue;
      if (norm.includes("cargo") || norm.includes("firma")) continue;
      if (isPersonCandidate(value) && !candidates.includes(value)) {
        candidates.push(value);
        break;
      }
    }
  }

  return candidates;
}

function extractNit(rows: unknown[][]): string {
  const nitLabels = ["numero de nit", "nit empresa", "razon social / nit", "nit:"];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const value = row[c];
      const raw = cleanText(value);
      const norm = normalizeText(String(value));
      if (!raw || norm.length > 55) continue;
      if (!nitLabels.some((token) => norm.includes(token))) continue;
      const own = cleanNit(raw);
      if (/^\d{6,12}(?:-\d)?$/.test(own)) return own;
      for (let dc = 1; dc < 9; dc++) {
        const cc = c + dc;
        if (cc >= row.length) break;
        const candidate = cleanNit(row[cc]).replace(/[.\s]/g, "");
        if (/^\d{6,12}(?:-\d)?$/.test(candidate)) return candidate;
      }
      for (let dr = 1; dr < 4; dr++) {
        const rr = r + dr;
        if (rr >= rows.length) break;
        const rowRR = rows[rr];
        if (c < rowRR.length) {
          const candidate = cleanNit(rowRR[c]).replace(/[.\s]/g, "");
          if (/^\d{6,12}(?:-\d)?$/.test(candidate)) return candidate;
        }
      }
    }
  }
  return "";
}

function extractParticipants(rows: unknown[][]): Array<Record<string, string>> {
  const participants: Array<Record<string, string>> = [];
  const nameHeaders = [
    "nombre vinculado", "nombre completo", "nombres y apellidos",
    "nombre del vinculado", "nombre usuario", "nombre participante", "nombre oferente",
  ];
  const cedHeaders = ["cedula", "c.c", "cc", "documento"];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const normalized = row.map((cell) => normalizeText(String(cell)));
    const nameCol = normalized.findIndex((cell) => nameHeaders.some((token) => cell.includes(token)));
    if (nameCol === -1) continue;
    const cedCol = normalized.findIndex((cell) => cedHeaders.some((token) => cell.includes(token)));
    if (cedCol === -1) continue;
    const discapacidadCol = normalized.findIndex((cell) => cell.includes("discapacidad"));
    const generoCol = normalized.findIndex((cell) => cell.includes("genero") || cell.includes("sexo"));

    let emptyStreak = 0;
    for (let j = idx + 1; j < Math.min(idx + 120, rows.length); j++) {
      const current = rows[j];
      const cedRaw = cedCol < current.length ? current[cedCol] : "";
      const ced = cleanCedula(cedRaw);

      if (!ced) {
        emptyStreak++;
        if (emptyStreak >= 4) break;
        continue;
      }
      emptyStreak = 0;
      if (ced.length < 5) continue;

      const nameRaw = nameCol < current.length ? current[nameCol] : "";
      const discapacidadRaw = discapacidadCol >= 0 && discapacidadCol < current.length ? current[discapacidadCol] : "";
      const generoRaw = generoCol >= 0 && generoCol < current.length ? current[generoCol] : "";

      participants.push({
        nombre_usuario: cleanName(nameRaw),
        cedula_usuario: ced,
        discapacidad_usuario: cleanText(discapacidadRaw),
        genero_usuario: cleanText(generoRaw),
      });
    }
  }
  return participants;
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
