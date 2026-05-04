import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { recordOdsTerminarTelemetrySnapshot } from "./terminarSnapshot";
import type { OdsPayload } from "@/lib/ods/schemas";
import type {
  OdsMotorTelemetriaRecordResult,
  OdsTelemetryJsonObject,
} from "@/lib/ods/telemetry/types";

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const startAt = process.env.ODS_TELEMETRY_START_AT;
const startAtDate = startAt ? new Date(startAt) : null;
const runIntegration = Boolean(
  supabaseUrl &&
    serviceRoleKey &&
    startAtDate &&
    !Number.isNaN(startAtDate.getTime()) &&
    startAtDate.getTime() <= Date.now()
);
const testPrefix = `vitest-ods-terminar-telemetry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const createdTelemetryIds: string[] = [];
const createdOdsIds: string[] = [];

function adminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_TEST_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function makeOds(overrides: Partial<OdsPayload> = {}): OdsPayload {
  const base: OdsPayload = {
    orden_clausulada: "si",
    nombre_profesional: "Vitest ODS",
    nit_empresa: "900000000",
    nombre_empresa: "Empresa Telemetria Test",
    caja_compensacion: "Compensar",
    asesor_empresa: "QA",
    sede_empresa: "Bogota",
    fecha_servicio: "2026-05-04",
    codigo_servicio: "TEST-TEL-01",
    referencia_servicio: "ODS telemetry test",
    descripcion_servicio: "Servicio de prueba para telemetria ODS",
    modalidad_servicio: "Virtual",
    valor_virtual: 0,
    valor_bogota: 0,
    valor_otro: 0,
    todas_modalidades: 0,
    horas_interprete: 0,
    valor_interprete: 0,
    valor_total: 0,
    nombre_usuario: "",
    cedula_usuario: "",
    discapacidad_usuario: "",
    genero_usuario: "",
    fecha_ingreso: "2026-05-04",
    tipo_contrato: "",
    cargo_servicio: "",
    total_personas: 0,
    observaciones: `vitest #63 #64 ${testPrefix}`,
    observacion_agencia: "",
    seguimiento_servicio: "",
    mes_servicio: 5,
    ano_servicio: 2026,
    session_id: randomUUID(),
    started_at: "2026-05-04T10:00:00.000Z",
    submitted_at: "2026-05-04T10:10:00.000Z",
  };
  return { ...base, ...overrides };
}

async function createOds(ods: OdsPayload) {
  const { data, error } = await adminClient().rpc("ods_insert_atomic", {
    p_ods: {
      ...ods,
      orden_clausulada: ods.orden_clausulada,
      caja_compensacion: ods.caja_compensacion || null,
      asesor_empresa: ods.asesor_empresa || null,
      sede_empresa: ods.sede_empresa || null,
      fecha_ingreso: ods.fecha_ingreso || null,
      nombre_usuario: ods.nombre_usuario || null,
      cedula_usuario: ods.cedula_usuario || null,
      discapacidad_usuario: ods.discapacidad_usuario || null,
      genero_usuario: ods.genero_usuario || null,
      horas_interprete: ods.horas_interprete ?? null,
      tipo_contrato: ods.tipo_contrato || null,
      cargo_servicio: ods.cargo_servicio || null,
      seguimiento_servicio: ods.seguimiento_servicio || null,
      observaciones: ods.observaciones || null,
      observacion_agencia: ods.observacion_agencia || null,
      formato_finalizado_id: ods.formato_finalizado_id || null,
      user_id: "vitest",
    },
    p_usuarios_nuevos: [],
  });

  expect(error).toBeNull();
  const odsId = (data as { ods_id?: string } | null)?.ods_id;
  expect(odsId).toEqual(expect.any(String));
  createdOdsIds.push(odsId!);
  return odsId!;
}

async function createImportSnapshot(motorSuggestion: OdsTelemetryJsonObject, suffix: string) {
  const { data, error } = await adminClient().rpc("ods_motor_telemetria_record", {
    p_ods_id: null,
    p_import_origin: "acta_pdf",
    p_motor_suggestion: motorSuggestion,
    p_confidence: "high",
    p_idempotency_key: `${testPrefix}-${suffix}`,
  });

  expect(error).toBeNull();
  const envelope = data as OdsMotorTelemetriaRecordResult;
  expect(envelope.ok).toBe(true);
  expect(envelope.data?.telemetria_id).toEqual(expect.any(String));
  createdTelemetryIds.push(envelope.data!.telemetria_id);
  return envelope.data!.telemetria_id;
}

describe.runIf(runIntegration)("ODS terminar telemetry integration", () => {
  afterAll(async () => {
    if (createdTelemetryIds.length > 0) {
      await adminClient().from("ods_motor_telemetria").delete().in("id", createdTelemetryIds);
    }
    if (createdOdsIds.length > 0) {
      await adminClient().from("ods").delete().in("id", createdOdsIds);
    }
  });

  it("finalizes an import snapshot with no mismatches when final value accepts the suggestion", async () => {
    const ods = makeOds();
    const telemetriaId = await createImportSnapshot(
      {
        codigo_servicio: ods.codigo_servicio,
        modalidad_servicio: ods.modalidad_servicio,
        valor_base: null,
      },
      "import-match"
    );
    const odsId = await createOds(ods);

    const result = await recordOdsTerminarTelemetrySnapshot({
      admin: adminClient(),
      ods,
      odsId,
      telemetriaId,
      actorUserId: "actor-a",
    });

    expect(result).toMatchObject({ status: "finalized", telemetria_id: telemetriaId });
    const { data, error } = await adminClient()
      .from("ods_motor_telemetria")
      .select("ods_id, confirmed_at, mismatch_fields")
      .eq("id", telemetriaId)
      .single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ ods_id: odsId, mismatch_fields: [] });
    expect(data?.confirmed_at).toEqual(expect.any(String));
  });

  it("detects modalidad_servicio mismatch on imported snapshot finalization", async () => {
    const ods = makeOds({
      modalidad_servicio: "Bogotá",
      valor_virtual: 0,
      valor_bogota: 0,
    });
    const telemetriaId = await createImportSnapshot(
      {
        codigo_servicio: ods.codigo_servicio,
        modalidad_servicio: "Virtual",
        valor_base: null,
      },
      "import-mismatch"
    );
    const odsId = await createOds(ods);

    const result = await recordOdsTerminarTelemetrySnapshot({
      admin: adminClient(),
      ods,
      odsId,
      telemetriaId,
      actorUserId: "actor-a",
    });

    expect(result.status).toBe("finalized");
    const { data, error } = await adminClient()
      .from("ods_motor_telemetria")
      .select("mismatch_fields")
      .eq("id", telemetriaId)
      .single();
    expect(error).toBeNull();
    expect(data?.mismatch_fields).toEqual(["modalidad_servicio"]);
  });

  it("records and finalizes a manual snapshot with the real ods_id", async () => {
    const ods = makeOds({ session_id: randomUUID() });
    const odsId = await createOds(ods);

    const result = await recordOdsTerminarTelemetrySnapshot({
      admin: adminClient(),
      ods,
      odsId,
      actorUserId: "actor-a",
    });

    expect(result.status).toBe("finalized");
    if (result.status === "finalized") {
      createdTelemetryIds.push(result.telemetria_id);
      const { data, error } = await adminClient()
        .from("ods_motor_telemetria")
        .select("ods_id, import_origin, confirmed_at")
        .eq("id", result.telemetria_id)
        .single();
      expect(error).toBeNull();
      expect(data).toMatchObject({ ods_id: odsId, import_origin: "manual" });
      expect(data?.confirmed_at).toEqual(expect.any(String));
    }
  });

  it("documents known cross-actor finalization risk while snapshots lack actor_user_id", async () => {
    const ods = makeOds({ session_id: randomUUID() });
    const telemetriaId = await createImportSnapshot(
      { codigo_servicio: ods.codigo_servicio, modalidad_servicio: ods.modalidad_servicio },
      "cross-actor-known-risk"
    );
    const odsId = await createOds(ods);

    const result = await recordOdsTerminarTelemetrySnapshot({
      admin: adminClient(),
      ods,
      odsId,
      telemetriaId,
      actorUserId: "different-actor",
    });

    expect(result).toMatchObject({ status: "finalized", telemetria_id: telemetriaId });
  });
});
