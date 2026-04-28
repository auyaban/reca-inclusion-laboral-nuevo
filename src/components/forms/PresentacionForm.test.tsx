import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const {
  useSearchParamsMock,
  empresaStoreState,
  isFinalizationPrewarmEnabledMock,
} = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  empresaStoreState: {
    empresa: null as null | { id: string; nombre_empresa: string },
    setEmpresa: vi.fn(),
  },
  isFinalizationPrewarmEnabledMock: vi.fn(),
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
      return Loading ? <Loading /> : <div>Presentacion editor dinámico</div>;
    };
  },
}));

vi.mock("@/lib/store/empresaStore", () => ({
  useEmpresaStore: (selector: (state: typeof empresaStoreState) => unknown) =>
    selector(empresaStoreState),
}));

vi.mock("@/lib/finalization/prewarmConfig", () => ({
  isFinalizationPrewarmEnabled: isFinalizationPrewarmEnabledMock,
}));

import PresentacionForm from "@/components/forms/PresentacionForm";

function createSessionStorageMock(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, String(value));
    }),
  };
}

describe("PresentacionForm container", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("window", {
      sessionStorage: createSessionStorageMock(),
    });
    empresaStoreState.empresa = null;
    empresaStoreState.setEmpresa.mockReset();
    isFinalizationPrewarmEnabledMock.mockReturnValue(false);
    useSearchParamsMock.mockReturnValue({
      get: () => null,
    });
  });

  it("renders the lightweight company gate before empresa selection", () => {
    const html = renderToStaticMarkup(<PresentacionForm />);

    expect(html).toContain("Presentacion del Programa");
    expect(html).toContain("Buscar empresa");
    expect(html).not.toContain("Abriendo formulario");
  });

  it("loads the editor dynamically when an empresa is already selected", () => {
    empresaStoreState.empresa = {
      id: "empresa-1",
      nombre_empresa: "Empresa Demo",
    };

    const html = renderToStaticMarkup(<PresentacionForm />);

    expect(html).toContain("Abriendo formulario");
    expect(html).toContain("editor completo de presentación");
    expect(html).not.toContain("Buscar empresa");
  });

  it("shows the early setup for a new presentacion draft when prewarm is enabled", () => {
    isFinalizationPrewarmEnabledMock.mockReturnValue(true);
    empresaStoreState.empresa = {
      id: "empresa-1",
      nombre_empresa: "Empresa Demo",
    };

    const html = renderToStaticMarkup(<PresentacionForm />);

    expect(html).toContain("Datos iniciales de la visita");
    expect(html).toContain("Asistentes estimados");
    expect(html).not.toContain("Abriendo formulario");
  });

  it("skips the early setup when the current browser session already completed it", () => {
    isFinalizationPrewarmEnabledMock.mockReturnValue(true);
    empresaStoreState.empresa = {
      id: "empresa-1",
      nombre_empresa: "Empresa Demo",
    };
    window.sessionStorage.setItem(
      "reca:presentacion-prewarm-setup:v1:empresa-1",
      JSON.stringify({
        tipo_visita: "ReactivaciÃ³n",
        prewarm_asistentes_estimados: 5,
      })
    );

    const html = renderToStaticMarkup(<PresentacionForm />);

    expect(html).toContain("Abriendo formulario");
    expect(html).not.toContain("Datos iniciales de la visita");
  });

  it("shows the early setup for an explicit new draft even if the session has a prior seed", () => {
    isFinalizationPrewarmEnabledMock.mockReturnValue(true);
    empresaStoreState.empresa = {
      id: "empresa-1",
      nombre_empresa: "Empresa Demo",
    };
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === "new" ? "1" : null),
    });
    window.sessionStorage.setItem(
      "reca:presentacion-prewarm-setup:v1:empresa-1",
      JSON.stringify({
        tipo_visita: "ReactivaciÃ³n",
        prewarm_asistentes_estimados: 5,
      })
    );

    const html = renderToStaticMarkup(<PresentacionForm />);

    expect(html).toContain("Datos iniciales de la visita");
    expect(html).toContain("Asistentes estimados");
  });

  it("loads the editor dynamically while restoring from a navigable session", () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === "session" ? "session-123" : null),
    });

    const html = renderToStaticMarkup(<PresentacionForm />);

    expect(html).toContain("Abriendo formulario");
    expect(html).toContain("editor completo de presentación");
    expect(html).not.toContain("Buscar empresa");
  });
});
