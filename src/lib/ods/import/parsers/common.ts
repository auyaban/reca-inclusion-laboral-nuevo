export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

export function cleanCedula(value: unknown): string {
  const raw = cleanText(value);
  if (!raw) return "";
  return raw.replace(/\D/g, "");
}

export function cleanNit(value: unknown): string {
  const raw = cleanText(value);
  if (!raw) return "";
  const match = raw.match(/\d{6,12}(?:-\d)?/);
  return match ? match[0] : raw;
}

export function cleanName(value: unknown): string {
  const text = cleanText(value);
  return text.replace(/\s+/g, " ").trim().replace(/^[ .:-]+|[ .:-]+$/g, "");
}

export function normalizeText(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPersonCandidate(value: unknown): boolean {
  const text = cleanText(value);
  if (!text || text.length < 3) return false;
  if (/(https?:\/\/|www\.|@[a-z0-9._-]+|\.com\b|\.org\b|\.net\b|\.co\b)/i.test(text)) return false;
  const norm = normalizeText(text);
  const banned = [
    "codigo", "tema", "version", "correo", "telefono", "nit",
    "empresa", "fecha", "modalidad", "objetivo", "cargo",
    "sede", "asesor", "direccion", "ciudad",
  ];
  if (banned.some((token) => norm.includes(token))) return false;
  return /[a-zA-Z\u00C0-\u024F]/.test(text);
}

export function looksLikePersonNameForCompany(value: unknown): boolean {
  const text = cleanName(value);
  if (!text || !isPersonCandidate(text)) return false;
  const norm = normalizeText(text);
  const companyMarkers = [
    "sas", "s a s", "sa", "ltda", "ips", "eps", "sucursal",
    "grupo", "group", "consult", "seguros", "rehabilit",
    "colombia", "partners", "soluciones", "solutions",
    "fundacion", "universidad", "clinica", "hospital",
    "colegio", "empresa",
  ];
  if (companyMarkers.some((m) => norm.includes(m))) return false;
  const tokens = text.split(/\s+/).filter(Boolean);
  return tokens.length >= 2 && tokens.length <= 4 && tokens.every((t) => /[a-zA-Z\u00C0-\u024F]/.test(t));
}

export function toIsoDate(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    return value.toISOString().split("T")[0];
  }

  const text = cleanText(value).split(" ")[0];
  if (!text) return "";

  const formats = [
    { re: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, order: "ymd" as const },
    { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: "dmy" as const },
    { re: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, order: "dmy" as const },
    { re: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, order: "ymd" as const },
  ];

  for (const fmt of formats) {
    const m = text.match(fmt.re);
    if (!m) continue;
    let year: number, month: number, day: number;
    if (fmt.order === "ymd") {
      year = parseInt(m[1], 10);
      month = parseInt(m[2], 10);
      day = parseInt(m[3], 10);
    } else {
      day = parseInt(m[1], 10);
      month = parseInt(m[2], 10);
      year = parseInt(m[3], 10);
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      return d.toISOString().split("T")[0];
    }
  }
  return "";
}

export function splitJoinedCedulaPercentage(rawToken: string): [string, string] {
  const match = rawToken.match(/(\d+)(?:([.,])(\d{1,2}))?%?/);
  if (!match) return ["", ""];

  const digits = match[1].replace(/\D/g, "");
  const decimals = match[3];
  const separator = match[2] || ".";

  type Candidate = [number, number, string, string];
  const candidates: Candidate[] = [];

  for (const pctLen of [2, 1, 3] as const) {
    if (digits.length <= pctLen) continue;
    const cedula = digits.slice(0, -pctLen);
    const percentageInt = digits.slice(-pctLen);
    if (cedula.length < 6 || cedula.length > 10) continue;
    const percentageValue = parseInt(percentageInt, 10);
    if (percentageValue < 0 || percentageValue > 100) continue;
    let score = 0;
    if (pctLen === 2) score += 5;
    if (cedula.length >= 8) score += 2;
    if (percentageValue > 0) score += 1;
    const percentage = decimals !== undefined ? `${percentageValue}${separator}${decimals}%` : `${percentageValue}%`;
    candidates.push([score, cedula.length, cedula, percentage]);
  }

  if (candidates.length === 0) return ["", ""];
  const [, , cedula, percentage] = candidates.reduce((best, cur) => (cur[0] > best[0] || (cur[0] === best[0] && cur[1] > best[1]) ? cur : best));
  return [cedula, percentage];
}

export function splitJoinedCedulaPhone(rawDigits: string): [string, string] {
  const digits = (rawDigits || "").replace(/\D/g, "");
  if (digits.length < 17) return ["", ""];
  for (const cedulaLen of [10, 9, 8, 7]) {
    if (digits.length <= cedulaLen) continue;
    const cedula = digits.slice(0, cedulaLen);
    const phone = digits.slice(cedulaLen);
    if (phone.length === 10 && phone.startsWith("3")) {
      return [cedula, phone];
    }
  }
  return ["", ""];
}

export function extractCedulaFromOferenteToken(rawToken: string): string {
  const token = cleanText(rawToken);
  if (!token) return "";
  const digits = token.replace(/\D/g, "");
  if (token.includes("%") || /\d+[.,]\d/.test(token) || digits.length > 10) {
    const [cedula] = splitJoinedCedulaPercentage(token);
    if (cedula) return cedula;
  }
  const match = token.match(/\d{6,12}/);
  return match ? cleanCedula(match[0]) : "";
}

export function companyFromEmailDomain(text: string): string {
  const emailMatch = (text || "").match(/[\w.+-]+@([a-z0-9.-]+?\.(?:com\.co|edu\.co|org\.co|net\.co|com|org|net|co))/i);
  if (!emailMatch) return "";
  const domain = emailMatch[1].split(".")[0];
  let pieces = domain.split(/[-_.]+/);
  if (pieces.length === 1) {
    let collapsed = pieces[0];
    for (const marker of [
      "rehabilitacion", "consulting", "seguros", "colombia",
      "partners", "solutions", "soluciones", "salud",
      "industrial", "tecnologia", "tecnologias", "servicios", "logistica",
    ]) {
      collapsed = collapsed.replace(new RegExp(marker, "gi"), ` ${marker}`);
    }
    pieces = collapsed.split(/\s+/).filter(Boolean);
  }
  return cleanName(pieces.map((p) => p.toUpperCase()).join(" "));
}

export function parseDurationHours(rawValue: string): number | null {
  const text = normalizeText(rawValue || "");
  if (!text) return null;
  const match = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  try {
    const amount = parseFloat(match[1].replace(",", "."));
    if (!isFinite(amount)) return null;
    if (text.includes("min")) return Math.round((amount / 60) * 100) / 100;
    return Math.round(amount * 100) / 100;
  } catch {
    return null;
  }
}

export function decodeMojibake(text: string): string {
  if (!text) return text;
  if (!/\u00C3[\u0080-\u00FF]/.test(text)) return text;
  try {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xFF;
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return text;
  }
}
