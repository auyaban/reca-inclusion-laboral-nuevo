// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Empresa } from "@/lib/store/empresaStore";

const sharedPanelEmpresa: Empresa = {
  id: "emp-panel",
  nit_empresa: "901000111-2",
  nombre_empresa: "Empresa Shared Panel",
  ciudad_empresa: "Bogota",
  direccion_empresa: "Calle 100",
  correo_1: "shared@test.com",
  telefono_empresa: "3100000000",
  contacto_empresa: "Contacto",
  cargo: "Gerente",
  profesional_asignado: null,
  correo_profesional: null,
  asesor: "Asesor",
  correo_asesor: null,
  sede_empresa: "Principal",
  caja_compensacion: "Compensar",
};

vi.mock("@/components/forms/shared/EmpresaSearchPanel", () => ({
  EmpresaSearchPanel: ({
    inputTestId,
    onSelect,
    resultTestId,
    variant,
  }: {
    inputTestId?: string;
    onSelect: (empresa: Empresa) => void;
    resultTestId?: (empresa: Empresa) => string;
    variant?: string;
  }) => (
    <div data-testid="shared-empresa-search-panel" data-variant={variant}>
      <input data-testid={inputTestId ?? "shared-panel-input"} />
      <button
        type="button"
        data-testid={resultTestId?.(sharedPanelEmpresa) ?? "shared-panel-result"}
        onClick={() => onSelect(sharedPanelEmpresa)}
      >
        Seleccionar desde panel shared
      </button>
    </div>
  ),
}));

import { SeguimientosEmpresaAssignment } from "@/components/forms/seguimientos/SeguimientosEmpresaAssignment";

afterEach(() => {
  cleanup();
});

describe("SeguimientosEmpresaAssignment EmpresaSearchPanel reuse", () => {
  it("uses the shared EmpresaSearchPanel for new assignment mode", () => {
    render(
      <SeguimientosEmpresaAssignment
        cedula="1001234567"
        nombreVinculado="Ana Perez"
        loading={false}
        error={null}
        onAssign={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const sharedPanel = screen.getByTestId("shared-empresa-search-panel");
    expect(sharedPanel).toBeTruthy();
    expect(sharedPanel.getAttribute("data-variant")).toBe("embedded");

    fireEvent.click(
      screen.getByTestId("seguimientos-empresa-result-901000111-2")
    );

    expect(
      screen.getByTestId("seguimientos-empresa-assignment-confirm")
    ).toBeTruthy();
    expect(screen.getByText("Empresa Shared Panel")).toBeTruthy();
  });
});
