import { ASESOR_AGENCIA_CARGO } from "@/lib/asistentes";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  MODALIDAD_OPTIONS,
  type SensibilizacionValues,
} from "@/lib/validations/sensibilizacion";

const MODALIDAD_SET = new Set<SensibilizacionValues["modalidad"]>(
  MODALIDAD_OPTIONS
);

function normalizeSensibilizacionAsistentes(
  asistentes: unknown,
  empresa?: Empresa | null
) {
  const defaults = getDefaultSensibilizacionValues(empresa).asistentes;

  if (!Array.isArray(asistentes)) {
    return defaults;
  }

  const normalized = asistentes
    .filter(
      (
        asistente
      ): asistente is {
        nombre?: unknown;
        cargo?: unknown;
      } => !!asistente && typeof asistente === "object"
    )
    .map((asistente) => ({
      nombre: typeof asistente.nombre === "string" ? asistente.nombre : "",
      cargo: typeof asistente.cargo === "string" ? asistente.cargo : "",
    }));

  if (normalized.length === 0) {
    return defaults;
  }

  if (normalized.length === 1) {
    return [
      normalized[0],
      {
        nombre: "",
        cargo: ASESOR_AGENCIA_CARGO,
      },
    ];
  }

  return normalized;
}

export function getDefaultSensibilizacionValues(
  empresa?: Empresa | null
): SensibilizacionValues {
  return {
    fecha_visita: new Date().toISOString().split("T")[0],
    modalidad: "Presencial",
    nit_empresa: empresa?.nit_empresa ?? "",
    observaciones: "",
    asistentes: [
      { nombre: empresa?.profesional_asignado ?? "", cargo: "" },
      { nombre: "", cargo: ASESOR_AGENCIA_CARGO },
    ],
  };
}

export function normalizeSensibilizacionValues(
  values: Partial<SensibilizacionValues> | Record<string, unknown>,
  empresa?: Empresa | null
): SensibilizacionValues {
  const defaults = getDefaultSensibilizacionValues(empresa);
  const source = values as Partial<SensibilizacionValues>;

  const modalidad =
    typeof source.modalidad === "string" && MODALIDAD_SET.has(source.modalidad)
      ? source.modalidad
      : defaults.modalidad;

  return {
    fecha_visita:
      typeof source.fecha_visita === "string" && source.fecha_visita.trim()
        ? source.fecha_visita
        : defaults.fecha_visita,
    modalidad,
    nit_empresa:
      typeof source.nit_empresa === "string" && source.nit_empresa.trim()
        ? source.nit_empresa
        : defaults.nit_empresa,
    observaciones:
      typeof source.observaciones === "string"
        ? source.observaciones
        : defaults.observaciones,
    asistentes: normalizeSensibilizacionAsistentes(source.asistentes, empresa),
  };
}
