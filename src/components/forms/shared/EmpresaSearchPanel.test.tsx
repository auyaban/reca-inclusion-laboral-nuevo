// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useEmpresaSearchMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useEmpresaSearch", () => ({
  useEmpresaSearch: useEmpresaSearchMock,
}));

import { EmpresaSearchPanel } from "@/components/forms/shared/EmpresaSearchPanel";

describe("EmpresaSearchPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEmpresaSearchMock.mockReturnValue({
      results: [
        {
          id: "empresa-1",
          nombre_empresa: "ACME SAS",
          nit_empresa: "900123456",
          ciudad_empresa: "Bogota",
          sede_empresa: "Principal",
          zona_empresa: "Zona Norte",
        },
      ],
      loading: false,
      error: null,
      showNoResults: false,
    });
  });

  it("shows zona compensar in the search results when available", () => {
    render(<EmpresaSearchPanel onSelect={() => {}} autoFocus />);

    expect(screen.getByText("Zona Compensar: Zona Norte")).toBeTruthy();
    expect(screen.queryByText("Sede: Principal")).toBeNull();
    const input = screen.getByRole("textbox");
    expect(input).toHaveProperty("autocomplete", "off");
    expect(input.getAttribute("autocorrect")).toBe("off");
    expect(input.getAttribute("autocapitalize")).toBe("none");
    expect(input.getAttribute("spellcheck")).toBe("false");
  });

  it("selects the search result directly without a browser-side refetch", () => {
    const onSelect = vi.fn();

    render(
      <EmpresaSearchPanel
        onSelect={onSelect}
        resultTestId={(empresa) => `empresa-result-${empresa.id}`}
      />
    );

    fireEvent.click(screen.getByTestId("empresa-result-empresa-1"));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "empresa-1",
        nombre_empresa: "ACME SAS",
        nit_empresa: "900123456",
      })
    );
  });
});
