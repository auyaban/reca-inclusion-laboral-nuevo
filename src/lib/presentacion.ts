import {
  getDefaultAsistentesForMode,
  normalizeRestoredAsistentesForMode,
} from "@/lib/asistentes";
import { normalizeModalidad } from "@/lib/modalidad";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  MOTIVACION_OPTIONS,
  type PresentacionValues,
} from "@/lib/validations/presentacion";

const TIPO_VISITA_ALIASES: Record<string, PresentacionValues["tipo_visita"]> = {
  Presentación: "Presentación",
  Reactivación: "Reactivación",
  "PresentaciÃ³n": "Presentación",
  "ReactivaciÃ³n": "Reactivación",
};

const MOTIVACION_ALIASES: Record<string, string> = {
  "Objetivos y metas para la diversidad, equidad e inclusiÃ³n.":
    "Objetivos y metas para la diversidad, equidad e inclusión.",
  "Beneficios en la contrataciÃ³n de poblaciÃ³n en riesgo de exclusiÃ³n":
    "Beneficios en la contratación de población en riesgo de exclusión",
  "Ventaja en licitaciones pÃºblicas": "Ventaja en licitaciones públicas",
  "Experiencia en la vinculaciÃ³n de personas en condiciÃ³n de discapacidad.":
    "Experiencia en la vinculación de personas en condición de discapacidad.",
};

const MOTIVACION_SET = new Set<string>(MOTIVACION_OPTIONS);

export function normalizePresentacionTipoVisita(
  value: unknown
): PresentacionValues["tipo_visita"] {
  if (typeof value !== "string") {
    return "Presentación";
  }

  return TIPO_VISITA_ALIASES[value] ?? "Presentación";
}

export function normalizePresentacionMotivacion(values: unknown) {
  if (!Array.isArray(values)) {
    return [] as PresentacionValues["motivacion"];
  }

  const normalized = values
    .filter((value): value is string => typeof value === "string")
    .map((value) => MOTIVACION_ALIASES[value] ?? value)
    .filter((value) => MOTIVACION_SET.has(value));

  return Array.from(new Set(normalized)) as PresentacionValues["motivacion"];
}

function normalizePresentacionAsistentes(
  asistentes: unknown,
  empresa?: Empresa | null
) {
  return normalizeRestoredAsistentesForMode(asistentes, {
    mode: "reca_plus_agency_advisor",
    profesionalAsignado: empresa?.profesional_asignado,
  });
}

export function getDefaultPresentacionValues(
  empresa?: Empresa | null
): PresentacionValues {
  return {
    tipo_visita: "Presentación",
    fecha_visita: new Date().toISOString().split("T")[0],
    modalidad: "Presencial",
    nit_empresa: empresa?.nit_empresa ?? "",
    motivacion: [],
    acuerdos_observaciones: "",
    asistentes: getDefaultAsistentesForMode({
      mode: "reca_plus_agency_advisor",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

export function normalizePresentacionValues(
  values: Partial<PresentacionValues> | Record<string, unknown>,
  empresa?: Empresa | null
): PresentacionValues {
  const defaults = getDefaultPresentacionValues(empresa);
  const source = values as Partial<PresentacionValues>;

  const modalidad = normalizeModalidad(source.modalidad, defaults.modalidad);

  return {
    tipo_visita: normalizePresentacionTipoVisita(source.tipo_visita),
    fecha_visita:
      typeof source.fecha_visita === "string" && source.fecha_visita.trim()
        ? source.fecha_visita
        : defaults.fecha_visita,
    modalidad,
    nit_empresa:
      typeof source.nit_empresa === "string" && source.nit_empresa.trim()
        ? source.nit_empresa
        : defaults.nit_empresa,
    motivacion: normalizePresentacionMotivacion(source.motivacion),
    acuerdos_observaciones:
      typeof source.acuerdos_observaciones === "string"
        ? source.acuerdos_observaciones
        : defaults.acuerdos_observaciones,
    asistentes: normalizePresentacionAsistentes(source.asistentes, empresa),
  };
}
