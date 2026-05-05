import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";
import type { PipelineResult } from "@/lib/ods/import/pipeline";
import {
  recordOdsImportTelemetrySnapshot,
  type OdsTelemetryRecordClient,
} from "@/lib/ods/telemetry/importSnapshot";

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runIntegration = Boolean(supabaseUrl && serviceRoleKey);
const testPrefix = `vitest-ods-import-snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const actorUserId = "11111111-1111-4111-8111-111111111111";

function adminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_TEST_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function pipelineResult(actaRef: string): PipelineResult {
  return {
    success: true,
    level: actaRef ? 2 : 4,
    analysis: {},
    participants: [],
    suggestions: [
      {
        codigo_servicio: "SENS-VIR-01",
        referencia_servicio: "Sensibilizacion Virtual",
        descripcion_servicio: "Sensibilizacion",
        modalidad_servicio: "Virtual",
        valor_base: 50000,
        confidence: "high",
        rationale: ["integration import snapshot"],
        rank: 1,
        score: 38,
      },
    ],
    decisionLog: [],
    warnings: [],
    import_resolution: {
      strategy: actaRef ? "lookup" : "parser",
      reason: actaRef ? "acta_ref_lookup" : "no_acta_ref",
      acta_ref: actaRef,
    },
  };
}

describe.runIf(runIntegration)("ODS import telemetry snapshot integration", () => {
  const createdIds: string[] = [];

  async function recordSnapshot(result: PipelineResult, importOrigin: "acta_pdf" | "acta_excel") {
    const snapshot = await recordOdsImportTelemetrySnapshot({
      admin: adminClient() as unknown as OdsTelemetryRecordClient,
      result,
      importOrigin,
      actorUserId,
      envValue: "2026-05-04T00:00:00Z",
      now: new Date("2026-05-04T12:00:00Z"),
    });

    if (snapshot.status === "recorded") {
      createdIds.push(snapshot.telemetria_id);
    }
    return snapshot;
  }

  afterEach(async () => {
    if (createdIds.length > 0) {
      await adminClient().from("ods_motor_telemetria").delete().in("id", createdIds);
      createdIds.length = 0;
    }
  });

  it("records an active import snapshot with the expected persisted shape", async () => {
    const snapshot = await recordSnapshot(pipelineResult(`${testPrefix}A`), "acta_pdf");
    expect(snapshot.status).toBe("recorded");

    const { data, error } = await adminClient()
      .from("ods_motor_telemetria")
      .select("import_origin, motor_suggestion, confidence, final_value, confirmed_at, idempotency_key")
      .eq("id", snapshot.status === "recorded" ? snapshot.telemetria_id : "")
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      import_origin: "acta_pdf",
      confidence: "high",
      final_value: null,
      confirmed_at: null,
      idempotency_key: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(data?.motor_suggestion).toMatchObject({
      codigo_servicio: "SENS-VIR-01",
      alternatives: [],
    });
  });

  it("dedupes repeated imports for the same actor, origin, and acta_ref", async () => {
    const result = pipelineResult(`${testPrefix}B`);

    const first = await recordSnapshot(result, "acta_pdf");
    const second = await recordSnapshot(result, "acta_pdf");

    expect(first.status).toBe("recorded");
    expect(second.status).toBe("recorded");
    if (first.status === "recorded" && second.status === "recorded") {
      expect(second.code).toBe("deduped");
      expect(second.telemetria_id).toBe(first.telemetria_id);
    }

    const { count, error } = await adminClient()
      .from("ods_motor_telemetria")
      .select("id", { count: "exact", head: true })
      .in("id", createdIds);

    expect(error).toBeNull();
    expect(count).toBe(1);
  });

  it("creates separate rows when idempotency_key is null for no-ACTA imports", async () => {
    const result = pipelineResult("");

    const first = await recordSnapshot(result, "acta_pdf");
    const second = await recordSnapshot(result, "acta_pdf");
    const third = await recordSnapshot(result, "acta_excel");

    expect(first.status).toBe("recorded");
    expect(second.status).toBe("recorded");
    expect(third.status).toBe("recorded");
    if (first.status === "recorded" && second.status === "recorded" && third.status === "recorded") {
      expect(first.code).toBe("created");
      expect(second.code).toBe("created");
      expect(third.code).toBe("created");
      expect(new Set([first.telemetria_id, second.telemetria_id, third.telemetria_id]).size).toBe(3);
    }

    const { data, error } = await adminClient()
      .from("ods_motor_telemetria")
      .select("idempotency_key, import_origin")
      .in("id", createdIds);

    expect(error).toBeNull();
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ idempotency_key: null, import_origin: "acta_pdf" }),
        expect.objectContaining({ idempotency_key: null, import_origin: "acta_excel" }),
      ])
    );
  });
});
