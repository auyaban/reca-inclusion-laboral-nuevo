export function extractPdfActaId(text: string): string {
  const match = text.match(/ACTA\s*ID:\s*([A-Z0-9]{8})/i);
  if (!match) return "";
  return match[1].trim().toUpperCase();
}
