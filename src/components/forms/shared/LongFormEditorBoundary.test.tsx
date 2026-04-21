import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LongFormEditorBoundary,
  type LongFormEditorBoundaryState,
} from "@/components/forms/shared/LongFormEditorBoundary";

function FakePresenter(props: { label: string }) {
  return <div>Presenter: {props.label}</div>;
}

function renderBoundary(state: LongFormEditorBoundaryState<{ label: string }>) {
  return renderToStaticMarkup(
    <LongFormEditorBoundary state={state} Presenter={FakePresenter} />
  );
}

describe("LongFormEditorBoundary", () => {
  it("renders loading mode", () => {
    const html = renderBoundary({ mode: "loading" });
    expect(html).toContain("Recuperando acta");
  });

  it("renders draft error mode", () => {
    const html = renderBoundary({
      mode: "draft_error",
      draftErrorState: {
        message: "No se pudo abrir el borrador.",
        onBackToDrafts: vi.fn(),
      },
    });

    expect(html).toContain("No se pudo abrir el borrador.");
    expect(html).toContain("Volver a borradores");
  });

  it("renders success mode", () => {
    const html = renderBoundary({
      mode: "success",
      successState: {
        title: "Formulario guardado",
        message: <span>Resultado exitoso</span>,
        links: { sheetLink: "https://sheet.example" },
        onReturnToHub: vi.fn(),
        onStartNewForm: vi.fn(),
      },
    });

    expect(html).toContain("Formulario guardado");
    expect(html).toContain("Resultado exitoso");
  });

  it("renders the presenter when the form is in editing mode", () => {
    const html = renderBoundary({
      mode: "editing",
      presenterProps: {
        label: "demo",
      },
    });

    expect(html).toContain("Presenter: demo");
  });
});
