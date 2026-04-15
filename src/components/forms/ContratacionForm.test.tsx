import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { useContratacionFormStateMock } = vi.hoisted(() => ({
  useContratacionFormStateMock: vi.fn(),
}));

vi.mock("@/hooks/useContratacionFormState", () => ({
  useContratacionFormState: useContratacionFormStateMock,
}));

vi.mock("@/components/forms/contratacion/ContratacionFormPresenter", () => ({
  ContratacionFormPresenter: () => <div>Contratacion presenter</div>,
}));

import ContratacionForm from "@/components/forms/ContratacionForm";

describe("ContratacionForm container", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    useContratacionFormStateMock.mockReturnValue({ mode: "loading" });

    const html = renderToStaticMarkup(<ContratacionForm />);

    expect(html).toContain("Recuperando acta");
  });

  it("renders draft error state", () => {
    useContratacionFormStateMock.mockReturnValue({
      mode: "draft_error",
      draftErrorState: {
        message: "No se pudo abrir el borrador.",
        onBackToDrafts: vi.fn(),
      },
    });

    const html = renderToStaticMarkup(<ContratacionForm />);

    expect(html).toContain("No se pudo abrir el borrador.");
    expect(html).toContain("Volver a borradores");
  });

  it("renders success state", () => {
    useContratacionFormStateMock.mockReturnValue({
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: <span>Resultado exitoso</span>,
        links: { sheetLink: "https://sheet.example" },
        onReturnToHub: vi.fn(),
        onStartNewForm: vi.fn(),
      },
    });

    const html = renderToStaticMarkup(<ContratacionForm />);

    expect(html).toContain("Formulario guardado");
    expect(html).toContain("Resultado exitoso");
  });

  it("renders editing presenter", () => {
    useContratacionFormStateMock.mockReturnValue({
      mode: "editing",
      presenterProps: {},
    });

    const html = renderToStaticMarkup(<ContratacionForm />);

    expect(html).toContain("Contratacion presenter");
  });
});
