import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OdsPayload } from "@/lib/ods/schemas";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  requireAppRole: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  syncNewOdsRecord: vi.fn(),
  recordOdsTerminarTelemetrySnapshot: vi.fn(),
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: mocks.after,
  };
});

vi.mock("@/lib/auth/roles", () => ({
  requireAppRole: mocks.requireAppRole,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

vi.mock("@/lib/ods/sync/odsSheetSync", () => ({
  syncNewOdsRecord: mocks.syncNewOdsRecord,
}));

vi.mock("@/lib/ods/telemetry/terminarSnapshot", () => ({
  recordOdsTerminarTelemetrySnapshot: mocks.recordOdsTerminarTelemetrySnapshot,
}));

const authOk = {
  ok: true,
  context: {
    user: { id: "auth-user-1", email: "ods@reca.test" },
    profile: {
      id: 10,
      authUserId: "auth-user-1",
      displayName: "ODS User",
      usuarioLogin: "ods_user",
      email: "ods@reca.test",
      authPasswordTemp: false,
    },
    roles: ["ods_operador"],
  },
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
  nombre_usuario: "Ana",
  cedula_usuario: "111",
  discapacidad_usuario: "Fisica",
  genero_usuario: "Mujer",
  tipo_contrato: "Laboral",
  cargo_servicio: "Auxiliar",
  total_personas: 1,
  observaciones: "",
  observacion_agencia: "",
  seguimiento_servicio: "",
  mes_servicio: 5,
  ano_servicio: 2026,
  session_id: "11111111-1111-4111-8111-111111111111",
  started_at: "2026-05-04T10:00:00.000Z",
  submitted_at: "2026-05-04T10:10:00.000Z",
};

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/ods/terminar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeAdmin() {
  return {
    rpc: vi.fn(() => Promise.resolve({ data: { ods_id: "99999999-9999-4999-8999-999999999999" }, error: null })),
  };
}

async function runAfterCallbacks() {
  for (const call of mocks.after.mock.calls) {
    await call[0]();
  }
}

describe("/api/ods/terminar telemetry", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requireAppRole.mockResolvedValue(authOk);
    mocks.syncNewOdsRecord.mockResolvedValue({ sync_status: "ok" });
    mocks.recordOdsTerminarTelemetrySnapshot.mockResolvedValue({ status: "finalized", telemetria_id: "55555555-5555-4555-8555-555555555555" });
  });

  it("schedules finalize telemetry with telemetria_id from import path", async () => {
    const admin = makeAdmin();
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const { POST } = await import("@/app/api/ods/terminar/route");
    const response = await POST(
      makeRequest({
        ods,
        usuarios_nuevos: [],
        telemetria_id: "55555555-5555-4555-8555-555555555555",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ods_id: "99999999-9999-4999-8999-999999999999", sync_status: "queued" });
    expect(mocks.recordOdsTerminarTelemetrySnapshot).not.toHaveBeenCalled();

    await runAfterCallbacks();

    expect(mocks.recordOdsTerminarTelemetrySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        admin,
        ods: expect.objectContaining({ codigo_servicio: "SENS-VIR-01" }),
        odsId: "99999999-9999-4999-8999-999999999999",
        telemetriaId: "55555555-5555-4555-8555-555555555555",
        actorUserId: "auth-user-1",
      })
    );
  });

  it("schedules manual record+finalize telemetry when telemetria_id is absent", async () => {
    const admin = makeAdmin();
    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const { POST } = await import("@/app/api/ods/terminar/route");
    const response = await POST(makeRequest({ ods, usuarios_nuevos: [] }));

    expect(response.status).toBe(200);

    await runAfterCallbacks();

    expect(mocks.recordOdsTerminarTelemetrySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        admin,
        odsId: "99999999-9999-4999-8999-999999999999",
        telemetriaId: undefined,
      })
    );
  });

  it("keeps response normal when telemetry after callback throws", async () => {
    const admin = makeAdmin();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.createSupabaseAdminClient.mockReturnValue(admin);
    mocks.recordOdsTerminarTelemetrySnapshot.mockRejectedValueOnce(new Error("network"));

    const { POST } = await import("@/app/api/ods/terminar/route");
    const response = await POST(
      makeRequest({
        ods,
        usuarios_nuevos: [],
        telemetria_id: "55555555-5555-4555-8555-555555555555",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sync_status).toBe("queued");
    await expect(runAfterCallbacks()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith("[api/ods/terminar.after] telemetry threw unexpectedly", {
      ods_id: "99999999-9999-4999-8999-999999999999",
      error: "network",
    });
  });
});
