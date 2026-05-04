import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { ODS_TELEMETRY_MISMATCH_FIXTURES } from "./fixtures";
import { calculateTelemetryMismatchFields } from "./mismatchFields";
import type {
  OdsMotorTelemetriaFinalizeResult,
  OdsMotorTelemetriaRecordResult,
  OdsTelemetryJsonObject,
} from "./types";

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const nonAdminJwt = process.env.SUPABASE_TEST_NON_ADMIN_JWT;

const runIntegration = Boolean(supabaseUrl && serviceRoleKey);
const testPrefix = `vitest-ods-telemetria-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const createdOdsIds: string[] = [];

function adminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_TEST_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function publicClient(token?: string) {
  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing SUPABASE_TEST_URL or anon/publishable key.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

async function recordTelemetry(
  motorSuggestion: OdsTelemetryJsonObject,
  suffix: string,
  confidence: "low" | "medium" | "high" = "high"
) {
  const { data, error } = await adminClient().rpc("ods_motor_telemetria_record", {
    p_ods_id: null,
    p_import_origin: "acta_pdf",
    p_motor_suggestion: motorSuggestion,
    p_confidence: confidence,
    p_idempotency_key: `${testPrefix}-${suffix}`,
  });

  expect(error).toBeNull();
  const envelope = data as OdsMotorTelemetriaRecordResult;
  expect(envelope.ok).toBe(true);
  expect(envelope.data?.telemetria_id).toEqual(expect.any(String));
  return envelope;
}

async function finalizeTelemetry(
  telemetriaId: string,
  finalValue: OdsTelemetryJsonObject,
  odsId: string
) {
  const { data, error } = await adminClient().rpc("ods_motor_telemetria_finalize", {
    p_telemetria_id: telemetriaId,
    p_ods_id: odsId,
    p_final_value: finalValue,
  });

  expect(error).toBeNull();
  return data as OdsMotorTelemetriaFinalizeResult;
}

async function createTestOds(suffix: string) {
  const sessionId = randomUUID();
  const now = new Date().toISOString();
  const { data, error } = await adminClient().rpc("ods_insert_atomic", {
    p_ods: {
      session_id: sessionId,
      codigo_servicio: `TEST-${suffix}`,
      referencia_servicio: "ODS telemetry test",
      descripcion_servicio: "Servicio de prueba para telemetria ODS",
      nombre_profesional: "Vitest ODS",
      nombre_empresa: "Empresa Telemetria Test",
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
      observaciones: `vitest #61 ${testPrefix}`,
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

describe.runIf(runIntegration)("ods_motor_telemetria RPCs", () => {
  afterAll(async () => {
    await adminClient()
      .from("ods_motor_telemetria")
      .delete()
      .like("idempotency_key", `${testPrefix}%`);

    if (createdOdsIds.length > 0) {
      await adminClient().from("ods").delete().in("id", createdOdsIds);
    }
  });

  it("records a service-role snapshot with an envelope response", async () => {
    const envelope = await recordTelemetry(
      { codigo_servicio: "ODS-001", modalidad_servicio: "Virtual" },
      "record"
    );

    expect(envelope.code).toBe("created");
  });

  it("dedupes by idempotency_key and updates unfinalized snapshots", async () => {
    const first = await recordTelemetry(
      { codigo_servicio: "ODS-001", modalidad_servicio: "Virtual" },
      "dedupe",
      "medium"
    );
    const second = await recordTelemetry(
      { codigo_servicio: "ODS-002", modalidad_servicio: "Bogota" },
      "dedupe",
      "low"
    );

    expect(second.code).toBe("deduped");
    expect(second.data?.telemetria_id).toBe(first.data?.telemetria_id);

    const { data, error } = await adminClient()
      .from("ods_motor_telemetria")
      .select("confidence, motor_suggestion")
      .eq("id", second.data!.telemetria_id)
      .single();

    expect(error).toBeNull();
    expect(data?.confidence).toBe("low");
    expect(data?.motor_suggestion).toMatchObject({ codigo_servicio: "ODS-002" });
  });

  it("finalizes and calculates mismatch_fields", async () => {
    const fixture = ODS_TELEMETRY_MISMATCH_FIXTURES.at(-1)!;
    const odsId = await createTestOds("finalize");
    const record = await recordTelemetry(fixture.motorSuggestion, "finalize");
    const finalized = await finalizeTelemetry(record.data!.telemetria_id, fixture.finalValue, odsId);

    expect(finalized).toMatchObject({
      ok: true,
      code: "finalized",
      data: { mismatch_fields: fixture.expectedMismatchFields },
    });
  });

  it("links a pre-ODS snapshot to the real ODS when finalized", async () => {
    const fixture = ODS_TELEMETRY_MISMATCH_FIXTURES.find(
      (item) => item.expectedMismatchFields.length > 0
    )!;
    const record = await recordTelemetry(fixture.motorSuggestion, "pre-ods-flow");
    const telemetriaId = record.data!.telemetria_id;
    const odsId = await createTestOds("pre-ods-flow");

    const finalized = await finalizeTelemetry(telemetriaId, fixture.finalValue, odsId);

    expect(finalized).toMatchObject({
      ok: true,
      code: "finalized",
      data: { mismatch_fields: fixture.expectedMismatchFields },
    });

    const { data, error } = await adminClient()
      .from("ods_motor_telemetria")
      .select("ods_id, confirmed_at, mismatch_fields")
      .eq("id", telemetriaId)
      .single();

    expect(error).toBeNull();
    expect(data?.ods_id).toBe(odsId);
    expect(data?.confirmed_at).toEqual(expect.any(String));
    expect(data?.mismatch_fields).toEqual(fixture.expectedMismatchFields);
  });

  it("returns an envelope when finalize receives an unknown ODS id", async () => {
    const record = await recordTelemetry({ codigo_servicio: "A-100" }, "ods-not-found");
    const { data, error } = await adminClient().rpc("ods_motor_telemetria_finalize", {
      p_telemetria_id: record.data!.telemetria_id,
      p_ods_id: randomUUID(),
      p_final_value: { codigo_servicio: "A-101" },
    });

    expect(error).toBeNull();
    expect(data as OdsMotorTelemetriaFinalizeResult).toMatchObject({
      ok: false,
      code: "ods_not_found",
    });
  });

  it("does not overwrite final_value after already_finalized", async () => {
    const odsId = await createTestOds("already-finalized");
    const record = await recordTelemetry({ codigo_servicio: "A-100" }, "already-finalized");
    const telemetriaId = record.data!.telemetria_id;

    const first = await finalizeTelemetry(telemetriaId, { codigo_servicio: "A-101" }, odsId);
    expect(first.code).toBe("finalized");

    const second = await finalizeTelemetry(telemetriaId, { codigo_servicio: "A-100" }, odsId);
    expect(second.code).toBe("already_finalized");

    const { data, error } = await adminClient()
      .from("ods_motor_telemetria")
      .select("final_value, mismatch_fields")
      .eq("id", telemetriaId)
      .single();

    expect(error).toBeNull();
    expect(data?.final_value).toMatchObject({ codigo_servicio: "A-101" });
    expect(data?.mismatch_fields).toEqual(["codigo_servicio"]);
  });

  it("keeps TS preview mismatch logic in parity with SQL finalize", async () => {
    const odsId = await createTestOds("parity");
    for (const [index, fixture] of ODS_TELEMETRY_MISMATCH_FIXTURES.entries()) {
      const expectedFromTs = calculateTelemetryMismatchFields(
        fixture.motorSuggestion,
        fixture.finalValue
      );
      const record = await recordTelemetry(fixture.motorSuggestion, `parity-${index}`);
      const finalized = await finalizeTelemetry(record.data!.telemetria_id, fixture.finalValue, odsId);

      expect(finalized.ok).toBe(true);
      expect(finalized.data?.mismatch_fields).toEqual(expectedFromTs);
      expect(finalized.data?.mismatch_fields).toEqual(fixture.expectedMismatchFields);
    }
  });

  it("rejects invalid import_origin and confidence through table constraints", async () => {
    const invalidOrigin = await adminClient().from("ods_motor_telemetria").insert({
      import_origin: "acta_word",
      confidence: "high",
      motor_suggestion: { codigo_servicio: "ODS-001" },
    });
    expect(invalidOrigin.error).not.toBeNull();

    const invalidConfidence = await adminClient().from("ods_motor_telemetria").insert({
      import_origin: "acta_pdf",
      confidence: "certain",
      motor_suggestion: { codigo_servicio: "ODS-001" },
    });
    expect(invalidConfidence.error).not.toBeNull();
  });

  it.runIf(Boolean(anonKey))("denies RPC execution to anon", async () => {
    const { error } = await publicClient().rpc("ods_motor_telemetria_record", {
      p_import_origin: "acta_pdf",
      p_motor_suggestion: { codigo_servicio: "ODS-001" },
      p_confidence: "high",
      p_idempotency_key: `${testPrefix}-anon`,
    });

    expect(error).not.toBeNull();
  });

  it.runIf(Boolean(anonKey))("does not expose telemetry rows to anon select", async () => {
    await recordTelemetry({ codigo_servicio: "ODS-001" }, "anon-rls");

    const { data, error } = await publicClient().from("ods_motor_telemetria").select("id");

    expect(error ?? data).toBeTruthy();
    if (!error) {
      expect(data).toEqual([]);
    }
  });

  it.runIf(Boolean(nonAdminJwt && anonKey))(
    "does not expose telemetry rows to authenticated users without ods_telemetria_admin",
    async () => {
      await recordTelemetry({ codigo_servicio: "ODS-001" }, "non-admin-rls");

      const { data, error } = await publicClient(nonAdminJwt).from("ods_motor_telemetria").select("id");

      expect(error ?? data).toBeTruthy();
      if (!error) {
        expect(data).toEqual([]);
      }
    }
  );
});
