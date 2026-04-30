import type { OdsPersonaRow } from "@/hooks/useOdsStore";

export type AggregatedSeccion4 = {
  nombre_usuario: string | null;
  cedula_usuario: string | null;
  discapacidad_usuario: string | null;
  genero_usuario: string | null;
  fecha_ingreso: string | null;
  tipo_contrato: string | null;
  cargo_servicio: string | null;
  total_personas: number;
};

export function aggregateSeccion4(rows: OdsPersonaRow[]): AggregatedSeccion4 {
  const stripped = rows.map((r) => ({
    cedula_usuario: r.cedula_usuario.trim(),
    nombre_usuario: r.nombre_usuario.trim(),
    discapacidad_usuario: r.discapacidad_usuario.trim(),
    genero_usuario: r.genero_usuario.trim(),
    fecha_ingreso: r.fecha_ingreso.trim(),
    tipo_contrato: r.tipo_contrato.trim(),
    cargo_servicio: r.cargo_servicio.trim(),
  }));

  const valid = stripped.filter(
    (r) =>
      r.cedula_usuario ||
      r.nombre_usuario ||
      r.discapacidad_usuario ||
      r.genero_usuario ||
      r.fecha_ingreso ||
      r.tipo_contrato ||
      r.cargo_servicio
  );

  if (valid.length === 0) {
    return {
      nombre_usuario: null,
      cedula_usuario: null,
      discapacidad_usuario: null,
      genero_usuario: null,
      fecha_ingreso: null,
      tipo_contrato: null,
      cargo_servicio: null,
      total_personas: 0,
    };
  }

  // Para columnas TEXT permitimos el `;`-join legacy. Si todas las
  // posiciones quedan vacías, devolvemos null para evitar enviar ";;".
  const joinTextOrNull = (vals: string[]): string | null =>
    vals.every((v) => v === "") ? null : vals.join(";");

  // ods.fecha_ingreso es DATE en BD: no acepta `;`-separado. Si hay una
  // única fecha distinta entre las filas, usamos esa; si hay múltiples
  // distintas o todas vacías, null. (El operador puede capturar fechas
  // por persona en observaciones si las necesita registrar.)
  const collapseDate = (vals: string[]): string | null => {
    const nonEmpty = vals.filter((v) => v !== "");
    if (nonEmpty.length === 0) return null;
    const unique = new Set(nonEmpty);
    return unique.size === 1 ? nonEmpty[0] : null;
  };

  return {
    nombre_usuario: joinTextOrNull(valid.map((r) => r.nombre_usuario)),
    cedula_usuario: joinTextOrNull(valid.map((r) => r.cedula_usuario)),
    discapacidad_usuario: joinTextOrNull(valid.map((r) => r.discapacidad_usuario)),
    genero_usuario: joinTextOrNull(valid.map((r) => r.genero_usuario)),
    fecha_ingreso: collapseDate(valid.map((r) => r.fecha_ingreso)),
    tipo_contrato: joinTextOrNull(valid.map((r) => r.tipo_contrato)),
    cargo_servicio: joinTextOrNull(valid.map((r) => r.cargo_servicio)),
    total_personas: valid.length,
  };
}
