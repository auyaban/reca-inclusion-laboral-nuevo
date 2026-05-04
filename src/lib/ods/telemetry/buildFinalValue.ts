import type { OdsPayload } from "@/lib/ods/schemas";
import type { OdsTelemetryJsonObject } from "@/lib/ods/telemetry/types";

const VALOR_BASE_SELECT = "valor_base, vigente_desde, vigente_hasta";

export type OdsTelemetryTarifaClient = {
  from: (table: "tarifas") => {
    select: (fields: string) => unknown;
  };
};

type QueryChain = {
  eq: (column: string, value: unknown) => QueryChain;
  or: (filter: string) => QueryChain;
  order: (column: string, options: { ascending: boolean; nullsFirst: boolean }) => QueryChain;
  limit: (value: number) => QueryChain;
  maybeSingle: () => PromiseLike<{ data: { valor_base?: unknown } | null; error: unknown }>;
};

function warnFinalValue(stage: string) {
  console.warn(`[ods/telemetry/final-value] ${stage}`);
}

function nullableText(value: string | undefined) {
  return value ?? null;
}

async function lookupValorBase(
  admin: OdsTelemetryTarifaClient,
  ods: OdsPayload
): Promise<number | null> {
  try {
    const query = admin
      .from("tarifas")
      .select(VALOR_BASE_SELECT) as QueryChain;
    const { data, error } = await query
      .eq("codigo_servicio", ods.codigo_servicio)
      .or(`vigente_desde.is.null,vigente_desde.lte.${ods.fecha_servicio}`)
      .or(`vigente_hasta.is.null,vigente_hasta.gte.${ods.fecha_servicio}`)
      .order("vigente_desde", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      warnFinalValue("tarifa_lookup_error");
      return null;
    }

    const value = Number(data?.valor_base);
    if (!Number.isFinite(value)) {
      warnFinalValue("tarifa_not_found");
      return null;
    }

    return value;
  } catch {
    warnFinalValue("tarifa_lookup_exception");
    return null;
  }
}

export async function buildOdsTelemetryFinalValue(
  admin: OdsTelemetryTarifaClient,
  ods: OdsPayload
): Promise<OdsTelemetryJsonObject> {
  const valorBase = await lookupValorBase(admin, ods);

  return {
    codigo_servicio: ods.codigo_servicio,
    referencia_servicio: ods.referencia_servicio,
    descripcion_servicio: ods.descripcion_servicio,
    modalidad_servicio: ods.modalidad_servicio,
    valor_base: valorBase,
    valor_total: ods.valor_total,
    valor_virtual: ods.valor_virtual ?? 0,
    valor_bogota: ods.valor_bogota ?? 0,
    valor_otro: ods.valor_otro ?? 0,
    todas_modalidades: ods.todas_modalidades ?? 0,
    valor_interprete: ods.valor_interprete ?? 0,
    horas_interprete: ods.horas_interprete ?? null,
    total_personas: ods.total_personas,
    discapacidad_usuario: nullableText(ods.discapacidad_usuario),
    genero_usuario: nullableText(ods.genero_usuario),
    tipo_contrato: nullableText(ods.tipo_contrato),
    fecha_servicio: ods.fecha_servicio,
    observaciones: nullableText(ods.observaciones),
    observacion_agencia: nullableText(ods.observacion_agencia),
    seguimiento_servicio: nullableText(ods.seguimiento_servicio),
  };
}
