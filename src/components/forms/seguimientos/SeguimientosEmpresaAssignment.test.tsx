// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useEmpresaSearch: vi.fn(),
}));

vi.mock("@/hooks/useEmpresaSearch", () => ({
  useEmpresaSearch: mocks.useEmpresaSearch,
}));

import { SeguimientosEmpresaAssignment } from "@/components/forms/seguimientos/SeguimientosEmpresaAssignment";
import type { Empresa } from "@/lib/store/empresaStore";

function createEmpresa(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: "emp-1",
    nit_empresa: "900123456-1",
    nombre_empresa: "Empresa Uno SAS",
    ciudad_empresa: "Bogota",
    direccion_empresa: "Calle 123",
    correo_1: "empresa@test.com",
    correo_2: null,
    telefono_empresa: "3100000000",
    contacto_empresa: "Contacto",
    cargo: "Gerente",
    asesor: "Asesor",
    sede_empresa: "Sede",
    caja_compensacion: "Compensar",
    deleted_at: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    actividad_reciente: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("SeguimientosEmpresaAssignment", () => {
  it("renders the assignment prompt with vinculado info", () => {
    mocks.useEmpresaSearch.mockReturnValue({
      results: [],
      loading: false,
      error: null,
      showNoResults: false,
    });

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

    expect(screen.getByTestId("seguimientos-empresa-assignment")).toBeTruthy();
    expect(
      screen.getByText("Asignar empresa al vinculado")
    ).toBeTruthy();
    const description = screen.getByText((content) =>
      content.includes("Ana Perez") &&
      content.includes("1001234567") &&
      content.includes("no tiene empresa asociada")
    );
    expect(description).not.toBeNull();
    expect(
      screen.getByTestId("seguimientos-empresa-search-input")
    ).toBeTruthy();
  });

  it("shows search results and allows selecting an empresa", () => {
    mocks.useEmpresaSearch.mockReturnValue({
      results: [
        createEmpresa({ id: "emp-1", nit_empresa: "900123456-1", nombre_empresa: "Empresa Uno SAS" }),
        createEmpresa({ id: "emp-2", nit_empresa: "800555123-0", nombre_empresa: "Otra Empresa Ltda" }),
      ],
      loading: false,
      error: null,
      showNoResults: false,
    });

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

    expect(
      screen.getByText("Empresa Uno SAS")
    ).toBeTruthy();
    expect(
      screen.getByText("Otra Empresa Ltda")
    ).toBeTruthy();

    fireEvent.click(
      screen.getByTestId("seguimientos-empresa-result-900123456-1")
    );

    expect(
      screen.getByTestId("seguimientos-empresa-assignment-confirm")
    ).toBeTruthy();
    expect(
      screen.getByText("Confirmar asignación de empresa")
    ).toBeTruthy();
    expect(
      screen.getByText("Empresa Uno SAS")
    ).toBeTruthy();
  });

  it("calls onAssign with nit and nombre when confirm is clicked", async () => {
    mocks.useEmpresaSearch.mockReturnValue({
      results: [
        createEmpresa({ id: "emp-1", nit_empresa: "900123456-1", nombre_empresa: "Empresa Uno SAS" }),
      ],
      loading: false,
      error: null,
      showNoResults: false,
    });
    const onAssign = vi.fn().mockResolvedValue(undefined);

    render(
      <SeguimientosEmpresaAssignment
        cedula="1001234567"
        nombreVinculado="Ana Perez"
        loading={false}
        error={null}
        onAssign={onAssign}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByTestId("seguimientos-empresa-result-900123456-1")
    );
    fireEvent.click(
      screen.getByTestId("seguimientos-empresa-assign-confirm-button")
    );

    expect(onAssign).toHaveBeenCalledWith("900123456-1", "Empresa Uno SAS");
  });

  it("calls onCancel when cancel is clicked in confirm view", () => {
    mocks.useEmpresaSearch.mockReturnValue({
      results: [
        createEmpresa({ id: "emp-1", nit_empresa: "900123456-1", nombre_empresa: "Empresa Uno SAS" }),
      ],
      loading: false,
      error: null,
      showNoResults: false,
    });
    const onCancel = vi.fn();

    render(
      <SeguimientosEmpresaAssignment
        cedula="1001234567"
        nombreVinculado="Ana Perez"
        loading={false}
        error={null}
        onAssign={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(
      screen.getByTestId("seguimientos-empresa-result-900123456-1")
    );

    expect(
      screen.getByTestId("seguimientos-empresa-assignment-confirm")
    ).toBeTruthy();

    fireEvent.click(
      screen.getByTestId("seguimientos-empresa-assign-cancel-button")
    );

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows search loading spinner", () => {
    mocks.useEmpresaSearch.mockReturnValue({
      results: [],
      loading: true,
      error: null,
      showNoResults: false,
    });

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

    expect(
      screen.getByText("Buscando empresas...")
    ).toBeTruthy();
  });

  it("shows no results message", () => {
    mocks.useEmpresaSearch.mockReturnValue({
      results: [],
      loading: false,
      error: null,
      showNoResults: true,
    });

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

    expect(
      screen.getByText("No se encontraron empresas con ese nombre.")
    ).toBeTruthy();
  });

  it("allows changing selected empresa via Cambiar button", () => {
    mocks.useEmpresaSearch.mockReturnValue({
      results: [
        createEmpresa({ id: "emp-1", nit_empresa: "900123456-1", nombre_empresa: "Empresa Uno SAS" }),
      ],
      loading: false,
      error: null,
      showNoResults: false,
    });

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

    fireEvent.click(
      screen.getByTestId("seguimientos-empresa-result-900123456-1")
    );

    expect(
      screen.getByTestId("seguimientos-empresa-assignment-confirm")
    ).toBeTruthy();

    fireEvent.click(
      screen.getByTestId("seguimientos-empresa-assign-change-button")
    );

    // Should go back to search view
    expect(
      screen.getByTestId("seguimientos-empresa-assignment")
    ).toBeTruthy();
  });

  it("shows error message when error prop is set", () => {
    mocks.useEmpresaSearch.mockReturnValue({
      results: [],
      loading: false,
      error: null,
      showNoResults: false,
    });

    render(
      <SeguimientosEmpresaAssignment
        cedula="1001234567"
        nombreVinculado="Ana Perez"
        loading={false}
        error="Error de red al asignar empresa"
        onAssign={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(
      screen.getByText("Error de red al asignar empresa")
    ).toBeTruthy();
  });

  it("renders duplicate NIT options with exact-match preselection", () => {
    mocks.useEmpresaSearch.mockReturnValue({
      results: [],
      loading: false,
      error: null,
      showNoResults: false,
    });

    render(
      <SeguimientosEmpresaAssignment
        mode={{
          kind: "disambiguate",
          cedula: "1001234567",
          nombreVinculado: "Ana Perez",
          nit: "900123456-1",
          options: [
            createEmpresa({
              id: "emp-1",
              nombre_empresa: "Empresa Uno SAS",
              ciudad_empresa: "Bogota",
              sede_empresa: "Principal",
              zona_empresa: "Zona Norte",
            }),
            createEmpresa({
              id: "emp-2",
              nombre_empresa: "Empresa Dos SAS",
              ciudad_empresa: "Medellin",
              sede_empresa: "Norte",
              zona_empresa: "Zona Sur",
            }),
          ],
          preselected: createEmpresa({
            id: "emp-1",
            nombre_empresa: "Empresa Uno SAS",
          }),
        }}
        loading={false}
        error={null}
        onAssign={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        "El NIT 900123456-1 tiene 2 empresas registradas. Selecciona la correcta para este vinculado."
      )
    ).toBeTruthy();
    expect(screen.getByText("Empresa Uno SAS")).toBeTruthy();
    expect(screen.getByText("Ref: emp-1")).toBeTruthy();
    expect(screen.getByText("Bogota")).toBeTruthy();
    expect(screen.getByText("Principal")).toBeTruthy();
    expect(screen.getByText("Zona Norte")).toBeTruthy();
    expect(
      screen.getByTestId("seguimientos-empresa-disambiguation-option-emp-1")
    ).toHaveProperty("checked", true);
  });

  it("requires an explicit selection when duplicate NIT has no exact match", () => {
    mocks.useEmpresaSearch.mockReturnValue({
      results: [],
      loading: false,
      error: null,
      showNoResults: false,
    });
    const onAssign = vi.fn().mockResolvedValue(undefined);

    render(
      <SeguimientosEmpresaAssignment
        mode={{
          kind: "disambiguate",
          cedula: "1001234567",
          nombreVinculado: "Ana Perez",
          nit: "900123456-1",
          options: [
            createEmpresa({ id: "emp-1", nombre_empresa: "Empresa Uno SAS" }),
            createEmpresa({ id: "emp-2", nombre_empresa: "Empresa Dos SAS" }),
          ],
        }}
        loading={false}
        error={null}
        onAssign={onAssign}
        onCancel={vi.fn()}
      />
    );

    expect(
      screen.getByTestId("seguimientos-empresa-assign-confirm-button")
    ).toHaveProperty("disabled", true);

    fireEvent.click(
      screen.getByTestId("seguimientos-empresa-disambiguation-card-emp-2")
    );
    fireEvent.click(
      screen.getByTestId("seguimientos-empresa-assign-confirm-button")
    );

    expect(onAssign).toHaveBeenCalledWith("900123456-1", "Empresa Dos SAS");
  });

  it("shows the inactive NIT warning in new assignment mode", () => {
    mocks.useEmpresaSearch.mockReturnValue({
      results: [],
      loading: false,
      error: null,
      showNoResults: false,
    });

    render(
      <SeguimientosEmpresaAssignment
        mode={{
          kind: "new",
          cedula: "1001234567",
          nombreVinculado: "Ana Perez",
          initialNit: "900000000",
          message:
            "El NIT 900000000 registrado en el vinculado no esta en el catalogo activo. Asigna una empresa valida o cambia el NIT.",
        }}
        loading={false}
        error={null}
        onAssign={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        "El NIT 900000000 registrado en el vinculado no esta en el catalogo activo. Asigna una empresa valida o cambia el NIT."
      )
    ).toBeTruthy();
  });
});
