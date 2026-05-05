import { afterEach, describe, expect, it, vi } from "vitest";
import type { PipelineResult } from "@/lib/ods/import/pipeline";
import {
  buildImportTelemetryIdempotencyKey,
  buildImportTelemetryRecordArgs,
  buildMotorSuggestionSnapshot,
  MAX_ALTERNATIVES,
  normalizeConfidence,
  recordOdsImportTelemetrySnapshot,
  type OdsTelemetryRecordClient,
} from "@/lib/ods/telemetry/importSnapshot";

const baseResult: PipelineResult = {
  success: true,
  level: 2,
  analysis: {},
  participants: [],
  suggestions: [
    {
      codigo_servicio: "SENS-VIR-01",
      referencia_servicio: "Sensibilizacion Virtual",
      descripcion_servicio: "Sensibilizacion",
      modalidad_servicio: "Virtual",
      valor_base: 50000,
      observaciones: "Cargo: auxiliar",
      observacion_agencia: "Agencia norte",
      seguimiento_servicio: "Seguimiento 1",
      confidence: "high",
      rationale: ["match por cargo"],
      rank: 1,
      score: 38,
    },
    {
      codigo_servicio: "SENS-BOG-01",
      referencia_servicio: "Sensibilizacion Bogota",
      descripcion_servicio: "Sensibilizacion",
      modalidad_servicio: "Bogota",
      valor_base: 45000,
      confidence: "medium",
      rationale: ["alternativa por tarifa"],
      rank: 2,
      score: 25,
    },
  ],
  decisionLog: [],
  warnings: [],
  import_resolution: {
    strategy: "lookup",
    reason: "acta_ref_lookup",
    acta_ref: "ABC12XYZ",
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ODS import telemetry snapshot", () => {
  it("builds motor_suggestion from the top ranked suggestion and keeps alternatives as metadata", () => {
    const snapshot = buildMotorSuggestionSnapshot(baseResult.suggestions);

    expect(snapshot).toMatchObject({
      codigo_servicio: "SENS-VIR-01",
      referencia_servicio: "Sensibilizacion Virtual",
      descripcion_servicio: "Sensibilizacion",
      modalidad_servicio: "Virtual",
      valor_base: 50000,
      observaciones: "Cargo: auxiliar",
      observacion_agencia: "Agencia norte",
      seguimiento_servicio: "Seguimiento 1",
      confidence: "high",
      rationale: ["match por cargo"],
      rank: 1,
      score: 38,
    });
    expect(snapshot.alternatives).toEqual([
      expect.objectContaining({
        codigo_servicio: "SENS-BOG-01",
        confidence: "medium",
        rank: 2,
        score: 25,
      }),
    ]);
  });

  it("uses low confidence and null canonical fields when there are no suggestions", () => {
    expect(buildMotorSuggestionSnapshot([])).toMatchObject({
      codigo_servicio: null,
      referencia_servicio: null,
      descripcion_servicio: null,
      modalidad_servicio: null,
      valor_base: null,
      confidence: "low",
      rationale: [],
      alternatives: [],
    });
  });

  it("caps persisted alternatives to avoid unbounded telemetry payloads", () => {
    const manySuggestions = Array.from({ length: MAX_ALTERNATIVES + 3 }, (_, index) => ({
      codigo_servicio: `ALT-${index}`,
      confidence: "medium" as const,
      rationale: [`alt ${index}`],
      rank: index + 1,
      score: 30 - index,
    }));

    const snapshot = buildMotorSuggestionSnapshot(manySuggestions);

    expect(snapshot.codigo_servicio).toBe("ALT-0");
    expect(snapshot.alternatives).toHaveLength(MAX_ALTERNATIVES);
    expect(snapshot.alternatives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo_servicio: "ALT-1" }),
        expect.objectContaining({ codigo_servicio: `ALT-${MAX_ALTERNATIVES}` }),
      ])
    );
    expect(snapshot.alternatives).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo_servicio: `ALT-${MAX_ALTERNATIVES + 1}` }),
      ])
    );
  });

  it("normalizes unknown confidence to low", () => {
    expect(normalizeConfidence("certain")).toBe("low");
    expect(normalizeConfidence("medium")).toBe("medium");
  });

  it("builds a stable server-side idempotency key from origin, acta_ref, and actor", () => {
    const first = buildImportTelemetryIdempotencyKey("acta_pdf", "ABC12XYZ", "auth-user-1");
    const second = buildImportTelemetryIdempotencyKey("acta_pdf", "ABC12XYZ", "auth-user-1");
    const otherOrigin = buildImportTelemetryIdempotencyKey("acta_id_directo", "ABC12XYZ", "auth-user-1");

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
    expect(otherOrigin).not.toBe(first);
  });

  it("uses null idempotency key when the pipeline result has no stable acta_ref", () => {
    const args = buildImportTelemetryRecordArgs(
      { ...baseResult, import_resolution: undefined, parseResult: undefined },
      "acta_pdf",
      "auth-user-1"
    );

    expect(args.p_idempotency_key).toBeNull();
  });

  it("builds RPC args without trusting client-provided session metadata", () => {
    const args = buildImportTelemetryRecordArgs(baseResult, "acta_pdf", "auth-user-1");

    expect(args).toMatchObject({
      p_ods_id: null,
      p_import_origin: "acta_pdf",
      p_confidence: "high",
      p_idempotency_key: expect.stringMatching(/^[a-f0-9]{64}$/),
      p_actor_user_id: "auth-user-1",
    });
    expect(args.p_motor_suggestion).toMatchObject({
      codigo_servicio: "SENS-VIR-01",
      alternatives: expect.any(Array),
    });
  });

  it("propagates telemetria_id only for created and deduped envelopes", async () => {
    const admin: OdsTelemetryRecordClient = {
      rpc: vi.fn(async () => ({
        data: { ok: true, code: "deduped", message: "ok", data: { telemetria_id: "telemetry-1" } },
        error: null,
      })),
    };

    const result = await recordOdsImportTelemetrySnapshot({
      admin,
      result: baseResult,
      importOrigin: "acta_pdf",
      actorUserId: "auth-user-1",
      envValue: "2026-05-04T00:00:00Z",
      now: new Date("2026-05-04T12:00:00Z"),
    });

    expect(result).toEqual({ status: "recorded", code: "deduped", telemetria_id: "telemetry-1" });
  });

  it("does not propagate already_finalized telemetry ids", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const admin: OdsTelemetryRecordClient = {
      rpc: vi.fn(async () => ({
        data: { ok: true, code: "already_finalized", message: "ok", data: { telemetria_id: "old-id" } },
        error: null,
      })),
    };

    const result = await recordOdsImportTelemetrySnapshot({
      admin,
      result: baseResult,
      importOrigin: "acta_pdf",
      actorUserId: "auth-user-1",
      envValue: "2026-05-04T00:00:00Z",
      now: new Date("2026-05-04T12:00:00Z"),
    });

    expect(result).toEqual({ status: "skipped", reason: "non_reusable_code" });
    expect(warn).toHaveBeenCalledWith("[ods/telemetry/record] already_finalized");
  });
});
