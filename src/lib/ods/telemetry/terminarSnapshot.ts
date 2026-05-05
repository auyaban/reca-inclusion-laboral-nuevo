import type { OdsPayload } from "@/lib/ods/schemas";
import { rankSuggestions } from "@/lib/ods/import/rankedSuggestions";
import {
  suggestServiceFromAnalysis,
  type CompanyRow,
  type TarifaRow,
} from "@/lib/ods/rules-engine/rulesEngine";
import {
  buildMotorSuggestionSnapshot,
  normalizeConfidence,
} from "@/lib/ods/telemetry/importSnapshot";
import { evaluateOdsTelemetryGate } from "@/lib/ods/telemetry/gate";
import {
  type OdsMotorTelemetriaFinalizeArgs,
  type OdsMotorTelemetriaFinalizeResult,
  type OdsMotorTelemetriaRecordArgs,
  type OdsMotorTelemetriaRecordResult,
  type OdsTelemetryJsonObject,
} from "@/lib/ods/telemetry/types";
import { buildOdsTelemetryFinalValue } from "@/lib/ods/telemetry/buildFinalValue";

const TARIFAS_SELECT = "codigo_servicio, referencia_servicio, descripcion_servicio, modalidad_servicio, valor_base";
const EMPRESA_SELECT = "nit_empresa, nombre_empresa, ciudad_empresa, sede_empresa, zona_empresa, caja_compensacion, correo_profesional, profesional_asignado, asesor";
const TERMINAR_TARIFAS_LIMIT = 500;
const SUCCESS_CODES_WITH_REUSABLE_ID = new Set(["created", "deduped"]);

type RpcResult<T> = PromiseLike<{ data: T | null; error: unknown }>;

export type OdsTerminarTelemetryClient = {
  from: (table: string) => { select: (fields: string) => unknown };
  rpc: (
    functionName: "ods_motor_telemetria_record" | "ods_motor_telemetria_finalize",
    args: OdsMotorTelemetriaRecordArgs | OdsMotorTelemetriaFinalizeArgs
  ) => RpcResult<OdsMotorTelemetriaRecordResult | OdsMotorTelemetriaFinalizeResult>;
};

type QueryChain<T> = PromiseLike<{ data: T[] | null; error: unknown }> & {
  select: (fields: string) => QueryChain<T>;
  eq: (column: string, value: unknown) => QueryChain<T>;
  is: (column: string, value: unknown) => QueryChain<T>;
  or: (filter: string) => QueryChain<T>;
  limit: (value: number) => QueryChain<T>;
  maybeSingle: () => PromiseLike<{ data: T | null; error: unknown }>;
};

export type OdsTerminarTelemetryInput = {
  admin: OdsTerminarTelemetryClient;
  ods: OdsPayload;
  odsId: string | null;
  telemetriaId?: string;
  actorUserId: string;
  now?: Date;
  envValue?: string;
};

export type OdsTerminarTelemetryResult =
  | { status: "finalized"; telemetria_id: string }
  | {
      status: "skipped";
      reason:
        | "disabled"
        | "missing_ods_id"
        | "record_failed"
        | "rpc_failed"
        | "already_finalized";
    };

function warnTelemetry(stage: "manual-record" | "finalize" | "manual-catalog", code: string) {
  console.warn(`[ods/telemetry/${stage}] ${code}`);
}

function normalizeNit(value: string) {
  return value.trim();
}

function splitList(value: string | undefined) {
  return String(value ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildManualParticipants(ods: OdsPayload) {
  const cedulas = splitList(ods.cedula_usuario);
  const nombres = splitList(ods.nombre_usuario);
  const discapacidades = splitList(ods.discapacidad_usuario);
  const generos = splitList(ods.genero_usuario);
  const fechas = splitList(ods.fecha_ingreso);
  const contratos = splitList(ods.tipo_contrato);
  const cargos = splitList(ods.cargo_servicio);
  const length = Math.max(
    cedulas.length,
    nombres.length,
    discapacidades.length,
    generos.length,
    fechas.length,
    contratos.length,
    cargos.length,
    ods.total_personas
  );

  return Array.from({ length }, (_, index) => ({
    cedula_usuario: cedulas[index] ?? "",
    nombre_usuario: nombres[index] ?? "",
    discapacidad_usuario: discapacidades[index] ?? "",
    genero_usuario: generos[index] ?? "",
    fecha_ingreso: fechas[index] ?? "",
    tipo_contrato: contratos[index] ?? "",
    cargo_servicio: cargos[index] ?? "",
  }));
}

export function buildManualTelemetryAnalysis(
  ods: OdsPayload
): Record<string, unknown> {
  return {
    nit_empresa: ods.nit_empresa,
    nombre_empresa: ods.nombre_empresa,
    modalidad_servicio: ods.modalidad_servicio,
    fecha_servicio: ods.fecha_servicio,
    nombre_profesional: ods.nombre_profesional,
    cargo_servicio: ods.cargo_servicio ?? "",
    observaciones: ods.observaciones ?? "",
    observacion_agencia: ods.observacion_agencia ?? "",
    seguimiento_servicio: ods.seguimiento_servicio ?? "",
    participantes: buildManualParticipants(ods),
    total_horas_interprete: ods.horas_interprete ?? 0,
    sumatoria_horas_interpretes: ods.horas_interprete ?? 0,
    file_path: "manual ODS",
  };
}

async function loadManualCatalogs(
  admin: OdsTerminarTelemetryClient,
  ods: OdsPayload
): Promise<{ tarifas: TarifaRow[]; company: CompanyRow | null }> {
  const empty = { tarifas: [] as TarifaRow[], company: null as CompanyRow | null };

  try {
    const tarifasQuery = admin
      .from("tarifas") as QueryChain<TarifaRow>;
    const empresasQuery = admin
      .from("empresas") as QueryChain<CompanyRow>;

    const [tarifasRes, empresaRes] = await Promise.all([
      tarifasQuery
        .select(TARIFAS_SELECT)
        .or(`vigente_desde.is.null,vigente_desde.lte.${ods.fecha_servicio}`)
        .or(`vigente_hasta.is.null,vigente_hasta.gte.${ods.fecha_servicio}`)
        .limit(TERMINAR_TARIFAS_LIMIT),
      empresasQuery
        .select(EMPRESA_SELECT)
        .is("deleted_at", null)
        .eq("nit_empresa", normalizeNit(ods.nit_empresa))
        .maybeSingle(),
    ]);

    if (tarifasRes.error) {
      warnTelemetry("manual-catalog", "tarifas_lookup_error");
    }
    if (empresaRes.error) {
      warnTelemetry("manual-catalog", "empresa_lookup_error");
    }

    return {
      tarifas: tarifasRes.error ? [] : (tarifasRes.data ?? []),
      company: empresaRes.error ? null : (empresaRes.data ?? null),
    };
  } catch {
    warnTelemetry("manual-catalog", "exception");
    return empty;
  }
}

async function finalizeTelemetry(
  admin: OdsTerminarTelemetryClient,
  telemetriaId: string,
  odsId: string,
  finalValue: OdsTelemetryJsonObject,
  actorUserId: string
): Promise<OdsTerminarTelemetryResult> {
  try {
    const { data, error } = await admin.rpc("ods_motor_telemetria_finalize", {
      p_telemetria_id: telemetriaId,
      p_ods_id: odsId,
      p_final_value: finalValue,
      p_actor_user_id: actorUserId,
    });

    if (error || !data?.ok) {
      warnTelemetry("finalize", data?.code || "rpc_error");
      return { status: "skipped", reason: "rpc_failed" };
    }

    if (data.code === "already_finalized") {
      warnTelemetry("finalize", "already_finalized");
      return { status: "skipped", reason: "already_finalized" };
    }

    if (data.code !== "finalized") {
      warnTelemetry("finalize", data.code || "unexpected_code");
      return { status: "skipped", reason: "rpc_failed" };
    }

    return { status: "finalized", telemetria_id: telemetriaId };
  } catch {
    warnTelemetry("finalize", "exception");
    return { status: "skipped", reason: "rpc_failed" };
  }
}

async function recordManualSnapshot(
  admin: OdsTerminarTelemetryClient,
  ods: OdsPayload,
  odsId: string,
  actorUserId: string
): Promise<string | null> {
  try {
    const { tarifas, company } = await loadManualCatalogs(admin, ods);
    const analysis = buildManualTelemetryAnalysis(ods);
    const suggestion = suggestServiceFromAnalysis({
      analysis,
      message: { subject: "manual ODS" },
      tarifas,
      companyByNit: (nit) => (normalizeNit(nit) === normalizeNit(ods.nit_empresa) ? company : null),
    });
    const ranked = rankSuggestions([suggestion]);
    const primary = ranked[0];

    const { data, error } = await admin.rpc("ods_motor_telemetria_record", {
      p_ods_id: odsId,
      p_import_origin: "manual",
      p_motor_suggestion: buildMotorSuggestionSnapshot(ranked),
      p_confidence: normalizeConfidence(primary?.confidence),
      // Manual confirms intentionally allow duplicate snapshots on double submit.
      p_idempotency_key: null,
      p_actor_user_id: actorUserId,
    });

    if (error || !data?.ok) {
      warnTelemetry("manual-record", data?.code || "rpc_error");
      return null;
    }

    if (!SUCCESS_CODES_WITH_REUSABLE_ID.has(data.code) || !data.data?.telemetria_id) {
      warnTelemetry("manual-record", data.code || "missing_telemetria_id");
      return null;
    }

    return data.data.telemetria_id;
  } catch {
    warnTelemetry("manual-record", "exception");
    return null;
  }
}

/**
 * Records/finalizes ODS motor telemetry after an ODS is persisted.
 *
 * #82 mitigation: new telemetry rows persist actor_user_id and the
 * record/finalize RPCs reject mismatched actors while ods_id is still null.
 * Legacy rows with actor_user_id null remain finalizable for backward
 * compatibility; there is no retroactive backfill in this PR.
 */
export async function recordOdsTerminarTelemetrySnapshot({
  admin,
  ods,
  odsId,
  telemetriaId,
  actorUserId,
  envValue,
  now,
}: OdsTerminarTelemetryInput): Promise<OdsTerminarTelemetryResult> {
  const gate = evaluateOdsTelemetryGate(envValue, now);
  if (!gate.enabled) {
    return { status: "skipped", reason: "disabled" };
  }

  if (!odsId) {
    warnTelemetry("finalize", "missing_ods_id");
    return { status: "skipped", reason: "missing_ods_id" };
  }

  const finalValue = await buildOdsTelemetryFinalValue(admin, ods);

  if (telemetriaId) {
    return finalizeTelemetry(admin, telemetriaId, odsId, finalValue, actorUserId);
  }

  const manualTelemetriaId = await recordManualSnapshot(
    admin,
    ods,
    odsId,
    actorUserId
  );
  if (!manualTelemetriaId) {
    return { status: "skipped", reason: "record_failed" };
  }

  return finalizeTelemetry(admin, manualTelemetriaId, odsId, finalValue, actorUserId);
}
