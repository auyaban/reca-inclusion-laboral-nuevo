import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { useSensibilizacionFormStateMock } = vi.hoisted(() => ({
  useSensibilizacionFormStateMock: vi.fn(),
}));

vi.mock("@/hooks/useSensibilizacionFormState", () => ({
  useSensibilizacionFormState: useSensibilizacionFormStateMock,
}));

vi.mock("@/components/forms/sensibilizacion/SensibilizacionFormPresenter", () => ({
  SensibilizacionFormPresenter: () => <div>Sensibilizacion presenter</div>,
}));

import SensibilizacionForm from "@/components/forms/SensibilizacionForm";

describe("SensibilizacionForm container", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    useSensibilizacionFormStateMock.mockReturnValue({ mode: "loading" });

    const html = renderToStaticMarkup(<SensibilizacionForm />);

    expect(html).toContain("Recuperando acta");
  });

  it("renders draft error state", () => {
    useSensibilizacionFormStateMock.mockReturnValue({
      mode: "draft_error",
      draftErrorState: {
        message: "No se pudo abrir el borrador.",
        onBackToDrafts: vi.fn(),
      },
    });

    const html = renderToStaticMarkup(<SensibilizacionForm />);

    expect(html).toContain("No se pudo abrir el borrador.");
    expect(html).toContain("Volver a borradores");
  });

  it("renders success state", () => {
    useSensibilizacionFormStateMock.mockReturnValue({
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: <span>Resultado exitoso</span>,
        links: { sheetLink: "https://sheet.example" },
        onReturnToHub: vi.fn(),
        onStartNewForm: vi.fn(),
      },
    });

    const html = renderToStaticMarkup(<SensibilizacionForm />);

    expect(html).toContain("Formulario guardado");
    expect(html).toContain("Resultado exitoso");
  });

  it("renders editing presenter", () => {
    useSensibilizacionFormStateMock.mockReturnValue({
      mode: "editing",
      presenterProps: {},
    });

    const html = renderToStaticMarkup(<SensibilizacionForm />);

    expect(html).toContain("Sensibilizacion presenter");
  });
});
