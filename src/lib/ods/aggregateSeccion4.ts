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

  return {
    nombre_usuario: valid.map((r) => r.nombre_usuario).join(";"),
    cedula_usuario: valid.map((r) => r.cedula_usuario).join(";"),
    discapacidad_usuario: valid.map((r) => r.discapacidad_usuario).join(";"),
    genero_usuario: valid.map((r) => r.genero_usuario).join(";"),
    fecha_ingreso: valid.map((r) => r.fecha_ingreso).join(";"),
    tipo_contrato: valid.map((r) => r.tipo_contrato).join(";"),
    cargo_servicio: valid.map((r) => r.cargo_servicio).join(";"),
    total_personas: valid.length,
  };
}
