import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type {
  OdsMotorTelemetriaFinalizeResult,
  OdsMotorTelemetriaRecordResult,
  OdsTelemetryJsonObject,
} from "./types";

const MIGRATION_SUFFIX = "_ods_motor_telemetria_actor_user_id.sql";
const DOC_PATH = join(process.cwd(), "docs", "ods_migration_inventory.md");

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runIntegration = Boolean(supabaseUrl && serviceRoleKey);
const testPrefix = `vitest-ods-telemetry-actor-${Date.now()}-${Math.random()
  .toString(16)
  .slice(2)}`;
const actorA = randomUUID();
const actorB = randomUUID();
const createdOdsIds: string[] = [];

function readMigration() {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const migrationName = readdirSync(migrationsDir).find((name) =>
    name.endsWith(MIGRATION_SUFFIX)
  );

  expect(migrationName).toBeDefined();
  return readFileSync(join(migrationsDir, migrationName ?? ""), "utf8");
}

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
      codigo_servicio: `ACTOR-${suffix}`,
      referencia_servicio: "ODS telemetry actor test",
      descripcion_servicio: "Servicio de prueba actor",
      nombre_profesional: "Vitest Actor",
      nombre_empresa: "Empresa Telemetria Actor",
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
      observaciones: `vitest #82 ${testPrefix}`,
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

async function recordTelemetry(
  suffix: string,
  actorUserId: string | null,
  idempotencyKey = `${testPrefix}-${suffix}`
) {
  const args: Record<string, unknown> = {
    p_ods_id: null,
    p_import_origin: "acta_pdf",
    p_motor_suggestion: { codigo_servicio: "ACTOR-001", modalidad_servicio: "Virtual" },
    p_confidence: "high",
    p_idempotency_key: idempotencyKey,
  };
  if (actorUserId !== null) {
    args.p_actor_user_id = actorUserId;
  }

  const { data, error } = await adminClient().rpc("ods_motor_telemetria_record", args);
  expect(error).toBeNull();
  return data as OdsMotorTelemetriaRecordResult;
}

async function finalizeTelemetry(
  telemetriaId: string,
  odsId: string,
  finalValue: OdsTelemetryJsonObject,
  actorUserId: string | null
) {
  const args: Record<string, unknown> = {
    p_telemetria_id: telemetriaId,
    p_ods_id: odsId,
    p_final_value: finalValue,
  };
  if (actorUserId !== null) {
    args.p_actor_user_id = actorUserId;
  }

  const { data, error } = await adminClient().rpc("ods_motor_telemetria_finalize", args);
  expect(error).toBeNull();
  return data as OdsMotorTelemetriaFinalizeResult;
}

describe("ODS #82 ods_motor_telemetria actor_user_id migration contract", () => {
  it("declara actor_user_id, firmas nuevas, grants acotados y elimina overloads viejos", () => {
    const sql = readMigration();

    expect(sql).toMatch(/add\s+column\s+if\s+not\s+exists\s+actor_user_id\s+uuid\s+null/i);
    expect(sql).toMatch(/on\s+public\.ods_motor_telemetria\s*\(actor_user_id\)/i);
    expect(sql).toMatch(/p_actor_user_id\s+uuid\s+default\s+null/i);
    expect(sql).toMatch(/actor_user_id\s+is\s+distinct\s+from\s+p_actor_user_id/i);
    expect(sql).toMatch(/coalesce\s*\(\s*actor_user_id\s*,\s*p_actor_user_id\s*\)/i);
    expect(sql).toMatch(/drop\s+function\s+if\s+exists\s+public\.ods_motor_telemetria_record\(uuid,\s*text,\s*jsonb,\s*text,\s*text\)/i);
    expect(sql).toMatch(/drop\s+function\s+if\s+exists\s+public\.ods_motor_telemetria_finalize\(uuid,\s*uuid,\s*jsonb\)/i);
    expect(sql).toMatch(/revoke\s+execute\s+on\s+function\s+public\.ods_motor_telemetria_record\(uuid,\s*text,\s*jsonb,\s*text,\s*text,\s*uuid\)\s+from\s+public,\s*anon,\s*authenticated\s*;/i);
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+public\.ods_motor_telemetria_record\(uuid,\s*text,\s*jsonb,\s*text,\s*text,\s*uuid\)\s+to\s+service_role\s*;/i);
    expect(sql).toMatch(/revoke\s+execute\s+on\s+function\s+public\.ods_motor_telemetria_finalize\(uuid,\s*uuid,\s*jsonb,\s*uuid\)\s+from\s+public,\s*anon,\s*authenticated\s*;/i);
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+public\.ods_motor_telemetria_finalize\(uuid,\s*uuid,\s*jsonb,\s*uuid\)\s+to\s+service_role\s*;/i);
  });

  it("documenta la mitigacion actor_user_id en el inventory ODS", () => {
    expect(existsSync(DOC_PATH)).toBe(true);
    const markdown = readFileSync(DOC_PATH, "utf8");

    expect(markdown).toContain("Mitigaciones de seguridad ODS");
    expect(markdown).toContain("actor_user_id");
    expect(markdown).toContain("#82");
    expect(markdown).toContain("legacy");
  });
});

describe.runIf(runIntegration)("ods_motor_telemetria actor_user_id integration", () => {
  afterAll(async () => {
    await adminClient()
      .from("ods_motor_telemetria")
      .delete()
      .like("idempotency_key", `${testPrefix}%`);

    if (createdOdsIds.length > 0) {
      await adminClient().from("ods").delete().in("id", createdOdsIds);
    }
  });

  it("finaliza cuando record y finalize usan el mismo actor_user_id", async () => {
    const record = await recordTelemetry("same-actor", actorA);
    expect(record).toMatchObject({ ok: true, code: "created" });
    const odsId = await createTestOds("same-actor");

    const finalized = await finalizeTelemetry(
      record.data!.telemetria_id,
      odsId,
      { codigo_servicio: "ACTOR-001", modalidad_servicio: "Virtual" },
      actorA
    );

    expect(finalized).toMatchObject({ ok: true, code: "finalized" });
  });

  it("rechaza finalize cuando el snapshot pertenece a otro actor_user_id", async () => {
    const record = await recordTelemetry("finalize-mismatch", actorA);
    const odsId = await createTestOds("finalize-mismatch");

    const finalized = await finalizeTelemetry(
      record.data!.telemetria_id,
      odsId,
      { codigo_servicio: "ACTOR-001" },
      actorB
    );

    expect(finalized).toMatchObject({
      ok: false,
      code: "actor_mismatch",
      data: { telemetria_id: record.data!.telemetria_id },
    });
  });

  it("mantiene compatibilidad con filas legacy sin actor_user_id", async () => {
    const idempotencyKey = `${testPrefix}-legacy-null`;
    const insert = await adminClient().from("ods_motor_telemetria").insert({
      idempotency_key: idempotencyKey,
      import_origin: "acta_pdf",
      confidence: "high",
      motor_suggestion: { codigo_servicio: "ACTOR-001" },
    }).select("id").single();
    expect(insert.error).toBeNull();
    const odsId = await createTestOds("legacy-null");

    const finalized = await finalizeTelemetry(
      insert.data!.id,
      odsId,
      { codigo_servicio: "ACTOR-001" },
      actorB
    );

    expect(finalized).toMatchObject({ ok: true, code: "finalized" });
  });

  it("rechaza record dedupe con la misma idempotency_key y actor distinto", async () => {
    const idempotencyKey = `${testPrefix}-dedupe-mismatch`;
    const first = await recordTelemetry("dedupe-first", actorA, idempotencyKey);
    const second = await recordTelemetry("dedupe-second", actorB, idempotencyKey);

    expect(first).toMatchObject({ ok: true, code: "created" });
    expect(second).toMatchObject({
      ok: false,
      code: "actor_mismatch",
      data: { telemetria_id: first.data!.telemetria_id },
    });
  });

  it("permite finalize sin p_actor_user_id durante deploy transicional", async () => {
    const record = await recordTelemetry("null-caller", actorA);
    const odsId = await createTestOds("null-caller");

    const finalized = await finalizeTelemetry(
      record.data!.telemetria_id,
      odsId,
      { codigo_servicio: "ACTOR-001" },
      null
    );

    expect(finalized).toMatchObject({ ok: true, code: "finalized" });
  });
});
