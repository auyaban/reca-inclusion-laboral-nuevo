// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
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
});
