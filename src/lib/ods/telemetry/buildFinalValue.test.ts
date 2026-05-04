import { describe, expect, it, vi } from "vitest";
import { buildOdsTelemetryFinalValue } from "./buildFinalValue";
import type { OdsPayload } from "@/lib/ods/schemas";

type QueryCall = {
  table: string;
  selectFields?: string;
  eqs: Record<string, unknown>;
  orFilters: string[];
  orderCalls: Array<{ column: string; options: unknown }>;
  limitValue?: number;
};

const baseOds: OdsPayload = {
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
  fecha_ingreso: "2026-05-04",
  tipo_contrato: "Laboral; Orientacion Laboral",
  cargo_servicio: "Auxiliar",
  total_personas: 2,
  observaciones: "Acepta sugerencia",
  observacion_agencia: "",
  seguimiento_servicio: "1",
  mes_servicio: 5,
  ano_servicio: 2026,
};

function makeAdmin(tarifas: Array<Record<string, unknown>>) {
  const calls: QueryCall[] = [];
  const admin = {
    calls,
    from: vi.fn((table: string) => {
      const call: QueryCall = { table, eqs: {}, orFilters: [], orderCalls: [] };
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
          const usesNewestVigenteOrder = call.orderCalls.some(
            ({ column, options }) =>
              column === "vigente_desde" &&
              JSON.stringify(options) ===
                JSON.stringify({ ascending: false, nullsFirst: false })
          );
          const rows = usesNewestVigenteOrder
            ? [...tarifas].sort((left, right) =>
                String(right.vigente_desde ?? "").localeCompare(
                  String(left.vigente_desde ?? "")
                )
              )
            : tarifas;
          return Promise.resolve({ data: rows[0] ?? null, error: null });
        }),
      };
      return query;
    }),
  };
  return admin;
}

describe("buildOdsTelemetryFinalValue", () => {
  it("maps comparable ODS fields and derives valor_base from the vigente tarifa", async () => {
    const admin = makeAdmin([{ valor_base: 100000 }]);

    const finalValue = await buildOdsTelemetryFinalValue(admin, baseOds);

    expect(finalValue).toMatchObject({
      codigo_servicio: "SENS-VIR-01",
      referencia_servicio: "Sensibilizacion",
      descripcion_servicio: "Sensibilizacion virtual",
      modalidad_servicio: "Virtual",
      valor_base: 100000,
      valor_total: 100000,
      valor_virtual: 100000,
      valor_bogota: 0,
      valor_otro: 0,
      todas_modalidades: 0,
      valor_interprete: 0,
      horas_interprete: 0,
      total_personas: 2,
      discapacidad_usuario: "Fisica; Visual",
      genero_usuario: "Mujer; Hombre",
      tipo_contrato: "Laboral; Orientacion Laboral",
      fecha_servicio: "2026-05-04",
      observaciones: "Acepta sugerencia",
      observacion_agencia: "",
      seguimiento_servicio: "1",
    });

    const tarifaCall = admin.calls[0];
    expect(tarifaCall.table).toBe("tarifas");
    expect(tarifaCall.selectFields).toBe("valor_base, vigente_desde, vigente_hasta");
    expect(tarifaCall.eqs).toMatchObject({ codigo_servicio: "SENS-VIR-01" });
    expect(tarifaCall.orFilters).toEqual([
      "vigente_desde.is.null,vigente_desde.lte.2026-05-04",
      "vigente_hasta.is.null,vigente_hasta.gte.2026-05-04",
    ]);
    expect(tarifaCall.orderCalls).toContainEqual({
      column: "vigente_desde",
      options: { ascending: false, nullsFirst: false },
    });
    expect(tarifaCall.limitValue).toBe(1);
  });

  it("sets valor_base null and warns when no vigente tarifa exists", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const admin = makeAdmin([]);

    const finalValue = await buildOdsTelemetryFinalValue(admin, baseOds);

    expect(finalValue.valor_base).toBeNull();
    expect(warn).toHaveBeenCalledWith("[ods/telemetry/final-value] tarifa_not_found");
  });

  it("selects the most recent vigente tarifa when multiple rows match", async () => {
    const admin = makeAdmin([
      { valor_base: 90000, vigente_desde: "2025-01-01" },
      { valor_base: 120000, vigente_desde: "2025-12-01" },
    ]);

    const finalValue = await buildOdsTelemetryFinalValue(admin, baseOds);

    expect(finalValue.valor_base).toBe(120000);
  });
});
