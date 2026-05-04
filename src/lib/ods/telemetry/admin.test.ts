import { describe, expect, it } from "vitest";
import type { OdsMotorTelemetriaRow } from "@/lib/ods/telemetry/types";
import {
  computeAccuracyMetrics,
  computeTopMismatchFields,
  getOdsTelemetryAdminData,
  getMismatchStatus,
  hasActiveTelemetryFilters,
  TOP_MISMATCH_SCAN_LIMIT,
} from "@/lib/ods/telemetry/admin";
import { parseOdsTelemetryAdminParams } from "@/lib/ods/telemetry/adminSchemas";

function row(
  overrides: Partial<OdsMotorTelemetriaRow> = {}
): OdsMotorTelemetriaRow {
  return {
    id: crypto.randomUUID(),
    ods_id: null,
    idempotency_key: null,
    import_origin: "manual",
    motor_suggestion: { codigo_servicio: "A1" },
    confidence: "medium",
    final_value: null,
    mismatch_fields: [],
    created_at: "2026-05-04T10:00:00.000Z",
    confirmed_at: null,
    ...overrides,
  };
}

class FakeTelemetryQuery {
  private filters: Array<(row: OdsMotorTelemetriaRow) => boolean> = [];
  private sortColumn: keyof OdsMotorTelemetriaRow | null = null;
  private sortAscending = false;
  private from = 0;
  private to: number | null = null;
  private limitValue: number | null = null;
  private head = false;

  constructor(private readonly rows: OdsMotorTelemetriaRow[]) {}

  select(_fields: string, options?: { head?: boolean }) {
    this.head = options?.head === true;
    return this;
  }

  in(column: keyof OdsMotorTelemetriaRow, values: readonly string[]) {
    this.filters.push((item) => values.includes(String(item[column])));
    return this;
  }

  gte(column: keyof OdsMotorTelemetriaRow, value: string) {
    this.filters.push((item) => String(item[column]) >= value);
    return this;
  }

  lte(column: keyof OdsMotorTelemetriaRow, value: string) {
    this.filters.push((item) => String(item[column]) <= value);
    return this;
  }

  is(column: keyof OdsMotorTelemetriaRow, value: null) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  not(column: keyof OdsMotorTelemetriaRow, operator: string, value: unknown) {
    this.filters.push((item) => {
      if (operator === "is" && value === null) {
        return item[column] !== null;
      }
      if (operator === "eq" && value === "{}") {
        return (item[column] as string[]).length !== 0;
      }
      if (operator === "cs") {
        const field = String(value).replace(/[{}"]/g, "");
        return !(item[column] as string[]).includes(field);
      }
      return true;
    });
    return this;
  }

  filter(column: keyof OdsMotorTelemetriaRow, operator: string, value: string) {
    this.filters.push((item) => {
      if (operator === "eq" && value === "{}") {
        return (item[column] as string[]).length === 0;
      }
      return true;
    });
    return this;
  }

  order(column: keyof OdsMotorTelemetriaRow, options: { ascending: boolean }) {
    this.sortColumn = column;
    this.sortAscending = options.ascending;
    return this;
  }

  range(from: number, to: number) {
    this.from = from;
    this.to = to;
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  private execute() {
    let data = this.rows.filter((item) =>
      this.filters.every((filter) => filter(item))
    );
    const count = data.length;

    if (this.sortColumn) {
      const column = this.sortColumn;
      data = [...data].sort((a, b) => {
        const left = String(a[column] ?? "");
        const right = String(b[column] ?? "");
        return this.sortAscending
          ? left.localeCompare(right)
          : right.localeCompare(left);
      });
    }

    if (this.limitValue !== null) {
      data = data.slice(0, this.limitValue);
    }

    if (this.to !== null) {
      data = data.slice(this.from, this.to + 1);
    }

    return { data: this.head ? null : data, error: null, count };
  }

  then<TResult1 = unknown>(
    onfulfilled?: ((value: ReturnType<FakeTelemetryQuery["execute"]>) => TResult1) | null
  ) {
    return Promise.resolve(this.execute()).then(onfulfilled);
  }
}

function fakeAdmin(rows: OdsMotorTelemetriaRow[]) {
  return {
    from: (table: string) => {
      expect(table).toBe("ods_motor_telemetria");
      return new FakeTelemetryQuery(rows);
    },
  };
}

describe("ods telemetry admin helpers", () => {
  it("calcula estados de mismatch para pendientes, match exacto y diferencias", () => {
    expect(getMismatchStatus(row())).toEqual({ label: "Pendiente", tone: "warning" });
    expect(
      getMismatchStatus(row({ confirmed_at: "2026-05-04T11:00:00.000Z" }))
    ).toEqual({ label: "Match exacto", tone: "success" });
    expect(
      getMismatchStatus(
        row({
          confirmed_at: "2026-05-04T11:00:00.000Z",
          mismatch_fields: ["modalidad_servicio"],
        })
      )
    ).toEqual({ label: "Con diferencias", tone: "danger" });
  });

  it("calcula accuracy excluyendo pendientes del denominador", () => {
    const metrics = computeAccuracyMetrics([
      row({ confirmed_at: "2026-05-04T11:00:00.000Z", mismatch_fields: [] }),
      row({
        confirmed_at: "2026-05-04T11:01:00.000Z",
        mismatch_fields: ["modalidad_servicio"],
      }),
      row({ mismatch_fields: ["codigo_servicio"] }),
    ]);

    expect(metrics.confirmedCount).toBe(2);
    expect(metrics.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "codigo_servicio", matches: 2, total: 2, accuracy: 100 }),
        expect.objectContaining({ field: "modalidad_servicio", matches: 1, total: 2, accuracy: 50 }),
      ])
    );
  });

  it("ordena top mismatch por conteo descendente", () => {
    const rows = [
      ...Array.from({ length: 5 }, () => row({ mismatch_fields: ["modalidad_servicio"] })),
      ...Array.from({ length: 3 }, () => row({ mismatch_fields: ["codigo_servicio"] })),
      row({ mismatch_fields: ["valor_total"] }),
    ];

    expect(computeTopMismatchFields(rows).slice(0, 2)).toEqual([
      { field: "modalidad_servicio", count: 5 },
      { field: "codigo_servicio", count: 3 },
    ]);
  });

  it("detecta filtros activos sin contar paginacion ni orden", () => {
    expect(
      hasActiveTelemetryFilters(
        parseOdsTelemetryAdminParams(new URLSearchParams("page=2&pageSize=100"))
      )
    ).toBe(false);
    expect(
      hasActiveTelemetryFilters(
        parseOdsTelemetryAdminParams(new URLSearchParams("origin=manual"))
      )
    ).toBe(true);
  });

  it("expone un cap explicito para el scan de top mismatch", () => {
    expect(TOP_MISMATCH_SCAN_LIMIT).toBe(10000);
  });

  it("aplica filtros SQL-equivalentes, paginacion y metricas sobre el mismo rango", async () => {
    const params = parseOdsTelemetryAdminParams(
      new URLSearchParams("origin=manual&confidence=high&page=1&pageSize=1")
    );
    const result = await getOdsTelemetryAdminData({
      params,
      admin: fakeAdmin([
        row({
          id: "manual-high-1",
          import_origin: "manual",
          confidence: "high",
          created_at: "2026-05-04T12:00:00.000Z",
          confirmed_at: "2026-05-04T12:10:00.000Z",
          mismatch_fields: ["modalidad_servicio"],
        }),
        row({
          id: "manual-high-2",
          import_origin: "manual",
          confidence: "high",
          created_at: "2026-05-03T12:00:00.000Z",
          confirmed_at: "2026-05-03T12:10:00.000Z",
          mismatch_fields: [],
        }),
        row({ id: "pdf-low", import_origin: "acta_pdf", confidence: "low" }),
      ]) as never,
    });

    expect(result.items.map((item) => item.id)).toEqual(["manual-high-1"]);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.metrics.confirmed).toBe(2);
    expect(result.metrics.accuracy.fields).toContainEqual(
      expect.objectContaining({
        field: "modalidad_servicio",
        matches: 1,
        total: 2,
        accuracy: 50,
      })
    );
  });

  it("calcula accuracy y top mismatch sobre confirmadas aunque la lista filtre pendientes", async () => {
    const result = await getOdsTelemetryAdminData({
      params: parseOdsTelemetryAdminParams(new URLSearchParams("mismatch=pendiente")),
      admin: fakeAdmin([
        row({ id: "pending-1" }),
        row({
          id: "confirmed-match",
          confirmed_at: "2026-05-04T12:10:00.000Z",
          mismatch_fields: [],
        }),
        row({
          id: "confirmed-mismatch",
          confirmed_at: "2026-05-04T12:15:00.000Z",
          mismatch_fields: ["modalidad_servicio"],
        }),
      ]) as never,
    });

    expect(result.items.map((item) => item.id)).toEqual(["pending-1"]);
    expect(result.total).toBe(1);
    expect(result.metrics.confirmed).toBe(0);
    expect(result.metrics.pending).toBe(1);
    expect(result.metrics.accuracy.confirmedCount).toBe(2);
    expect(result.metrics.accuracy.fields).toContainEqual(
      expect.objectContaining({
        field: "modalidad_servicio",
        matches: 1,
        total: 2,
        accuracy: 50,
      })
    );
    expect(result.metrics.topMismatchFields).toEqual([
      { field: "modalidad_servicio", count: 1 },
    ]);
  });

  it("marca cap cuando el top mismatch supera el limite de scan reciente", async () => {
    const rows = Array.from({ length: TOP_MISMATCH_SCAN_LIMIT + 1 }, (_, index) =>
      row({
        id: `mismatch-${index}`,
        confirmed_at: "2026-05-04T12:00:00.000Z",
        mismatch_fields: ["modalidad_servicio"],
        created_at: new Date(Date.UTC(2026, 4, 4, 12, 0, index % 60)).toISOString(),
      })
    );

    const result = await getOdsTelemetryAdminData({
      params: parseOdsTelemetryAdminParams(new URLSearchParams()),
      admin: fakeAdmin(rows) as never,
    });

    expect(result.metrics.topMismatchScanCapped).toBe(true);
    expect(result.metrics.topMismatchTotal).toBe(TOP_MISMATCH_SCAN_LIMIT + 1);
    expect(result.metrics.topMismatchFields).toEqual([
      { field: "modalidad_servicio", count: TOP_MISMATCH_SCAN_LIMIT },
    ]);
  });
});
