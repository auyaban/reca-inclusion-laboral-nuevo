import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NO_INITIAL_DRAFT_RESOLUTION } from "@/lib/drafts/initialDraftResolution";

const { useSeleccionFormStateMock } = vi.hoisted(() => ({
  useSeleccionFormStateMock: vi.fn(),
}));

vi.mock("@/hooks/useSeleccionFormState", () => ({
  useSeleccionFormState: useSeleccionFormStateMock,
}));

vi.mock("@/components/forms/seleccion/SeleccionFormPresenter", () => ({
  SeleccionFormPresenter: () => <div>Seleccion presenter</div>,
}));

import SeleccionFormEditor from "@/components/forms/SeleccionFormEditor";

describe("SeleccionFormEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    useSeleccionFormStateMock.mockReturnValue({ mode: "loading" });

    const html = renderToStaticMarkup(
      <SeleccionFormEditor
        initialDraftResolution={NO_INITIAL_DRAFT_RESOLUTION}
      />
    );

    expect(html).toContain("Recuperando acta");
    expect(useSeleccionFormStateMock).toHaveBeenCalledWith({
      initialDraftResolution: NO_INITIAL_DRAFT_RESOLUTION,
    });
  });

  it("renders draft error state", () => {
    useSeleccionFormStateMock.mockReturnValue({
      mode: "draft_error",
      draftErrorState: {
        message: "No se pudo abrir el borrador.",
        onBackToDrafts: vi.fn(),
      },
    });

    const html = renderToStaticMarkup(<SeleccionFormEditor />);

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

    const html = renderToStaticMarkup(<SeleccionFormEditor />);

    expect(html).toContain("Formulario guardado");
    expect(html).toContain("Resultado exitoso");
  });

  it("renders editing presenter", () => {
    useSeleccionFormStateMock.mockReturnValue({
      mode: "editing",
      presenterProps: {},
    });

    const html = renderToStaticMarkup(<SeleccionFormEditor />);

    expect(html).toContain("Seleccion presenter");
  });
});
