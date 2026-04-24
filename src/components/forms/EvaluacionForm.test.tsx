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
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
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
      return Loading ? <Loading /> : <div>Evaluacion editor dinámico</div>;
    };
  },
}));

vi.mock("@/lib/store/empresaStore", () => ({
  useEmpresaStore: (selector: (state: typeof empresaStoreState) => unknown) =>
    selector(empresaStoreState),
}));

import EvaluacionForm from "@/components/forms/EvaluacionForm";

describe("EvaluacionForm container", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    empresaStoreState.empresa = null;
    empresaStoreState.setEmpresa.mockReset();
    useSearchParamsMock.mockReturnValue({
      get: () => null,
    });
  });

  it("renders the lightweight company gate before empresa selection", () => {
    const html = renderToStaticMarkup(<EvaluacionForm />);

    expect(html).toContain("Evaluacion de Accesibilidad");
    expect(html).toContain("Buscar empresa");
    expect(html).not.toContain("Abriendo formulario");
  });

  it("bypasses the gate when an empresa is already selected", () => {
    empresaStoreState.empresa = {
      id: "empresa-1",
      nombre_empresa: "Empresa Demo",
    };

    const html = renderToStaticMarkup(<EvaluacionForm />);

    expect(html).toContain("Abriendo formulario");
    expect(html).not.toContain("Buscar empresa");
  });

  it("bypasses the gate when restoring a navigable session", () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === "session" ? "session-123" : null),
    });

    const html = renderToStaticMarkup(<EvaluacionForm />);

    expect(html).toContain("Abriendo formulario");
    expect(html).not.toContain("Buscar empresa");
  });
});
