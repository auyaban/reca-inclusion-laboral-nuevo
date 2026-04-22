// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeguimientosFollowupStageEditor } from "@/components/forms/seguimientos/SeguimientosFollowupStageEditor";
import { createEmptySeguimientosFollowupValues } from "@/lib/seguimientos";

const { focusFieldByNameAfterPaintMock } = vi.hoisted(() => ({
  focusFieldByNameAfterPaintMock: vi.fn(),
}));

vi.mock("@/lib/focusField", () => ({
  focusFieldByNameAfterPaint: focusFieldByNameAfterPaintMock,
}));

vi.mock("@/hooks/useProfesionalesCatalog", () => ({
  useProfesionalesCatalog: () => ({
    profesionales: [
      {
        nombre_profesional: "Laura RECA",
        cargo_profesional: "Profesional RECA",
      },
    ],
    loading: false,
    error: null,
  }),
}));

afterEach(() => {
  cleanup();
  focusFieldByNameAfterPaintMock.mockReset();
});

describe("SeguimientosFollowupStageEditor", () => {
  function renderEditor(
    overrides: Partial<ComponentProps<typeof SeguimientosFollowupStageEditor>> = {}
  ) {
    return render(
      <SeguimientosFollowupStageEditor
        followupIndex={1}
        values={createEmptySeguimientosFollowupValues(1)}
        previousValues={null}
        profesionalAsignado="Laura RECA"
        failedVisitAppliedAt={null}
        isReadonly={false}
        saving={false}
        lastSavedToSheetsAt={null}
        modifiedFieldIds={new Set()}
        onValuesChange={vi.fn()}
        onFailedVisitApplied={vi.fn()}
        onSave={vi.fn().mockResolvedValue(true)}
        {...overrides}
      />
    );
  }

  it("falls back to a numbered item label when the source label is empty", () => {
    const values = createEmptySeguimientosFollowupValues(1);
    values.item_labels[0] = "";

    renderEditor({ values });

    expect(screen.getByText("Item 1")).toBeTruthy();
  });

  it("does not render the copy action for Seguimiento 1", () => {
    renderEditor();

    expect(screen.queryByTestId("seguimientos-followup-copy-button")).toBeNull();
    expect(screen.getByTestId("seguimientos-followup-failed-visit-button")).toBeTruthy();
    expect(screen.getByText("Asistentes")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Dictar" }).length).toBe(2);
    expect(screen.getByTestId("asistentes-add-button")).toBeTruthy();
  });

  it("renders the copy action from Seguimiento 2 onward", () => {
    renderEditor({
      followupIndex: 2,
      values: createEmptySeguimientosFollowupValues(2),
      previousValues: createEmptySeguimientosFollowupValues(1),
    });

    expect(screen.getByTestId("seguimientos-followup-copy-button")).toBeTruthy();
  });

  it("renders the three bulk evaluation action rows with the expected quick actions", () => {
    renderEditor();

    expect(
      screen.getByTestId("seguimientos-followup-bulk-item_autoevaluacion")
    ).toBeTruthy();
    expect(
      screen.getByTestId("seguimientos-followup-bulk-item_eval_empresa")
    ).toBeTruthy();
    expect(screen.getByTestId("seguimientos-followup-bulk-empresa_eval")).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "Todo excelente" }).length
    ).toBe(3);
    expect(
      screen.getAllByRole("button", { name: "Todo no aplica" }).length
    ).toBe(3);
  });

  it("applies a bulk value to all autoevaluacion fields without touching observations", () => {
    const values = createEmptySeguimientosFollowupValues(1);
    values.item_autoevaluacion[0] = "Mal";
    values.item_observaciones[0] = "Observacion original";
    renderEditor({ values });

    fireEvent.click(
      screen.getByTestId(
        "seguimientos-followup-bulk-item_autoevaluacion-excelente"
      )
    );

    expect(
      (document.getElementById("item_autoevaluacion.0") as HTMLSelectElement).value
    ).toBe("Excelente");
    expect(
      (document.getElementById("item_autoevaluacion.18") as HTMLSelectElement).value
    ).toBe("Excelente");
    expect(
      (document.getElementById("item_observaciones.0") as HTMLTextAreaElement).value
    ).toBe("Observacion original");
  });

  it("applies a bulk value to all evaluacion empresa fields", () => {
    const values = createEmptySeguimientosFollowupValues(1);
    values.item_eval_empresa[0] = "Excelente";
    renderEditor({ values });

    fireEvent.click(
      screen.getByTestId("seguimientos-followup-bulk-item_eval_empresa-bien")
    );

    expect(
      (document.getElementById("item_eval_empresa.0") as HTMLSelectElement).value
    ).toBe("Bien");
    expect(
      (document.getElementById("item_eval_empresa.18") as HTMLSelectElement).value
    ).toBe("Bien");
  });

  it("applies a bulk value to all evaluacion empresarial fields", () => {
    const values = createEmptySeguimientosFollowupValues(1);
    values.empresa_eval[0] = "Excelente";
    values.empresa_observacion[0] = "Empresa original";
    renderEditor({ values });

    fireEvent.click(
      screen.getByTestId("seguimientos-followup-bulk-empresa_eval-no-aplica")
    );

    expect(
      (document.getElementById("empresa_eval.0") as HTMLSelectElement).value
    ).toBe("No aplica");
    expect(
      (document.getElementById("empresa_eval.7") as HTMLSelectElement).value
    ).toBe("No aplica");
    expect(
      (document.getElementById("empresa_observacion.0") as HTMLTextAreaElement).value
    ).toBe("Empresa original");
  });

  it("disables bulk action buttons while readonly", () => {
    renderEditor({ isReadonly: true });

    expect(
      (
        screen.getByTestId(
          "seguimientos-followup-bulk-item_autoevaluacion-excelente"
        ) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(
      (
        screen.getByTestId(
          "seguimientos-followup-bulk-item_eval_empresa-bien"
        ) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(
      (
        screen.getByTestId(
          "seguimientos-followup-bulk-empresa_eval-no-aplica"
        ) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(screen.queryByRole("button", { name: "Dictar" })).toBeNull();
  });

  it("seeds asistentes with the RECA professional and a second empty row", () => {
    const { container } = renderEditor();

    const nombreInputs = container.querySelectorAll(
      'input[id^="asistentes."][id$=".nombre"]'
    );

    expect(nombreInputs).toHaveLength(2);
    expect((document.getElementById("asistentes.0.nombre") as HTMLInputElement).value).toBe(
      "Laura RECA"
    );
    expect((document.getElementById("asistentes.1.nombre") as HTMLInputElement).value).toBe(
      ""
    );
  });

  it("reports the auto-seeded first assistant row to the parent editor", () => {
    const onAutoSeedFirstAsistente = vi.fn();

    renderEditor({ onAutoSeedFirstAsistente });

    expect(onAutoSeedFirstAsistente).toHaveBeenCalledWith(1, {
      nombre: "Laura RECA",
      cargo: "Profesional RECA",
    });
  });

  it("reports manual edits on the first assistant row to the parent editor", () => {
    const onFirstAsistenteManualEdit = vi.fn();

    renderEditor({ onFirstAsistenteManualEdit });

    fireEvent.change(document.getElementById("asistentes.0.cargo") as Element, {
      target: { value: "Cargo ajustado" },
    });

    expect(onFirstAsistenteManualEdit).toHaveBeenCalledWith(1);
  });

  it("uses the Google Sheets save label for followups", () => {
    renderEditor();

    expect(screen.getAllByText("Guardar seguimiento en Google Sheets").length).toBe(
      2
    );
  });

  it("shows the persisted failed visit warning when the preset was already applied", () => {
    renderEditor({
      failedVisitAppliedAt: "2026-04-22T12:00:00.000Z",
    });

    expect(
      screen.getByText(
        "Este seguimiento fue marcado como visita fallida. Si vuelves a corregirlo despues de guardarlo, puede requerir desbloqueo."
      )
    ).toBeTruthy();
  });

  it("applies failed visit immediately to parent state without waiting for a later edit", async () => {
    const onValuesChange = vi.fn();
    const onFailedVisitApplied = vi.fn();

    renderEditor({
      onValuesChange,
      onFailedVisitApplied,
    });

    fireEvent.click(screen.getByTestId("seguimientos-followup-failed-visit-button"));
    fireEvent.click(screen.getByTestId("form-submit-confirm-accept"));

    await waitFor(() => {
      expect(onFailedVisitApplied).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          fecha_seguimiento: expect.any(String),
        })
      );
    });

    const appliedValues = onFailedVisitApplied.mock.calls.at(-1)?.[1];
    expect(appliedValues?.item_autoevaluacion?.[0]).toBe("No aplica");
    expect(appliedValues?.item_eval_empresa?.[0]).toBe("No aplica");
    expect(appliedValues?.empresa_eval?.[0]).toBe("No aplica");
    expect(onValuesChange).not.toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        item_autoevaluacion: expect.arrayContaining(["Excelente"]),
      })
    );
  });

  it("renders canonical followup dates in the native picker and submits them canonically", async () => {
    const values = createEmptySeguimientosFollowupValues(1);
    values.fecha_seguimiento = "2026-04-21";
    const onSave = vi.fn().mockResolvedValue(true);

    renderEditor({ values, onSave });

    const dateInput = document.getElementById("fecha_seguimiento");
    if (!(dateInput instanceof HTMLInputElement)) {
      throw new Error("fecha_seguimiento input not found");
    }

    expect(dateInput.value).toBe("2026-04-21");

    fireEvent.change(dateInput, {
      target: { value: "2026-04-25" },
    });
    fireEvent.submit(screen.getByTestId("seguimientos-followup-editor-1"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha_seguimiento: "2026-04-25",
        })
      );
    });
  });

  it("focuses the first invalid field instead of calling save when submit is invalid", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const values = createEmptySeguimientosFollowupValues(1);
    values.fecha_seguimiento = "2026-14-99";
    renderEditor({ onSave, values });

    fireEvent.submit(screen.getByTestId("seguimientos-followup-editor-1"));

    await waitFor(() => {
      expect(focusFieldByNameAfterPaintMock).toHaveBeenCalledWith(
        "fecha_seguimiento",
        expect.objectContaining({
          scroll: true,
          behavior: "smooth",
          block: "center",
        }),
        4
      );
    });
    expect(onSave).not.toHaveBeenCalled();
  });
});
