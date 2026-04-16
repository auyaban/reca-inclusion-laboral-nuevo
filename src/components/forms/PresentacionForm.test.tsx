import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NO_INITIAL_DRAFT_RESOLUTION } from "@/lib/drafts/initialDraftResolution";

const { usePresentacionFormStateMock } = vi.hoisted(() => ({
  usePresentacionFormStateMock: vi.fn(),
}));

vi.mock("@/hooks/usePresentacionFormState", () => ({
  usePresentacionFormState: usePresentacionFormStateMock,
}));

vi.mock("@/components/forms/presentacion/PresentacionFormPresenter", () => ({
  PresentacionFormPresenter: () => <div>Presentacion presenter</div>,
}));

import PresentacionForm from "@/components/forms/PresentacionForm";

describe("PresentacionForm container", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    usePresentacionFormStateMock.mockReturnValue({ mode: "loading" });

    const html = renderToStaticMarkup(
      <PresentacionForm initialDraftResolution={NO_INITIAL_DRAFT_RESOLUTION} />
    );

    expect(html).toContain("Recuperando acta");
    expect(usePresentacionFormStateMock).toHaveBeenCalledWith({
      initialDraftResolution: NO_INITIAL_DRAFT_RESOLUTION,
    });
  });

  it("renders draft error state", () => {
    usePresentacionFormStateMock.mockReturnValue({
      mode: "draft_error",
      draftErrorState: {
        message: "No se pudo abrir el borrador.",
        onBackToDrafts: vi.fn(),
      },
    });

    const html = renderToStaticMarkup(<PresentacionForm />);

    expect(html).toContain("No se pudo abrir el borrador.");
    expect(html).toContain("Volver a borradores");
  });

  it("renders success state", () => {
    usePresentacionFormStateMock.mockReturnValue({
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: <span>Resultado exitoso</span>,
        links: { sheetLink: "https://sheet.example" },
        onReturnToHub: vi.fn(),
        onStartNewForm: vi.fn(),
      },
    });

    const html = renderToStaticMarkup(<PresentacionForm />);

    expect(html).toContain("Formulario guardado");
    expect(html).toContain("Resultado exitoso");
  });

  it("renders editing presenter", () => {
    usePresentacionFormStateMock.mockReturnValue({
      mode: "editing",
      presenterProps: {},
    });

    const html = renderToStaticMarkup(<PresentacionForm />);

    expect(html).toContain("Presentacion presenter");
  });
});
