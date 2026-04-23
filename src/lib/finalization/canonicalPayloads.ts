import { normalizeContratacionValues } from "@/lib/contratacion";
import { normalizeCondicionesVacanteValues } from "@/lib/condicionesVacante";
import { normalizeEvaluacionValues } from "@/lib/evaluacion";
import { normalizeInterpreteLscValues } from "@/lib/interpreteLsc";
import { normalizeModalidad } from "@/lib/modalidad";
import {
  normalizePresentacionMotivacion,
  normalizePresentacionTipoVisita,
} from "@/lib/presentacion";
import { normalizeSeleccionValues } from "@/lib/seleccion";
import {
  buildRequestHash,
} from "@/lib/finalization/idempotencyCore";
import { normalizePayloadAsistentes } from "@/lib/finalization/payloads";
import {
  coerceTrimmedText,
  isRecord,
} from "@/lib/finalization/valueUtils";
import type { CanonicalFinalizationFormSlug } from "@/lib/finalization/formSlugs";
import type { ContratacionValues } from "@/lib/validations/contratacion";
import type { CondicionesVacanteValues } from "@/lib/validations/condicionesVacante";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";
import type { InterpreteLscValues } from "@/lib/validations/interpreteLsc";
import type { SeleccionValues } from "@/lib/validations/seleccion";

type CanonicalPresentacionPayload = {
  tipo_visita: string;
  fecha_visita: string;
  modalidad: string;
  nit_empresa: string;
  motivacion: string[];
  acuerdos_observaciones: string;
  asistentes: Array<{ nombre: string; cargo: string }>;
};

type CanonicalSensibilizacionPayload = {
  fecha_visita: string;
  modalidad: string;
  nit_empresa: string;
  observaciones: string;
  asistentes: Array<{ nombre: string; cargo: string }>;
};

type CanonicalRepeatedRow<TValue extends Record<string, unknown>> = {
  [TKey in keyof TValue]: string;
};

type CanonicalContratacionPayload = Omit<
  ReturnType<typeof normalizeContratacionValues>,
  "asistentes" | "vinculados"
> & {
  asistentes: Array<{ nombre: string; cargo: string }>;
  vinculados: Array<
    CanonicalRepeatedRow<
      ReturnType<typeof normalizeContratacionValues>["vinculados"][number]
    >
  >;
};

type CanonicalSeleccionPayload = Omit<
  ReturnType<typeof normalizeSeleccionValues>,
  "asistentes" | "oferentes"
> & {
  asistentes: Array<{ nombre: string; cargo: string }>;
  oferentes: Array<
    CanonicalRepeatedRow<
      ReturnType<typeof normalizeSeleccionValues>["oferentes"][number]
    >
  >;
};

type CanonicalCondicionesVacantePayload = ReturnType<
  typeof normalizeCondicionesVacanteValues
> & {
  asistentes: Array<{ nombre: string; cargo: string }>;
  discapacidades: Array<{ discapacidad: string; descripcion: string }>;
};

type CanonicalEvaluacionPayload = ReturnType<typeof normalizeEvaluacionValues> & {
  asistentes: Array<{ nombre: string; cargo: string }>;
};

type CanonicalInterpreteLscPayload = Omit<
  ReturnType<typeof normalizeInterpreteLscValues>,
  "asistentes" | "oferentes" | "interpretes"
> & {
  asistentes: Array<{ nombre: string; cargo: string }>;
  oferentes: Array<
    CanonicalRepeatedRow<
      ReturnType<typeof normalizeInterpreteLscValues>["oferentes"][number]
    >
  >;
  interpretes: Array<
    CanonicalRepeatedRow<
      ReturnType<typeof normalizeInterpreteLscValues>["interpretes"][number]
    >
  >;
};

function sortStrings(values: string[]) {
  return [...values].sort((left, right) => left.localeCompare(right, "es-CO"));
}

type SharedPeopleShellValues = {
  modalidad: unknown;
  nit_empresa: unknown;
  desarrollo_actividad: unknown;
  ajustes_recomendaciones: unknown;
  asistentes: Array<{ nombre?: unknown; cargo?: unknown }>;
};

function normalizeCanonicalPeopleFormShell(
  payload: SharedPeopleShellValues
) {
  return {
    modalidad: normalizeModalidad(payload.modalidad, "Presencial"),
    nit_empresa: coerceTrimmedText(payload.nit_empresa),
    desarrollo_actividad: coerceTrimmedText(payload.desarrollo_actividad),
    ajustes_recomendaciones: coerceTrimmedText(payload.ajustes_recomendaciones),
    asistentes: normalizePayloadAsistentes(payload.asistentes),
  };
}

function normalizeCanonicalRepeatedRows<TValue extends Record<string, unknown>>(
  rows: TValue[]
) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, coerceTrimmedText(value)])
    )
  ) as Array<CanonicalRepeatedRow<TValue>>;
}

function trimNestedStringValues<TValue>(value: TValue): TValue {
  if (Array.isArray(value)) {
    return value.map((item) => trimNestedStringValues(item)) as TValue;
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        trimNestedStringValues(entryValue),
      ])
    ) as TValue;
  }

  return (typeof value === "string" ? coerceTrimmedText(value) : value) as TValue;
}

export function normalizeCanonicalPresentacionPayload(
  payload: Record<string, unknown>
): CanonicalPresentacionPayload {
  return {
    tipo_visita: normalizePresentacionTipoVisita(payload.tipo_visita),
    fecha_visita: coerceTrimmedText(payload.fecha_visita),
    modalidad: normalizeModalidad(payload.modalidad, "Presencial"),
    nit_empresa: coerceTrimmedText(payload.nit_empresa),
    motivacion: sortStrings(
      normalizePresentacionMotivacion(payload.motivacion).map((value) =>
        coerceTrimmedText(value)
      )
    ),
    acuerdos_observaciones: coerceTrimmedText(payload.acuerdos_observaciones),
    asistentes: normalizePayloadAsistentes(
      Array.isArray(payload.asistentes) ? payload.asistentes : []
    ),
  };
}

export function normalizeCanonicalSensibilizacionPayload(
  payload: Record<string, unknown>
): CanonicalSensibilizacionPayload {
  return {
    fecha_visita: coerceTrimmedText(payload.fecha_visita),
    modalidad: normalizeModalidad(payload.modalidad, "Presencial"),
    nit_empresa: coerceTrimmedText(payload.nit_empresa),
    observaciones: coerceTrimmedText(payload.observaciones),
    asistentes: normalizePayloadAsistentes(
      Array.isArray(payload.asistentes) ? payload.asistentes : []
    ),
  };
}

export function normalizeCanonicalContratacionPayloadFromNormalizedValues(
  normalizedPayload: ContratacionValues
): CanonicalContratacionPayload {
  return {
    ...normalizedPayload,
    ...normalizeCanonicalPeopleFormShell(normalizedPayload),
    vinculados: normalizeCanonicalRepeatedRows(normalizedPayload.vinculados),
  };
}

export function normalizeCanonicalSeleccionPayloadFromNormalizedValues(
  normalizedPayload: SeleccionValues
): CanonicalSeleccionPayload {
  return {
    ...normalizedPayload,
    ...normalizeCanonicalPeopleFormShell(normalizedPayload),
    nota: coerceTrimmedText(normalizedPayload.nota),
    oferentes: normalizeCanonicalRepeatedRows(normalizedPayload.oferentes),
  };
}

export function normalizeCanonicalCondicionesVacantePayloadFromNormalizedValues(
  normalizedPayload: CondicionesVacanteValues
): CanonicalCondicionesVacantePayload {
  return {
    ...normalizedPayload,
    modalidad: normalizeModalidad(normalizedPayload.modalidad, "Presencial"),
    nit_empresa: coerceTrimmedText(normalizedPayload.nit_empresa),
    asistentes: normalizePayloadAsistentes(normalizedPayload.asistentes),
    discapacidades: normalizedPayload.discapacidades.map((row) => ({
      discapacidad: coerceTrimmedText(row.discapacidad),
      descripcion: coerceTrimmedText(row.descripcion),
    })),
  };
}

export function normalizeCanonicalEvaluacionPayloadFromNormalizedValues(
  normalizedPayload: EvaluacionValues
): CanonicalEvaluacionPayload {
  return {
    ...trimNestedStringValues(normalizedPayload),
    modalidad: normalizeModalidad(normalizedPayload.modalidad, "Presencial"),
    nit_empresa: coerceTrimmedText(normalizedPayload.nit_empresa),
    asistentes: normalizePayloadAsistentes(normalizedPayload.asistentes),
  };
}

export function normalizeCanonicalInterpreteLscPayloadFromNormalizedValues(
  normalizedPayload: InterpreteLscValues
): CanonicalInterpreteLscPayload {
  return {
    ...normalizedPayload,
    fecha_visita: coerceTrimmedText(normalizedPayload.fecha_visita),
    modalidad_interprete: coerceTrimmedText(normalizedPayload.modalidad_interprete),
    modalidad_profesional_reca: coerceTrimmedText(
      normalizedPayload.modalidad_profesional_reca
    ),
    nit_empresa: coerceTrimmedText(normalizedPayload.nit_empresa),
    oferentes: normalizeCanonicalRepeatedRows(normalizedPayload.oferentes),
    interpretes: normalizeCanonicalRepeatedRows(normalizedPayload.interpretes),
    asistentes: normalizePayloadAsistentes(normalizedPayload.asistentes),
    sumatoria_horas: coerceTrimmedText(normalizedPayload.sumatoria_horas),
    sabana: {
      activo: Boolean(normalizedPayload.sabana.activo),
      horas: normalizedPayload.sabana.horas,
    },
  };
}

export function normalizeCanonicalContratacionPayload(
  payload: Record<string, unknown>
): CanonicalContratacionPayload {
  return normalizeCanonicalContratacionPayloadFromNormalizedValues(
    normalizeContratacionValues(payload)
  );
}

export function normalizeCanonicalSeleccionPayload(
  payload: Record<string, unknown>
): CanonicalSeleccionPayload {
  return normalizeCanonicalSeleccionPayloadFromNormalizedValues(
    normalizeSeleccionValues(payload)
  );
}

export function normalizeCanonicalCondicionesVacantePayload(
  payload: Record<string, unknown>
): CanonicalCondicionesVacantePayload {
  return normalizeCanonicalCondicionesVacantePayloadFromNormalizedValues(
    normalizeCondicionesVacanteValues(payload)
  );
}

export function normalizeCanonicalEvaluacionPayload(
  payload: Record<string, unknown>
): CanonicalEvaluacionPayload {
  return normalizeCanonicalEvaluacionPayloadFromNormalizedValues(
    normalizeEvaluacionValues(payload)
  );
}

export function normalizeCanonicalInterpreteLscPayload(
  payload: Record<string, unknown>
): CanonicalInterpreteLscPayload {
  return normalizeCanonicalInterpreteLscPayloadFromNormalizedValues(
    normalizeInterpreteLscValues(payload as Partial<InterpreteLscValues>)
  );
}

export function buildCanonicalFinalizationPayloadForSharedForm(
  formSlug: CanonicalFinalizationFormSlug,
  payload: Record<string, unknown>
) {
  switch (formSlug) {
    case "presentacion":
      return normalizeCanonicalPresentacionPayload(payload);
    case "sensibilizacion":
      return normalizeCanonicalSensibilizacionPayload(payload);
    case "seleccion":
      return normalizeCanonicalSeleccionPayload(payload);
    case "contratacion":
      return normalizeCanonicalContratacionPayload(payload);
    case "condiciones-vacante":
      return normalizeCanonicalCondicionesVacantePayload(payload);
    case "evaluacion":
      return normalizeCanonicalEvaluacionPayload(payload);
    default:
      throw new Error(`Slug de finalización no soportado: ${String(formSlug)}`);
  }
}

export function buildCanonicalPresentacionRequestHash(
  payload: Record<string, unknown>
) {
  return buildRequestHash(normalizeCanonicalPresentacionPayload(payload));
}

export function buildCanonicalSensibilizacionRequestHash(
  payload: Record<string, unknown>
) {
  return buildRequestHash(normalizeCanonicalSensibilizacionPayload(payload));
}

export function buildCanonicalSeleccionRequestHash(
  payload: Record<string, unknown>
) {
  return buildRequestHash(normalizeCanonicalSeleccionPayload(payload));
}

export function buildCanonicalContratacionRequestHash(
  payload: Record<string, unknown>
) {
  return buildRequestHash(normalizeCanonicalContratacionPayload(payload));
}

export function buildCanonicalCondicionesVacanteRequestHash(
  payload: Record<string, unknown>
) {
  return buildRequestHash(normalizeCanonicalCondicionesVacantePayload(payload));
}

export function buildCanonicalEvaluacionRequestHash(
  payload: Record<string, unknown>
) {
  return buildRequestHash(normalizeCanonicalEvaluacionPayload(payload));
}

export function buildCanonicalInterpreteLscRequestHash(
  payload: Record<string, unknown>
) {
  return buildRequestHash(normalizeCanonicalInterpreteLscPayload(payload));
}
