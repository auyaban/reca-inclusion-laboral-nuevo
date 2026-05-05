import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type {
  OdsMotorTelemetriaFinalizeResult,
  OdsMotorTelemetriaRecordResult,
} from "./types";

const DOC_PATH = join(process.cwd(), "docs", "ods_integration_tests.md");
const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runIntegration = Boolean(supabaseUrl && serviceRoleKey);
const testPrefix = `vitest-ods-envelope-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const createdOdsIds: string[] = [];

function adminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_TEST_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createTestOds(suffix: string) {
  const now = new Date().toISOString();
  const { data, error } = await adminClient().rpc("ods_insert_atomic", {
    p_ods: {
      session_id: randomUUID(),
      codigo_servicio: `ENV-${suffix}`,
      referencia_servicio: "ODS telemetry envelope test",
      descripcion_servicio: "Servicio de prueba envelope",
      nombre_profesional: "Vitest Envelope",
      nombre_empresa: "Empresa Telemetria Envelope",
      nit_empresa: "900000000",
      caja_compensacion: "Compensar",
      asesor_empresa: "QA",
      sede_empresa: "Bogota",
      fecha_servicio: "2026-05-04",
      fecha_ingreso: "2026-05-04",
      mes_servicio: 5,
      ano_servicio: 2026,
      nombre_usuario: "",
      cedula_usuario: "",
      discapacidad_usuario: "",
      genero_usuario: "",
      modalidad_servicio: "Virtual",
      todas_modalidades: 0,
      horas_interprete: 0,
      valor_virtual: 0,
      valor_bogota: 0,
      valor_otro: 0,
      valor_interprete: 0,
      valor_total: 0,
      tipo_contrato: "",
      cargo_servicio: "",
      seguimiento_servicio: "",
      orden_clausulada: false,
      total_personas: 0,
      observaciones: `vitest #108 ${testPrefix}`,
      observacion_agencia: "",
      started_at: now,
      submitted_at: now,
    },
    p_usuarios_nuevos: [],
  });

  expect(error).toBeNull();
  const odsId = (data as { ods_id?: string } | null)?.ods_id;
  expect(odsId).toEqual(expect.any(String));
  createdOdsIds.push(odsId!);
  return odsId!;
}

async function recordTelemetry(args: Record<string, unknown>) {
  const { data, error } = await adminClient().rpc("ods_motor_telemetria_record", args);
  expect(error).toBeNull();
  return data as OdsMotorTelemetriaRecordResult;
}

async function finalizeTelemetry(args: Record<string, unknown>) {
  const { data, error } = await adminClient().rpc("ods_motor_telemetria_finalize", args);
  expect(error).toBeNull();
  return data as OdsMotorTelemetriaFinalizeResult;
}

function validRecordArgs(overrides: Record<string, unknown> = {}) {
  return {
    p_ods_id: null,
    p_import_origin: "acta_pdf",
    p_motor_suggestion: { codigo_servicio: "ENV-001", modalidad_servicio: "Virtual" },
    p_confidence: "high",
    p_idempotency_key: `${testPrefix}-${randomUUID()}`,
    ...overrides,
  };
}

describe("ODS integration test documentation", () => {
  it("documents the ODS RPC integration matrix", () => {
    expect(existsSync(DOC_PATH)).toBe(true);
    const markdown = readFileSync(DOC_PATH, "utf8");

    expect(markdown).toContain("# Integration tests ODS");
    expect(markdown).toContain("ods_motor_telemetria_record");
    expect(markdown).toContain("ods_motor_telemetria_finalize");
    expect(markdown).toContain("SUPABASE_TEST_URL");
    expect(markdown).toContain("Todo RPC ODS server-only nuevo debe nacer con integration test gated");
    expect(markdown).toContain("dedupe_conflict");
  });
});

describe.runIf(runIntegration)("ods_motor_telemetria RPC envelope codes", () => {
  afterAll(async () => {
    await adminClient()
      .from("ods_motor_telemetria")
      .delete()
      .like("idempotency_key", `${testPrefix}%`);

    if (createdOdsIds.length > 0) {
      await adminClient().from("ods").delete().in("id", createdOdsIds);
    }
  });

  it("cubre early envelopes de record", async () => {
    await expect(recordTelemetry(validRecordArgs({ p_import_origin: "acta_word" }))).resolves.toMatchObject({
      ok: false,
      code: "invalid_origin",
    });

    await expect(recordTelemetry(validRecordArgs({ p_confidence: "certain" }))).resolves.toMatchObject({
      ok: false,
      code: "invalid_confidence",
    });

    await expect(recordTelemetry(validRecordArgs({ p_motor_suggestion: "not-json-object" }))).resolves.toMatchObject({
      ok: false,
      code: "invalid_payload",
    });

    await expect(recordTelemetry(validRecordArgs({ p_ods_id: randomUUID() }))).resolves.toMatchObject({
      ok: false,
      code: "ods_not_found",
    });
  });

  it("cubre early envelopes de finalize", async () => {
    const odsId = await createTestOds("finalize-early");

    await expect(finalizeTelemetry({
      p_telemetria_id: null,
      p_ods_id: odsId,
      p_final_value: { codigo_servicio: "ENV-001" },
    })).resolves.toMatchObject({
      ok: false,
      code: "invalid_payload",
    });

    await expect(finalizeTelemetry({
      p_telemetria_id: randomUUID(),
      p_ods_id: odsId,
      p_final_value: "not-json-object",
    })).resolves.toMatchObject({
      ok: false,
      code: "invalid_payload",
    });

    await expect(finalizeTelemetry({
      p_telemetria_id: randomUUID(),
      p_ods_id: odsId,
      p_final_value: { codigo_servicio: "ENV-001" },
    })).resolves.toMatchObject({
      ok: false,
      code: "not_found",
    });

    const record = await recordTelemetry(validRecordArgs({ p_idempotency_key: `${testPrefix}-finalize-ods-not-found` }));
    await expect(finalizeTelemetry({
      p_telemetria_id: record.data!.telemetria_id,
      p_ods_id: randomUUID(),
      p_final_value: { codigo_servicio: "ENV-001" },
    })).resolves.toMatchObject({
      ok: false,
      code: "ods_not_found",
    });
  });

  it("cubre guards post-link de record y finalize", async () => {
    const odsA = await createTestOds("guard-a");
    const odsB = await createTestOds("guard-b");

    const linkedRecord = await recordTelemetry(validRecordArgs({
      p_ods_id: odsA,
      p_idempotency_key: `${testPrefix}-finalize-mismatch`,
    }));
    await expect(finalizeTelemetry({
      p_telemetria_id: linkedRecord.data!.telemetria_id,
      p_ods_id: odsB,
      p_final_value: { codigo_servicio: "ENV-001" },
    })).resolves.toMatchObject({
      ok: false,
      code: "ods_id_mismatch",
    });

    const finalizedRecord = await recordTelemetry(validRecordArgs({
      p_ods_id: odsA,
      p_idempotency_key: `${testPrefix}-already-finalized`,
    }));
    await expect(finalizeTelemetry({
      p_telemetria_id: finalizedRecord.data!.telemetria_id,
      p_ods_id: odsA,
      p_final_value: { codigo_servicio: "ENV-001" },
    })).resolves.toMatchObject({
      ok: true,
      code: "finalized",
    });
    await expect(recordTelemetry(validRecordArgs({
      p_ods_id: odsA,
      p_idempotency_key: `${testPrefix}-already-finalized`,
    }))).resolves.toMatchObject({
      ok: true,
      code: "already_finalized",
    });

    await expect(recordTelemetry(validRecordArgs({
      p_ods_id: odsA,
      p_idempotency_key: `${testPrefix}-record-ods-mismatch`,
    }))).resolves.toMatchObject({
      ok: true,
      code: "created",
    });
    await expect(recordTelemetry(validRecordArgs({
      p_ods_id: odsB,
      p_idempotency_key: `${testPrefix}-record-ods-mismatch`,
    }))).resolves.toMatchObject({
      ok: false,
      code: "ods_id_mismatch",
    });
  });
});
