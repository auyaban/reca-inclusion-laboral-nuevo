const LATIN1_MAP: Record<number, string> = {
  0x80: "\u20AC", 0x82: "\u201A", 0x83: "\u0192", 0x84: "\u201E",
  0x85: "\u2026", 0x86: "\u2020", 0x87: "\u2021", 0x88: "\u02C6",
  0x89: "\u2030", 0x8A: "\u0160", 0x8B: "\u2039", 0x8C: "\u0152",
  0x8E: "\u017D", 0x91: "\u2018", 0x92: "\u2019", 0x93: "\u201C",
  0x94: "\u201D", 0x95: "\u2022", 0x96: "\u2013", 0x97: "\u2014",
  0x98: "\u02DC", 0x99: "\u2122", 0x9A: "\u0161", 0x9B: "\u203A",
  0x9C: "\u0153", 0x9E: "\u017E", 0x9F: "\u0178",
};

const SPANISH_ACCENT_MAP: Record<string, string> = {
  "a\u0301": "\u00E1", "e\u0301": "\u00E9", "i\u0301": "\u00ED",
  "o\u0301": "\u00F3", "u\u0301": "\u00FA", "A\u0301": "\u00C1",
  "E\u0301": "\u00C9", "I\u0301": "\u00CD", "O\u0301": "\u00D3",
  "U\u0301": "\u00DA", "n\u0303": "\u00F1", "N\u0303": "\u00D1",
  "u\u0308": "\u00FC", "U\u0308": "\u00DC",
};

export function fixMojibake(text: string): string {
  if (!text) return text;

  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x80 && code <= 0x9F && LATIN1_MAP[code]) {
      result += LATIN1_MAP[code];
    } else {
      result += text[i];
    }
  }

  result = result.normalize("NFD");
  for (const [decomposed, composed] of Object.entries(SPANISH_ACCENT_MAP)) {
    result = result.split(decomposed).join(composed);
  }

  return result.normalize("NFC");
}

export function looksLikeMojibake(text: string): boolean {
  if (!text) return false;
  const mojibakePatterns = [
    /[\x80-\x9F]/,
    /\uFFFD/,
    /Ã[¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿]/,
  ];
  return mojibakePatterns.some((pattern) => pattern.test(text));
}
