/**
 * Sanitiza un nombre para usar como nombre de archivo o carpeta.
 * Este helper es isomorfico y no debe depender del cliente de Google.
 */
export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s\-_.()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
