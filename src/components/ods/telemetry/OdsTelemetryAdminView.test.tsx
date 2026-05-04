// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OdsTelemetryAdminView from "@/components/ods/telemetry/OdsTelemetryAdminView";
import type { OdsTelemetryAdminResult } from "@/lib/ods/telemetry/admin";
import { parseOdsTelemetryAdminParams } from "@/lib/ods/telemetry/adminSchemas";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function result(overrides: Partial<OdsTelemetryAdminResult> = {}): OdsTelemetryAdminResult {
  return {
    items: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        ods_id: "22222222-2222-4222-8222-222222222222",
        idempotency_key: null,
        import_origin: "manual",
        motor_suggestion: { codigo_servicio: "MOTOR-1" },
        confidence: "high",
        final_value: { codigo_servicio: "FINAL-1" },
        mismatch_fields: ["modalidad_servicio"],
        created_at: "2026-05-04T14:00:00.000Z",
        confirmed_at: "2026-05-04T15:00:00.000Z",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        ods_id: null,
        idempotency_key: null,
        import_origin: "acta_pdf",
        motor_suggestion: { codigo_servicio: "PEND-1" },
        confidence: "low",
        final_value: null,
        mismatch_fields: [],
        created_at: "2026-05-03T14:00:00.000Z",
        confirmed_at: null,
      },
    ],
    total: 2,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    metrics: {
      total: 2,
      confirmed: 1,
      pending: 1,
      confirmedPercent: 50,
      pendingPercent: 50,
      accuracy: {
        confirmedCount: 1,
        fields: [
          { field: "codigo_servicio", label: "Codigo servicio", matches: 1, total: 1, accuracy: 100 },
          { field: "modalidad_servicio", label: "Modalidad servicio", matches: 0, total: 1, accuracy: 0 },
          { field: "valor_total", label: "Valor total", matches: 1, total: 1, accuracy: 100 },
          { field: "valor_base", label: "Valor base", matches: 1, total: 1, accuracy: 100 },
        ],
      },
      topMismatchFields: [{ field: "modalidad_servicio", count: 1 }],
      topMismatchScanCapped: false,
      topMismatchTotal: 1,
    },
    ...overrides,
  };
}

describe("OdsTelemetryAdminView", () => {
  afterEach(cleanup);

  it("renderiza tabla, badges, codigo motor/final y ODS deshabilitada", () => {
    render(
      <OdsTelemetryAdminView
        result={result()}
        params={parseOdsTelemetryAdminParams(new URLSearchParams())}
      />
    );

    expect(screen.getByRole("heading", { name: "Telemetria ODS" })).toBeTruthy();
    expect(screen.getByText("MOTOR-1")).toBeTruthy();
    expect(screen.getByText("FINAL-1")).toBeTruthy();
    expect(screen.getAllByText("Con diferencias").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Pendiente")).toBeTruthy();
    expect(screen.getByText("Detalle ODS pendiente")).toBeTruthy();
  });

  it("muestra estado vacio global cuando no hay filas ni filtros", () => {
    render(
      <OdsTelemetryAdminView
        result={result({ items: [], total: 0, metrics: { ...result().metrics, total: 0 } })}
        params={parseOdsTelemetryAdminParams(new URLSearchParams())}
      />
    );

    expect(
      screen.getByText("Aun no hay datos. Telemetria se activa con ODS_TELEMETRY_START_AT.")
    ).toBeTruthy();
  });

  it("muestra estado vacio de filtros y nota de cap del top mismatch", () => {
    render(
      <OdsTelemetryAdminView
        result={result({
          items: [],
          total: 0,
          metrics: {
            ...result().metrics,
            total: 0,
            topMismatchScanCapped: true,
            topMismatchTotal: 10001,
          },
        })}
        params={parseOdsTelemetryAdminParams(new URLSearchParams("origin=manual"))}
      />
    );

    expect(screen.getByText("No hay filas para los filtros actuales")).toBeTruthy();
    expect(screen.getByText(/Top mismatch calculado sobre las 10000 filas/)).toBeTruthy();
  });
});
