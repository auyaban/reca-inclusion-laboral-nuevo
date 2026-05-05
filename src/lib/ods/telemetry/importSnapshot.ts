import { createHash } from "node:crypto";
import type { PipelineResult } from "@/lib/ods/import/pipeline";
import type { RankedSuggestion } from "@/lib/ods/import/rankedSuggestions";
import { normalizeOdsModalidadServicio } from "@/lib/ods/modalidadServicio";
import {
  type OdsMotorTelemetriaRecordArgs,
  type OdsMotorTelemetriaRecordResult,
  type OdsTelemetryConfidence,
  type OdsTelemetryImportOrigin,
  type OdsTelemetryJsonObject,
  type OdsTelemetryJsonValue,
} from "@/lib/ods/telemetry/types";
import { evaluateOdsTelemetryGate } from "@/lib/ods/telemetry/gate";

const SUCCESS_CODES_WITH_REUSABLE_ID = new Set(["created", "deduped"]);
const VALID_CONFIDENCE = new Set<OdsTelemetryConfidence>(["low", "medium", "high"]);
export const MAX_ALTERNATIVES = 5;

export type OdsTelemetryRecordClient = {
  rpc: (
    functionName: "ods_motor_telemetria_record",
    args: OdsMotorTelemetriaRecordArgs
  ) => PromiseLike<{ data: OdsMotorTelemetriaRecordResult | null; error: unknown }>;
};

export type OdsImportTelemetrySnapshotInput = {
  admin: OdsTelemetryRecordClient;
  result: PipelineResult;
  importOrigin: OdsTelemetryImportOrigin;
  actorUserId: string;
  now?: Date;
  envValue?: string;
};

export type OdsImportTelemetrySnapshotResult =
  | { status: "recorded"; telemetria_id: string; code: "created" | "deduped" }
  | { status: "skipped"; reason: "disabled" | "no_success" | "non_reusable_code" | "rpc_failed" };

function toJsonValue(value: unknown): OdsTelemetryJsonValue {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, toJsonValue(entry)])
    );
  }
  return String(value);
}

function canonicalSuggestionFields(suggestion: Partial<RankedSuggestion> | undefined): OdsTelemetryJsonObject {
  return {
    codigo_servicio: suggestion?.codigo_servicio ?? null,
    referencia_servicio: suggestion?.referencia_servicio ?? null,
    descripcion_servicio: suggestion?.descripcion_servicio ?? null,
    modalidad_servicio: normalizeOdsModalidadServicio(suggestion?.modalidad_servicio) || null,
    valor_base: suggestion?.valor_base ?? null,
    observaciones: suggestion?.observaciones ?? null,
    observacion_agencia: suggestion?.observacion_agencia ?? null,
    seguimiento_servicio: suggestion?.seguimiento_servicio ?? null,
    confidence: normalizeConfidence(suggestion?.confidence),
    rationale: toJsonValue(suggestion?.rationale ?? []),
    rank: suggestion?.rank ?? null,
    score: suggestion?.score ?? null,
  };
}

export function normalizeConfidence(value: unknown): OdsTelemetryConfidence {
  return VALID_CONFIDENCE.has(value as OdsTelemetryConfidence)
    ? (value as OdsTelemetryConfidence)
    : "low";
}

export function buildMotorSuggestionSnapshot(suggestions: RankedSuggestion[]): OdsTelemetryJsonObject {
  const [primary, ...alternatives] = suggestions;
  return {
    ...canonicalSuggestionFields(primary),
    alternatives: alternatives
      .slice(0, MAX_ALTERNATIVES)
      .map((suggestion) => canonicalSuggestionFields(suggestion)),
  };
}

export function getStableActaRef(result: PipelineResult) {
  const fromResolution = result.import_resolution?.acta_ref?.trim();
  if (fromResolution) return fromResolution;
  const fromParse = result.parseResult?.acta_ref?.trim();
  return fromParse || "";
}

/**
 * Uses SHA-256 over server-derived components. Components are controlled by
 * code paths or DB/parser output and never contain the `|` separator by
 * construction: `importOrigin` is an enum, ACTA refs are compact IDs, and
 * Supabase auth user IDs are UUID-like strings.
 */
export function buildImportTelemetryIdempotencyKey(
  importOrigin: OdsTelemetryImportOrigin,
  actaRef: string,
  actorUserId: string
) {
  const cleanActaRef = actaRef.trim();
  const cleanActorUserId = actorUserId.trim();
  if (!cleanActaRef || !cleanActorUserId) return null;
  return createHash("sha256")
    .update(`v1|${importOrigin}|${cleanActaRef}|${cleanActorUserId}`)
    .digest("hex");
}

export function buildImportTelemetryRecordArgs(
  result: PipelineResult,
  importOrigin: OdsTelemetryImportOrigin,
  actorUserId: string
): OdsMotorTelemetriaRecordArgs {
  const actaRef = getStableActaRef(result);
  const primary = result.suggestions[0];
  return {
    p_ods_id: null,
    p_import_origin: importOrigin,
    p_motor_suggestion: buildMotorSuggestionSnapshot(result.suggestions),
    p_confidence: normalizeConfidence(primary?.confidence),
    p_idempotency_key: buildImportTelemetryIdempotencyKey(importOrigin, actaRef, actorUserId),
    p_actor_user_id: actorUserId,
  };
}

function warnTelemetryRecord(stage: string) {
  console.warn(`[ods/telemetry/record] ${stage}`);
}

export async function recordOdsImportTelemetrySnapshot({
  admin,
  result,
  importOrigin,
  actorUserId,
  now,
  envValue,
}: OdsImportTelemetrySnapshotInput): Promise<OdsImportTelemetrySnapshotResult> {
  const gate = evaluateOdsTelemetryGate(envValue, now);
  if (!gate.enabled) {
    return { status: "skipped", reason: "disabled" };
  }

  if (!result.success) {
    return { status: "skipped", reason: "no_success" };
  }

  try {
    const args = buildImportTelemetryRecordArgs(result, importOrigin, actorUserId);
    const { data, error } = await admin.rpc("ods_motor_telemetria_record", args);
    if (error) {
      warnTelemetryRecord("rpc_error");
      return { status: "skipped", reason: "rpc_failed" };
    }
    if (!data?.ok) {
      warnTelemetryRecord(data?.code || "envelope_not_ok");
      return { status: "skipped", reason: "rpc_failed" };
    }

    if (data.code === "already_finalized") {
      warnTelemetryRecord("already_finalized");
      return { status: "skipped", reason: "non_reusable_code" };
    }

    if (!SUCCESS_CODES_WITH_REUSABLE_ID.has(data.code) || !data.data?.telemetria_id) {
      warnTelemetryRecord(data.code || "missing_telemetria_id");
      return { status: "skipped", reason: "non_reusable_code" };
    }

    return {
      status: "recorded",
      telemetria_id: data.data.telemetria_id,
      code: data.code as "created" | "deduped",
    };
  } catch {
    warnTelemetryRecord("exception");
    return { status: "skipped", reason: "rpc_failed" };
  }
}
