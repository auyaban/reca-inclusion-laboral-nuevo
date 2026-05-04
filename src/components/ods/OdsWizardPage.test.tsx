// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useOdsStore } from "@/hooks/useOdsStore";
import type { PipelineResult } from "@/lib/ods/import/pipeline";
import type { OdsPersonaRow } from "@/hooks/useOdsStore";

const previewResult: PipelineResult & { telemetria_id?: string } = {
  success: true,
  level: 4,
  analysis: {},
  participants: [],
  suggestions: [],
  decisionLog: [],
  warnings: [],
  formato_finalizado_id: "11111111-1111-4111-8111-111111111111",
  telemetria_id: "55555555-5555-4555-8555-555555555555",
};

vi.mock("@/components/ods/sections/Seccion1", () => ({
  Seccion1: () => <div data-testid="seccion-1" />,
}));
vi.mock("@/components/ods/sections/Seccion2", () => ({
  Seccion2: () => <div data-testid="seccion-2" />,
}));
vi.mock("@/components/ods/sections/Seccion3", () => ({
  Seccion3: () => <div data-testid="seccion-3" />,
}));
vi.mock("@/components/ods/sections/Seccion4", () => ({
  Seccion4: () => <div data-testid="seccion-4" />,
}));
vi.mock("@/components/ods/sections/Seccion5", () => ({
  Seccion5: () => <div data-testid="seccion-5" />,
}));
vi.mock("@/components/ods/StickyResumenBar", () => ({
  StickyResumenBar: () => <div data-testid="sticky-resumen" />,
}));
vi.mock("@/components/ods/SummaryCard", () => ({
  SummaryCard: () => <div data-testid="summary-card" />,
}));
vi.mock("@/components/ods/ImportActaModal", () => ({
  ImportActaModal: ({ open, onPreview }: { open: boolean; onPreview: (result: typeof previewResult) => void }) =>
    open ? (
      <button type="button" onClick={() => onPreview(previewResult)}>
        mock preview
      </button>
    ) : null,
}));
vi.mock("@/components/ods/ImportPreviewDialog", () => ({
  ImportPreviewDialog: ({
    open,
    onApply,
  }: {
    open: boolean;
    onApply: () => void;
  }) =>
    open ? (
      <button type="button" onClick={onApply}>
        mock apply
      </button>
    ) : null,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  useOdsStore.getState().reset();
});

function fillRequiredWizardState(rows: OdsPersonaRow[]) {
  const store = useOdsStore.getState();
  store.setSeccion1({ orden_clausulada: "si", nombre_profesional: "Ana Reca" });
  store.setSeccion2({
    nit_empresa: "900123456",
    nombre_empresa: "TechCorp",
    caja_compensacion: "Compensar",
    asesor_empresa: "Asesor Uno",
    sede_empresa: "Bogota",
  });
  store.setSeccion3({
    fecha_servicio: "2026-05-04",
    codigo_servicio: "SENS-VIR-01",
    referencia_servicio: "Sensibilizacion",
    descripcion_servicio: "Sensibilizacion virtual",
    modalidad_servicio: "Virtual",
    valor_base: 100000,
    valor_virtual: 100000,
    valor_bogota: 0,
    valor_otro: 0,
    todas_modalidades: 0,
    valor_interprete: 0,
  });
  store.setSeccion4Rows(rows);
  store.computeResumen();
  return store;
}

function makeRow(overrides: Partial<OdsPersonaRow> = {}): OdsPersonaRow {
  return {
    cedula_usuario: "111",
    nombre_usuario: "Ana",
    discapacidad_usuario: "Física",
    genero_usuario: "Mujer",
    fecha_ingreso: "",
    tipo_contrato: "Laboral",
    cargo_servicio: "Auxiliar",
    ...overrides,
  };
}

async function renderAndConfirm() {
  const { default: OdsWizardPage } = await import("@/components/ods/OdsWizardPage");

  render(<OdsWizardPage />);

  fireEvent.click(screen.getByTestId("ods-confirm-terminar-button"));
  fireEvent.click(screen.getByText("Confirmar"));
}

describe("OdsWizardPage import telemetry metadata", () => {
  it("stores telemetria_id when applying an import preview", async () => {
    const { default: OdsWizardPage } = await import("@/components/ods/OdsWizardPage");

    render(<OdsWizardPage />);

    fireEvent.click(screen.getByTestId("ods-import-acta-button"));
    fireEvent.click(screen.getByText("mock preview"));
    fireEvent.click(screen.getByText("mock apply"));

    expect(useOdsStore.getState().formato_finalizado_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(useOdsStore.getState().telemetria_id).toBe("55555555-5555-4555-8555-555555555555");
  });

  it("sends telemetria_id top-level when confirming the ODS", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ods_id: "99999999-9999-4999-8999-999999999999", sync_status: "queued" }),
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const store = fillRequiredWizardState([makeRow({ usuario_reca_exists: false })]);
    store.setTelemetriaId("55555555-5555-4555-8555-555555555555");
    await renderAndConfirm();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(init.body));

    expect(payload.telemetria_id).toBe("55555555-5555-4555-8555-555555555555");
    expect(payload.ods.telemetria_id).toBeUndefined();
  });
});

describe("OdsWizardPage Seccion 4 staging auto-sync", () => {
  it("auto-stagea una cedula nueva valida al confirmar sin click manual", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/ods/usuarios")) {
        return {
          ok: true,
          json: async () => ({ found: false, item: null }),
        };
      }
      return {
        ok: true,
        json: async () => ({ ods_id: "99999999-9999-4999-8999-999999999999", sync_status: "queued" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    fillRequiredWizardState([makeRow({ cedula_usuario: "  123-456  ", usuario_reca_exists: null })]);

    await renderAndConfirm();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/ods/terminar", expect.any(Object)));
    const terminarCall = fetchMock.mock.calls.find(([input]) => String(input) === "/api/ods/terminar");
    const payload = JSON.parse(String(terminarCall?.[1]?.body));

    expect(payload.usuarios_nuevos).toEqual([
      {
        cedula_usuario: "123456",
        nombre_usuario: "Ana",
        discapacidad_usuario: "Física",
        genero_usuario: "Mujer",
        tipo_contrato: "Laboral",
        cargo_servicio: "Auxiliar",
      },
    ]);
  });

  it("no duplica usuarios existentes en usuarios_nuevos", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ods_id: "99999999-9999-4999-8999-999999999999", sync_status: "queued" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    fillRequiredWizardState([makeRow({ usuario_reca_exists: true })]);

    await renderAndConfirm();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/ods/terminar", expect.any(Object)));
    expect(fetchMock.mock.calls.some(([input]) => String(input).startsWith("/api/ods/usuarios"))).toBe(false);
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(init.body));
    expect(payload.usuarios_nuevos).toEqual([]);
  });

  it("en mezcla de existente y nueva envia solo la nueva", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ods_id: "99999999-9999-4999-8999-999999999999", sync_status: "queued" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    fillRequiredWizardState([
      makeRow({ cedula_usuario: "111", nombre_usuario: "Existente", usuario_reca_exists: true }),
      makeRow({
        cedula_usuario: "222",
        nombre_usuario: "Nueva",
        discapacidad_usuario: "Auditiva",
        genero_usuario: "Mujer",
        usuario_reca_exists: false,
      }),
    ]);

    await renderAndConfirm();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/ods/terminar", expect.any(Object)));
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(init.body));
    expect(payload.usuarios_nuevos).toEqual([
      {
        cedula_usuario: "222",
        nombre_usuario: "Nueva",
        discapacidad_usuario: "Auditiva",
        genero_usuario: "Mujer",
        tipo_contrato: "Laboral",
        cargo_servicio: "Auxiliar",
      },
    ]);
  });

  it("bloquea fila nueva incompleta con error claro de Seccion 4", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fillRequiredWizardState([makeRow({ discapacidad_usuario: "", usuario_reca_exists: false })]);

    await renderAndConfirm();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/completa la discapacidad de la fila 1/i)).toBeTruthy();
    expect(screen.queryByText(/Oferentes a crear/i)).toBeNull();
  });

  it("mantiene staging manual valido si la fila actual coincide", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ods_id: "99999999-9999-4999-8999-999999999999", sync_status: "queued" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const store = fillRequiredWizardState([makeRow({ cedula_usuario: "333", usuario_reca_exists: false })]);
    store.addUsuarioNuevo({
      cedula_usuario: "333",
      nombre_usuario: "Ana",
      discapacidad_usuario: "Física",
      genero_usuario: "Mujer",
      tipo_contrato: "Laboral",
      cargo_servicio: "Auxiliar",
    });

    await renderAndConfirm();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/ods/terminar", expect.any(Object)));
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(init.body));
    expect(payload.usuarios_nuevos).toHaveLength(1);
    expect(payload.usuarios_nuevos[0].cedula_usuario).toBe("333");
  });
});
