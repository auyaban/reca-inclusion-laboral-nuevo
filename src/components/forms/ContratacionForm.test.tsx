import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { useSearchParamsMock, empresaStoreState } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  empresaStoreState: {
    empresa: null as null | { id: string; nombre_empresa: string },
    setEmpresa: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: useSearchParamsMock,
}));

vi.mock("next/dynamic", () => ({
  default: (
    _loader: unknown,
    options?: {
      loading?: () => JSX.Element;
    }
  ) => {
    const Loading = options?.loading;

    return function DynamicMock() {
      return Loading ? <Loading /> : <div>Contratacion editor dinámico</div>;
    };
  },
}));

vi.mock("@/lib/store/empresaStore", () => ({
  useEmpresaStore: (selector: (state: typeof empresaStoreState) => unknown) =>
    selector(empresaStoreState),
}));

import ContratacionForm from "@/components/forms/ContratacionForm";

describe("ContratacionForm container", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    empresaStoreState.empresa = null;
    empresaStoreState.setEmpresa.mockReset();
    useSearchParamsMock.mockReturnValue({
      get: () => null,
    });
  });

  it("renders the lightweight company gate before empresa selection", () => {
    const html = renderToStaticMarkup(<ContratacionForm />);

    expect(html).toContain("Contratacion Incluyente");
    expect(html).toContain("Buscar empresa");
    expect(html).not.toContain("Abriendo formulario");
  });

  it("bypasses the gate when an empresa is already selected", () => {
    empresaStoreState.empresa = {
      id: "empresa-1",
      nombre_empresa: "Empresa Demo",
    };

    const html = renderToStaticMarkup(<ContratacionForm />);

    expect(html).toContain("Abriendo formulario");
    expect(html).not.toContain("Buscar empresa");
  });

  it("bypasses the gate when restoring a draft session", () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === "draft" ? "draft-123" : null),
    });

    const html = renderToStaticMarkup(<ContratacionForm />);

    expect(html).toContain("Abriendo formulario");
    expect(html).not.toContain("Buscar empresa");
  });

  it("keeps the gate for pseudo draft sessions that are not navigable", () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === "session" ? "draft:draft-123" : null),
    });

    const html = renderToStaticMarkup(<ContratacionForm />);

    expect(html).toContain("Buscar empresa");
    expect(html).not.toContain("Abriendo formulario");
  });
});
