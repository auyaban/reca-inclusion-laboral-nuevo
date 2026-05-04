import { describe, expect, it, vi } from "vitest";
import { recordOdsTerminarTelemetrySnapshot } from "./terminarSnapshot";
import type { OdsPayload } from "@/lib/ods/schemas";

type QueryCall = {
  table: string;
  selectFields?: string;
  eqs: Record<string, unknown>;
  isFilters: Array<{ column: string; value: unknown }>;
  orFilters: string[];
  orderCalls: Array<{ column: string; options: unknown }>;
  limitValue?: number;
  mode?: "many" | "single";
};

const ods: OdsPayload = {
  orden_clausulada: "si",
  nombre_profesional: "Ana Reca",
  nit_empresa: "900123456",
  nombre_empresa: "TechCorp",
  caja_compensacion: "Compensar",
  asesor_empresa: "Asesor Uno",
  sede_empresa: "Bogota",
  fecha_servicio: "2026-05-04",
  codigo_servicio: "SENS-VIR-01",
  referencia_servicio: "Sensibilizacion",
  descripcion_servicio: "Sensibilizacion virtual",
  modalidad_servicio: "Virtual",
  valor_virtual: 100000,
  valor_bogota: 0,
  valor_otro: 0,
  todas_modalidades: 0,
  horas_interprete: 0,
  valor_interprete: 0,
  valor_total: 100000,
  nombre_usuario: "Ana; Luis",
  cedula_usuario: "111;222",
  discapacidad_usuario: "Fisica; Visual",
  genero_usuario: "Mujer; Hombre",
  tipo_contrato: "Laboral; Orientacion Laboral",
  cargo_servicio: "Auxiliar",
  total_personas: 2,
  observaciones: "Acepta sugerencia",
  observacion_agencia: "",
  seguimiento_servicio: "1",
  mes_servicio: 5,
  ano_servicio: 2026,
};

function makeAdmin(options?: {
  rpc?: (functionName: string, args: Record<string, unknown>) => unknown;
  tarifas?: Array<Record<string, unknown>>;
  empresa?: Record<string, unknown> | null;
}) {
  const calls: QueryCall[] = [];
  const rpc = vi.fn((functionName: string, args: Record<string, unknown>) => {
    const value = options?.rpc?.(functionName, args);
    return Promise.resolve(
      value ?? {
        data: { ok: true, code: functionName.includes("record") ? "created" : "finalized", message: "ok", data: { telemetria_id: "55555555-5555-4555-8555-555555555555", mismatch_fields: [] } },
        error: null,
      }
    );
  });

  const admin = {
    calls,
    rpc,
    from: vi.fn((table: string) => {
      const call: QueryCall = { table, eqs: {}, isFilters: [], orFilters: [], orderCalls: [] };
      calls.push(call);
      const query = {
        select: vi.fn((fields: string) => {
          call.selectFields = fields;
          return query;
        }),
        eq: vi.fn((column: string, value: unknown) => {
          call.eqs[column] = value;
          return query;
        }),
        is: vi.fn((column: string, value: unknown) => {
          call.isFilters.push({ column, value });
          return query;
        }),
        or: vi.fn((filter: string) => {
          call.orFilters.push(filter);
          return query;
        }),
        order: vi.fn((column: string, options: unknown) => {
          call.orderCalls.push({ column, options });
          return query;
        }),
        limit: vi.fn((value: number) => {
          call.limitValue = value;
          return query;
        }),
        maybeSingle: vi.fn(() => {
          call.mode = "single";
          const data = table === "empresas" ? options?.empresa ?? null : options?.tarifas?.[0] ?? null;
          return Promise.resolve({ data, error: null });
        }),
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
          call.mode = "many";
          const data = table === "tarifas" ? options?.tarifas ?? [] : [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    }),
  };
  return admin;
}

function activeInput(admin: ReturnType<typeof makeAdmin>, overrides?: Partial<Parameters<typeof recordOdsTerminarTelemetrySnapshot>[0]>) {
  return {
    admin,
    ods,
    odsId: "99999999-9999-4999-8999-999999999999",
    actorUserId: "auth-user-1",
    envValue: "2026-05-04T00:00:00Z",
    now: new Date("2026-05-04T12:00:00Z"),
    ...overrides,
  };
}

describe("recordOdsTerminarTelemetrySnapshot", () => {
  it("finalizes an imported snapshot directly when telemetria_id is present", async () => {
    const admin = makeAdmin({ tarifas: [{ valor_base: 100000 }] });

    await recordOdsTerminarTelemetrySnapshot(
      activeInput(admin, { telemetriaId: "55555555-5555-4555-8555-555555555555" })
    );

    expect(admin.rpc).toHaveBeenCalledTimes(1);
    expect(admin.rpc).toHaveBeenCalledWith(
      "ods_motor_telemetria_finalize",
      expect.objectContaining({
        p_telemetria_id: "55555555-5555-4555-8555-555555555555",
        p_ods_id: "99999999-9999-4999-8999-999999999999",
        p_final_value: expect.objectContaining({ codigo_servicio: "SENS-VIR-01", valor_base: 100000 }),
      })
    );
  });

  it("records a manual snapshot with catalogs and then finalizes it", async () => {
    const admin = makeAdmin({
      tarifas: [{ codigo_servicio: "SENS-VIR-01", referencia_servicio: "Sensibilizacion", descripcion_servicio: "Sensibilizacion virtual", modalidad_servicio: "Virtual", valor_base: 100000 }],
      empresa: { nit_empresa: "900123456", nombre_empresa: "TechCorp", ciudad_empresa: "Bogota", sede_empresa: "Bogota", zona_empresa: null, caja_compensacion: "Compensar", correo_profesional: null, profesional_asignado: null, asesor: "Asesor Uno" },
    });

    await recordOdsTerminarTelemetrySnapshot(activeInput(admin));

    expect(admin.calls.some((call) => call.table === "tarifas" && call.limitValue === 500)).toBe(true);
    expect(admin.calls.some((call) => call.table === "empresas" && call.eqs.nit_empresa === "900123456")).toBe(true);
    expect(admin.rpc).toHaveBeenNthCalledWith(
      1,
      "ods_motor_telemetria_record",
      expect.objectContaining({
        p_ods_id: "99999999-9999-4999-8999-999999999999",
        p_import_origin: "manual",
        p_idempotency_key: null,
      })
    );
    expect(admin.rpc).toHaveBeenNthCalledWith(
      2,
      "ods_motor_telemetria_finalize",
      expect.objectContaining({
        p_telemetria_id: "55555555-5555-4555-8555-555555555555",
        p_ods_id: "99999999-9999-4999-8999-999999999999",
      })
    );
  });

  it("does not call RPCs when telemetry gate is disabled", async () => {
    const admin = makeAdmin();

    await recordOdsTerminarTelemetrySnapshot(activeInput(admin, { envValue: undefined }));

    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("does not call RPCs when telemetry gate is future or invalid", async () => {
    const future = makeAdmin();
    const invalid = makeAdmin();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await recordOdsTerminarTelemetrySnapshot(activeInput(future, { envValue: "2999-01-01T00:00:00Z" }));
    await recordOdsTerminarTelemetrySnapshot(activeInput(invalid, { envValue: "not-a-date" }));

    expect(future.rpc).not.toHaveBeenCalled();
    expect(invalid.rpc).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("[ods/telemetry/record] invalid_start_at");
  });

  it("keeps ODS completion best-effort on RPC ok false, already_finalized, and throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const okFalse = makeAdmin({
      tarifas: [{ valor_base: 100000 }],
      rpc: () => ({ data: { ok: false, code: "ods_id_mismatch", message: "bad", data: null }, error: null }),
    });
    const finalized = makeAdmin({
      tarifas: [{ valor_base: 100000 }],
      rpc: () => ({ data: { ok: true, code: "already_finalized", message: "done", data: null }, error: null }),
    });
    const throwing = makeAdmin({
      tarifas: [{ valor_base: 100000 }],
      rpc: () => {
        throw new Error("network");
      },
    });

    await expect(recordOdsTerminarTelemetrySnapshot(activeInput(okFalse, { telemetriaId: "55555555-5555-4555-8555-555555555555" }))).resolves.toEqual({ status: "skipped", reason: "rpc_failed" });
    await expect(recordOdsTerminarTelemetrySnapshot(activeInput(finalized, { telemetriaId: "55555555-5555-4555-8555-555555555555" }))).resolves.toEqual({ status: "skipped", reason: "already_finalized" });
    await expect(recordOdsTerminarTelemetrySnapshot(activeInput(throwing, { telemetriaId: "55555555-5555-4555-8555-555555555555" }))).resolves.toEqual({ status: "skipped", reason: "rpc_failed" });

    expect(warn).toHaveBeenCalledWith("[ods/telemetry/finalize] ods_id_mismatch");
    expect(warn).toHaveBeenCalledWith("[ods/telemetry/finalize] already_finalized");
    expect(warn).toHaveBeenCalledWith("[ods/telemetry/finalize] exception");
  });

  it("documents weak manual signals as valid low-confidence telemetry", async () => {
    const admin = makeAdmin({ tarifas: [], empresa: null });

    await recordOdsTerminarTelemetrySnapshot(activeInput(admin));

    expect(admin.rpc).toHaveBeenCalledWith(
      "ods_motor_telemetria_record",
      expect.objectContaining({
        p_confidence: "low",
        p_motor_suggestion: expect.objectContaining({
          codigo_servicio: null,
          confidence: "low",
        }),
      })
    );
  });
});
