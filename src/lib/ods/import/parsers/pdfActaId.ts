import { extractActaIdFromText } from "./actaIdParser";

export function extractPdfActaId(text: string): string {
  return extractActaIdFromText(text);
}
