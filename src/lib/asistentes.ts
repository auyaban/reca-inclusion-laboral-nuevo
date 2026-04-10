export type Asistente = {
  nombre: string;
  cargo: string;
};

export const ASESOR_AGENCIA_CARGO = "Asesor Agencia";

export function normalizePersonName(value: string) {
  return value
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      const [first = "", ...rest] = part;
      return `${first.toLocaleUpperCase("es-CO")}${rest.join("").toLocaleLowerCase("es-CO")}`;
    })
    .join(" ");
}

export function normalizeAsesorAgenciaAsistentes<T extends Asistente>(asistentes: T[]) {
  return asistentes.map((asistente, index) => {
    const isAsesorAgencia =
      index === asistentes.length - 1 ||
      asistente.cargo.trim().toLocaleLowerCase("es-CO") ===
        ASESOR_AGENCIA_CARGO.toLocaleLowerCase("es-CO");

    if (!isAsesorAgencia) {
      return asistente;
    }

    return {
      ...asistente,
      nombre: normalizePersonName(asistente.nombre),
      cargo: asistente.cargo.trim() || ASESOR_AGENCIA_CARGO,
    };
  });
}
