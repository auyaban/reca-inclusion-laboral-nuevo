import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { useSeleccionFormStateMock } = vi.hoisted(() => ({
  useSeleccionFormStateMock: vi.fn(),
}));

vi.mock("@/hooks/useSeleccionFormState", () => ({
  useSeleccionFormState: useSeleccionFormStateMock,
}));

vi.mock("@/components/forms/seleccion/SeleccionFormPresenter", () => ({
  SeleccionFormPresenter: () => <div>Seleccion presenter</div>,
}));

import SeleccionForm from "@/components/forms/SeleccionForm";

describe("SeleccionForm container", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    useSeleccionFormStateMock.mockReturnValue({ mode: "loading" });

    const html = renderToStaticMarkup(<SeleccionForm />);

    expect(html).toContain("Recuperando acta");
  });

  it("renders draft error state", () => {
    useSeleccionFormStateMock.mockReturnValue({
      mode: "draft_error",
      draftErrorState: {
        message: "No se pudo abrir el borrador.",
        onBackToDrafts: vi.fn(),
      },
    });

    const html = renderToStaticMarkup(<SeleccionForm />);

    expect(html).toContain("No se pudo abrir el borrador.");
    expect(html).toContain("Volver a borradores");
  });

  it("renders success state", () => {
    useSeleccionFormStateMock.mockReturnValue({
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: <span>Resultado exitoso</span>,
        links: { sheetLink: "https://sheet.example" },
        onReturnToHub: vi.fn(),
        onStartNewForm: vi.fn(),
      },
    });

    const html = renderToStaticMarkup(<SeleccionForm />);

    expect(html).toContain("Formulario guardado");
    expect(html).toContain("Resultado exitoso");
  });

  it("renders editing presenter", () => {
    useSeleccionFormStateMock.mockReturnValue({
      mode: "editing",
      presenterProps: {},
    });

    const html = renderToStaticMarkup(<SeleccionForm />);

    expect(html).toContain("Seleccion presenter");
  });
});
