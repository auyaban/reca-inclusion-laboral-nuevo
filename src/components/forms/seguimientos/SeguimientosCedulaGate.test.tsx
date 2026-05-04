// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useUsuariosRecaSearch", () => ({
  useUsuariosRecaSearch: () => ({
    results: [],
    loading: false,
    error: null,
    showNoResults: false,
  }),
}));

vi.mock("@/hooks/useUsuarioRecaDetail", () => ({
  useUsuarioRecaDetail: () => ({
    loading: false,
    error: null,
    loadByCedula: vi.fn(),
  }),
}));

import { SeguimientosCedulaGate } from "@/components/forms/seguimientos/SeguimientosCedulaGate";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SeguimientosCedulaGate", () => {
  it("uses the simpler manual company-type resolution copy", () => {
    render(
      <SeguimientosCedulaGate
        preparing={false}
        progressStep="Preparando caso"
        error={null}
        companyTypeResolution={{
          cedula: "1000061994",
          context: {
            empresa_nombre: "Empresa Uno SAS",
          },
        }}
        onPrepareCedula={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(
      screen.getByText(
        "La empresa asociada es Empresa Uno SAS. Confirma cuántos seguimientos hacer (3 o 6) según la cobertura de la empresa."
      )
    ).toBeTruthy();
  });

  it("renders duplicate empresa selector and confirms the selected company", async () => {
    const onPrepareCedula = vi.fn().mockResolvedValue(undefined);
    const onClearEmpresaAssignmentResolution = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        status: "assigned",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SeguimientosCedulaGate
        preparing={false}
        progressStep="Preparando caso"
        error={null}
        companyTypeResolution={null}
        empresaAssignmentResolution={{
          kind: "disambiguate",
          cedula: "1001234567",
          nombreVinculado: "Ana Perez",
          nit: "900123456-1",
          options: [
            {
              id: "emp-1",
              nombre_empresa: "Empresa Uno SAS",
              nit_empresa: "900123456-1",
              ciudad_empresa: "Bogota",
              sede_empresa: "Principal",
              zona_empresa: "Zona Norte",
            },
            {
              id: "emp-2",
              nombre_empresa: "Empresa Dos SAS",
              nit_empresa: "900123456-1",
              ciudad_empresa: "Medellin",
              sede_empresa: "Norte",
              zona_empresa: "Zona Sur",
            },
          ],
          preselected: {
            id: "emp-1",
            nombre_empresa: "Empresa Uno SAS",
            nit_empresa: "900123456-1",
            ciudad_empresa: "Bogota",
            sede_empresa: "Principal",
            zona_empresa: "Zona Norte",
          },
        }}
        onClearEmpresaAssignmentResolution={onClearEmpresaAssignmentResolution}
        onPrepareCedula={onPrepareCedula}
      />
    );

    fireEvent.click(
      screen.getByTestId("seguimientos-empresa-assign-confirm-button")
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/seguimientos/empresa/assign",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            cedula: "1001234567",
            nit_empresa: "900123456-1",
            empresa_nombre: "Empresa Uno SAS",
          }),
        })
      );
    });
    expect(onClearEmpresaAssignmentResolution).toHaveBeenCalledOnce();
    expect(onPrepareCedula).toHaveBeenCalledWith("1001234567");
  });

  it("cancels duplicate empresa resolution back to the cedula gate", () => {
    const onClearEmpresaAssignmentResolution = vi.fn();

    render(
      <SeguimientosCedulaGate
        preparing={false}
        progressStep="Preparando caso"
        error={null}
        companyTypeResolution={null}
        empresaAssignmentResolution={{
          kind: "disambiguate",
          cedula: "1001234567",
          nombreVinculado: "Ana Perez",
          nit: "900123456-1",
          options: [
            {
              id: "emp-1",
              nombre_empresa: "Empresa Uno SAS",
              nit_empresa: "900123456-1",
              ciudad_empresa: "Bogota",
              sede_empresa: "Principal",
              zona_empresa: "Zona Norte",
            },
          ],
        }}
        onClearEmpresaAssignmentResolution={onClearEmpresaAssignmentResolution}
        onPrepareCedula={vi.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.click(
      screen.getByTestId("seguimientos-empresa-assign-cancel-button")
    );

    expect(onClearEmpresaAssignmentResolution).toHaveBeenCalledOnce();
  });
});
