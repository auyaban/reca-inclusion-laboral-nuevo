import {
  getDefaultAsistentesForMode,
  getMeaningfulAsistentes,
  normalizeRestoredAsistentesForMode,
  normalizeAsistenteLike,
} from "@/lib/asistentes";
import {
  coerceTrimmedText,
  isRecord,
  stringTrimmedText,
} from "@/lib/finalization/valueUtils";
import type { Empresa } from "@/lib/store/empresaStore";
import {
  INTERPRETE_LSC_MAX_ASISTENTES,
  INTERPRETE_LSC_MAX_INTERPRETES,
  INTERPRETE_LSC_MAX_OFERENTES,
  INTERPRETE_LSC_MODALIDAD_INTERPRETE_OPTIONS,
  INTERPRETE_LSC_MODALIDAD_PROFESIONAL_RECA_OPTIONS,
  type InterpreteLscValues,
} from "@/lib/validations/interpreteLsc";

type InterpreteRow = InterpreteLscValues["interpretes"][number];
type OferenteRow = InterpreteLscValues["oferentes"][number];
type AsistenteRow = InterpreteLscValues["asistentes"][number];
type SabanaValue = InterpreteLscValues["sabana"];

const DEFAULT_INTERPRETE_MODALIDAD =
  INTERPRETE_LSC_MODALIDAD_INTERPRETE_OPTIONS[0];
const DEFAULT_PROFESIONAL_RECA_MODALIDAD =
  INTERPRETE_LSC_MODALIDAD_PROFESIONAL_RECA_OPTIONS[0];
export const INTERPRETE_LSC_MAX_DURATION_MINUTES = 16 * 60;

export function createEmptyInterpreteLscOferenteRow(): OferenteRow {
  return { nombre_oferente: "", cedula: "", proceso: "" };
}

export function createEmptyInterpreteLscInterpreteRow(): InterpreteRow {
  return {
    nombre: "",
    hora_inicial: "",
    hora_final: "",
    total_tiempo: "",
  };
}

function getTodayIsoDate() {
  return new Date().toISOString().split("T")[0] ?? "";
}

function normalizeOferente(row: unknown): OferenteRow {
  if (!isRecord(row)) {
    return createEmptyInterpreteLscOferenteRow();
  }

  return {
    nombre_oferente: coerceTrimmedText(row.nombre_oferente),
    cedula: coerceTrimmedText(row.cedula),
    proceso: coerceTrimmedText(row.proceso),
  };
}

function normalizeModalidadInterprete(value: unknown) {
  const normalized = coerceTrimmedText(value);
  if (normalized === "Mixto") {
    return "Mixta";
  }

  return INTERPRETE_LSC_MODALIDAD_INTERPRETE_OPTIONS.includes(
    normalized as (typeof INTERPRETE_LSC_MODALIDAD_INTERPRETE_OPTIONS)[number]
  )
    ? (normalized as (typeof INTERPRETE_LSC_MODALIDAD_INTERPRETE_OPTIONS)[number])
    : DEFAULT_INTERPRETE_MODALIDAD;
}

function normalizeModalidadProfesionalReca(value: unknown) {
  const normalized = coerceTrimmedText(value);

  return INTERPRETE_LSC_MODALIDAD_PROFESIONAL_RECA_OPTIONS.includes(
    normalized as (typeof INTERPRETE_LSC_MODALIDAD_PROFESIONAL_RECA_OPTIONS)[number]
  )
    ? (normalized as (typeof INTERPRETE_LSC_MODALIDAD_PROFESIONAL_RECA_OPTIONS)[number])
    : DEFAULT_PROFESIONAL_RECA_MODALIDAD;
}

function normalizeSabanaHoras(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  const normalized = coerceTrimmedText(value).replace(",", ".");
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function parseHourMatch(raw: string) {
  const normalized = raw.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  const suffixMatch = normalized.match(/\b(am|pm)\b$/);
  const meridiem = suffixMatch?.[1] ?? null;
  const withoutSuffix = meridiem
    ? normalized.replace(/\b(am|pm)\b$/, "").trim()
    : normalized;

  if (!withoutSuffix) {
    return null;
  }

  let hoursRaw = "";
  let minutesRaw = "";

  if (/^\d{1,2}:\d{1,2}$/.test(withoutSuffix)) {
    const [hoursPart = "", minutesPart = ""] = withoutSuffix.split(":");
    hoursRaw = hoursPart;
    minutesRaw = minutesPart;
  } else if (/^\d{1,2}\s+\d{1,2}$/.test(withoutSuffix)) {
    const [hoursPart = "", minutesPart = ""] = withoutSuffix.split(/\s+/);
    hoursRaw = hoursPart;
    minutesRaw = minutesPart;
  } else if (/^\d{1,2}$/.test(withoutSuffix)) {
    hoursRaw = withoutSuffix;
    minutesRaw = "0";
  } else if (/^\d{3,4}$/.test(withoutSuffix)) {
    const value = withoutSuffix.padStart(4, "0");
    hoursRaw = value.slice(0, 2);
    minutesRaw = value.slice(2, 4);
  } else {
    return null;
  }

  let hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return null;
    }

    if (meridiem === "am") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return { hours, minutes };
}

function formatMinutesAsHours(totalMinutes: number) {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function durationToMinutes(value: string) {
  const normalized = coerceTrimmedText(value);
  if (!normalized) {
    return 0;
  }

  const match = normalized.match(/^(\d+):(\d{2})$/);
  if (!match) {
    return 0;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    return 0;
  }

  return hours * 60 + minutes;
}

function hoursNumberToMinutes(value: number) {
  return Math.round(Math.max(0, value) * 60);
}

function normalizeInterprete(row: unknown): InterpreteRow {
  if (!isRecord(row)) {
    return createEmptyInterpreteLscInterpreteRow();
  }

  const horaInicial = normalizeInterpreteLscTime(row.hora_inicial);
  const horaFinal = normalizeInterpreteLscTime(row.hora_final);

  return {
    nombre: coerceTrimmedText(row.nombre),
    hora_inicial: horaInicial,
    hora_final: horaFinal,
    total_tiempo: calculateInterpreteLscTotalTiempo(horaInicial, horaFinal),
  };
}

export function countMeaningfulInterpreteLscOferentes(rows: readonly OferenteRow[]) {
  return rows.filter((row) =>
    Boolean(row.nombre_oferente.trim() || row.cedula.trim() || row.proceso.trim())
  ).length;
}

export function countMeaningfulInterpreteLscInterpretes(
  rows: readonly InterpreteRow[]
) {
  return rows.filter((row) =>
    Boolean(
      row.nombre.trim() ||
        row.hora_inicial.trim() ||
        row.hora_final.trim() ||
        row.total_tiempo.trim()
    )
  ).length;
}

export function countMeaningfulInterpreteLscAsistentes(
  rows: readonly AsistenteRow[]
) {
  return getMeaningfulAsistentes(rows).length;
}

export function normalizeInterpreteLscTime(value: unknown) {
  const normalized = stringTrimmedText(value);
  if (!normalized) {
    return "";
  }

  const match = parseHourMatch(normalized);
  if (!match) {
    return "";
  }

  return `${String(match.hours).padStart(2, "0")}:${String(match.minutes).padStart(2, "0")}`;
}

export function calculateInterpreteLscTotalTiempo(
  horaInicial: unknown,
  horaFinal: unknown
) {
  const start = parseHourMatch(normalizeInterpreteLscTime(horaInicial));
  const end = parseHourMatch(normalizeInterpreteLscTime(horaFinal));

  if (!start || !end) {
    return "";
  }

  const startMinutes = start.hours * 60 + start.minutes;
  let endMinutes = end.hours * 60 + end.minutes;

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const durationMinutes = endMinutes - startMinutes;
  if (durationMinutes > INTERPRETE_LSC_MAX_DURATION_MINUTES) {
    return "";
  }

  return formatMinutesAsHours(durationMinutes);
}

export function calculateInterpreteLscSumatoria(
  interpretes: readonly InterpreteRow[],
  sabana: SabanaValue
) {
  const interpretesMinutes = interpretes.reduce((total, interprete) => {
    if (
      !interprete.nombre.trim() &&
      !interprete.hora_inicial.trim() &&
      !interprete.hora_final.trim() &&
      !interprete.total_tiempo.trim()
    ) {
      return total;
    }

    return total + durationToMinutes(interprete.total_tiempo);
  }, 0);

  const sabanaMinutes = sabana.activo ? hoursNumberToMinutes(sabana.horas) : 0;
  return formatMinutesAsHours(interpretesMinutes + sabanaMinutes);
}

export function formatInterpreteLscSabanaValue(sabana: SabanaValue) {
  if (!sabana.activo) {
    return "No aplica";
  }

  return `${formatMinutesAsHours(hoursNumberToMinutes(sabana.horas))} Hora`;
}

export function getDefaultInterpreteLscValues(
  empresa?: Empresa | null
): InterpreteLscValues {
  return {
    fecha_visita: getTodayIsoDate(),
    modalidad_interprete: DEFAULT_INTERPRETE_MODALIDAD,
    modalidad_profesional_reca: DEFAULT_PROFESIONAL_RECA_MODALIDAD,
    nit_empresa: empresa?.nit_empresa ?? "",
    oferentes: [createEmptyInterpreteLscOferenteRow()],
    interpretes: [createEmptyInterpreteLscInterpreteRow()],
    sabana: { activo: false, horas: 1 },
    sumatoria_horas: "0:00",
    asistentes: getDefaultAsistentesForMode({
      mode: "reca_plus_generic_attendees",
      profesionalAsignado: empresa?.profesional_asignado,
    }),
  };
}

export function normalizeInterpreteLscValues(
  values: Partial<InterpreteLscValues> | null | undefined,
  empresa?: Empresa | null
): InterpreteLscValues {
  const defaults = getDefaultInterpreteLscValues(empresa);
  const candidate = isRecord(values) ? values : {};

  const oferentes = Array.isArray(candidate.oferentes)
    ? candidate.oferentes
        .filter((row) => isRecord(row))
        .map((row) => normalizeOferente(row))
        .slice(0, INTERPRETE_LSC_MAX_OFERENTES)
    : defaults.oferentes;

  const interpretes = Array.isArray(candidate.interpretes)
    ? candidate.interpretes
        .filter((row) => isRecord(row))
        .map((row) => normalizeInterprete(row))
        .slice(0, INTERPRETE_LSC_MAX_INTERPRETES)
    : defaults.interpretes;

  const asistentes = normalizeRestoredAsistentesForMode(candidate.asistentes, {
    mode: "reca_plus_generic_attendees",
    profesionalAsignado: empresa?.profesional_asignado,
  })
    .map((row) => normalizeAsistenteLike(row))
    .slice(0, INTERPRETE_LSC_MAX_ASISTENTES);

  const sabanaRecord: Record<string, unknown> = isRecord(candidate.sabana)
    ? candidate.sabana
    : {};
  const sabana: SabanaValue = {
    activo:
      typeof sabanaRecord.activo === "boolean"
        ? sabanaRecord.activo
        : defaults.sabana.activo,
    horas: normalizeSabanaHoras(sabanaRecord.horas),
  };

  const normalizedInterpretes =
    interpretes.length > 0 ? interpretes : defaults.interpretes;

  return {
    fecha_visita: coerceTrimmedText(candidate.fecha_visita) || defaults.fecha_visita,
    modalidad_interprete: normalizeModalidadInterprete(candidate.modalidad_interprete),
    modalidad_profesional_reca: normalizeModalidadProfesionalReca(
      candidate.modalidad_profesional_reca
    ),
    nit_empresa: coerceTrimmedText(candidate.nit_empresa) || defaults.nit_empresa,
    oferentes: oferentes.length > 0 ? oferentes : defaults.oferentes,
    interpretes: normalizedInterpretes,
    sabana,
    sumatoria_horas: calculateInterpreteLscSumatoria(normalizedInterpretes, sabana),
    asistentes: asistentes.length > 0 ? asistentes : defaults.asistentes,
  };
}
