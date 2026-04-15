import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useEmpresaSearchMock = vi.hoisted(() => vi.fn());
const getEmpresaByIdMock = vi.hoisted(() => vi.fn());
const useStateMock = vi.hoisted(() => vi.fn());

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useState: useStateMock,
  };
});

vi.mock("@/hooks/useEmpresaSearch", () => ({
  useEmpresaSearch: useEmpresaSearchMock,
}));

vi.mock("@/lib/empresa", () => ({
  getEmpresaById: getEmpresaByIdMock,
}));

import { EmpresaSearchPanel } from "@/components/forms/shared/EmpresaSearchPanel";

describe("EmpresaSearchPanel", () => {
  beforeEach(() => {
    useStateMock.mockReset();
    useStateMock
      .mockImplementationOnce(() => ["Acme", vi.fn()])
      .mockImplementationOnce(() => [null, vi.fn()]);

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

    getEmpresaByIdMock.mockResolvedValue(null);
  });

  it("shows zona compensar in the search results when available", () => {
    const html = renderToStaticMarkup(
      <EmpresaSearchPanel onSelect={() => {}} autoFocus />
    );

    expect(html).toContain("Zona Compensar: Zona Norte");
    expect(html).not.toContain("Sede: Principal");
  });
});
