import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { useCondicionesVacanteFormStateMock } = vi.hoisted(() => ({
  useCondicionesVacanteFormStateMock: vi.fn(),
}));

vi.mock("@/hooks/useCondicionesVacanteFormState", () => ({
  useCondicionesVacanteFormState: useCondicionesVacanteFormStateMock,
}));

vi.mock(
  "@/components/forms/condicionesVacante/CondicionesVacanteFormPresenter",
  () => ({
    CondicionesVacanteFormPresenter: () => <div>Condiciones presenter</div>,
  })
);

import CondicionesVacanteForm from "@/components/forms/CondicionesVacanteForm";

describe("CondicionesVacanteForm container", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    useCondicionesVacanteFormStateMock.mockReturnValue({ mode: "loading" });

    const html = renderToStaticMarkup(<CondicionesVacanteForm />);

    expect(html).toContain("Recuperando acta");
  });

  it("renders draft error state", () => {
    useCondicionesVacanteFormStateMock.mockReturnValue({
      mode: "draft_error",
      draftErrorState: {
        message: "No se pudo abrir el borrador.",
        onBackToDrafts: vi.fn(),
      },
    });

    const html = renderToStaticMarkup(<CondicionesVacanteForm />);

    expect(html).toContain("No se pudo abrir el borrador.");
    expect(html).toContain("Volver a borradores");
  });

  it("renders success state", () => {
    useCondicionesVacanteFormStateMock.mockReturnValue({
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: <span>Resultado exitoso</span>,
        links: { sheetLink: "https://sheet.example" },
        onReturnToHub: vi.fn(),
        onStartNewForm: vi.fn(),
      },
    });

    const html = renderToStaticMarkup(<CondicionesVacanteForm />);

    expect(html).toContain("Formulario guardado");
    expect(html).toContain("Resultado exitoso");
  });

  it("renders editing presenter", () => {
    useCondicionesVacanteFormStateMock.mockReturnValue({
      mode: "editing",
      presenterProps: {},
    });

    const html = renderToStaticMarkup(<CondicionesVacanteForm />);

    expect(html).toContain("Condiciones presenter");
  });
});
