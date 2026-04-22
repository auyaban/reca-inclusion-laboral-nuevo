// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen } from "@testing-library/react";
import { LongFormFinalizationStatus } from "@/components/forms/shared/LongFormFinalizationStatus";
import {
  LongFormDraftErrorState,
  LongFormFinalizeButton,
  LongFormLoadingState,
  LongFormShell,
  LongFormSuccessState,
} from "@/components/forms/shared/LongFormShell";

describe("LongFormShell", () => {
  it("renders the shared document scaffold with notice, error and submit action", () => {
    const html = renderToStaticMarkup(
      <LongFormShell
        title="Sensibilización"
        companyName="Empresa Uno"
        onBack={vi.fn()}
        navItems={[
          { id: "company", label: "Empresa", status: "active" },
          { id: "visit", label: "Visita", status: "completed" },
        ]}
        activeSectionId="company"
        onSectionSelect={vi.fn()}
        draftStatus={<div>Estado del borrador</div>}
        notice={<div>Banner de lock</div>}
        serverError="Error de prueba"
        finalizationFeedback={
          <LongFormFinalizationStatus
            progress={{
              phase: "error",
              currentStageId: "esperando_respuesta",
              startedAt: 10,
              displayMessage: "Publicando...",
              errorMessage: "Publicacion de prueba fallida.",
              retryAction: "submit",
            }}
          />
        }
        submitAction={<button type="button">Finalizar</button>}
      >
        <section>Contenido del formulario</section>
      </LongFormShell>
    );

    expect(html).toContain("Sensibilización");
    expect(html).toContain("Empresa Uno");
    expect(html).toContain("Estado del borrador");
    expect(html).toContain("Banner de lock");
    expect(html).toContain("Error de prueba");
    expect(html).toContain("Contenido del formulario");
    expect(html).toContain("Publicacion de prueba fallida.");
    expect(html).toContain("Finalizar");
  });

  it("renders the shared document scaffold without optional notice or server error", () => {
    const html = renderToStaticMarkup(
      <LongFormShell
        title="Sensibilizacion"
        onBack={vi.fn()}
        navItems={[
          { id: "company", label: "Empresa", status: "active" },
          { id: "visit", label: "Visita", status: "idle" },
        ]}
        activeSectionId="company"
        onSectionSelect={vi.fn()}
        draftStatus={<div>Estado del borrador</div>}
      >
        <section>Contenido sin errores</section>
      </LongFormShell>
    );

    expect(html).toContain("Sensibilizacion");
    expect(html).toContain("Nueva acta");
    expect(html).toContain("Estado del borrador");
    expect(html).toContain("Contenido sin errores");
    expect(html).not.toContain("Banner de lock");
    expect(html).not.toContain("Error de prueba");
  });

  it("renders the shared state screens", () => {
    const loading = renderToStaticMarkup(<LongFormLoadingState />);
    const draftError = renderToStaticMarkup(
      <LongFormDraftErrorState message="No se pudo cargar." onBackToDrafts={vi.fn()} />
    );
    const success = renderToStaticMarkup(
      <LongFormSuccessState
        title="Formulario guardado"
        message={<span>Resultado exitoso</span>}
        links={{ sheetLink: "https://sheet.example" }}
        onReturnToHub={vi.fn()}
        onStartNewForm={vi.fn()}
      />
    );

    expect(loading).toContain("Recuperando acta");
    expect(draftError).toContain("No se pudo cargar.");
    expect(draftError).toContain("Volver a borradores");
    expect(success).toContain("Formulario guardado");
    expect(success).toContain("Resultado exitoso");
    expect(success).toContain("Ver acta en Google Sheets");
  });

  it("renders the shared finalize button states", () => {
    const idle = renderToStaticMarkup(
      <LongFormFinalizeButton
        disabled={false}
        isSubmitting={false}
        isFinalizing={false}
      />
    );
    const busy = renderToStaticMarkup(
      <LongFormFinalizeButton
        disabled
        isSubmitting={false}
        isFinalizing
      />
    );

    expect(idle).toContain("Finalizar");
    expect(busy).toContain("Publicando...");
  });

  it("wires form blur capture only for editable controls", () => {
    const onBlurCapture = vi.fn();

    const { container } = render(
      <LongFormShell
        title="Sensibilizacion"
        onBack={vi.fn()}
        navItems={[{ id: "company", label: "Empresa", status: "active" }]}
        activeSectionId="company"
        onSectionSelect={vi.fn()}
        draftStatus={<div>Estado del borrador</div>}
        onFormBlurCapture={onBlurCapture}
        formProps={{
          onSubmit: vi.fn(),
          noValidate: true,
        }}
      >
        <input aria-label="Campo editable" />
        <button type="button">Accion</button>
      </LongFormShell>
    );

    fireEvent.blur(screen.getByLabelText("Campo editable"));
    fireEvent.blur(screen.getByRole("button", { name: "Accion" }));

    expect(container.querySelector("form")?.getAttribute("autocomplete")).toBe(
      "off"
    );
    expect(onBlurCapture).toHaveBeenCalledTimes(1);
  });
});
