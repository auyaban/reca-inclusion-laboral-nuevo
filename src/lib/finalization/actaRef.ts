export const ACTA_REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ACTA_REF_LENGTH = 8;
export const ACTA_FOOTER_ANCHOR = "www.recacolombia.org";
export const ACTA_ID_LABEL = "ACTA ID:";

export function generateActaRef() {
  const values = crypto.getRandomValues(new Uint32Array(ACTA_REF_LENGTH));
  let actaRef = "";

  for (const value of values) {
    actaRef += ACTA_REF_ALPHABET[value % ACTA_REF_ALPHABET.length];
  }

  return actaRef;
}

export function buildActaFooterValue(actaRef: string) {
  return `${ACTA_FOOTER_ANCHOR}\n${ACTA_ID_LABEL} ${String(actaRef || "").trim()}`;
}
