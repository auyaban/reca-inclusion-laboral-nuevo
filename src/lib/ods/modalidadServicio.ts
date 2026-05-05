export function normalizeOdsModalidadServicio(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed === "Todas la modalidades" || trimmed === "Todas") {
    return "Todas las modalidades";
  }
  return trimmed;
}
