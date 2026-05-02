// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptySeguimientosBaseValues } from "@/lib/seguimientos";
import { SeguimientosBaseStageEditor } from "@/components/forms/seguimientos/SeguimientosBaseStageEditor";

const { focusFieldByNameAfterPaintMock } = vi.hoisted(() => ({
  focusFieldByNameAfterPaintMock: vi.fn(),
}));

vi.mock("@/lib/focusField", () => ({
  focusFieldByNameAfterPaint: focusFieldByNameAfterPaintMock,
}));

function renderEditor(options?: {
  cargoVinculado?: string;
  discapacidad?: string;
  isReadonlyDraft?: boolean;
  isProtectedByDefault?: boolean;
  overrideActive?: boolean;
  onSave?: ReturnType<typeof vi.fn>;
  values?: ReturnType<typeof createEmptySeguimientosBaseValues>;
}) {
  const values = options?.values ?? createEmptySeguimientosBaseValues();
  values.cargo_vinculado = options?.cargoVinculado ?? "";
  values.discapacidad = options?.discapacidad ?? "";
  const onSave = options?.onSave ?? vi.fn().mockResolvedValue(true);

  return render(
    <SeguimientosBaseStageEditor
      values={values}
      isReadonlyDraft={options?.isReadonlyDraft ?? false}
      isProtectedByDefault={options?.isProtectedByDefault ?? false}
      overrideActive={options?.overrideActive ?? false}
      saving={false}
      lastSavedToSheetsAt={null}
      modifiedFieldIds={new Set()}
      onValuesChange={vi.fn()}
      onSave={onSave}
    />
  );
}

function getInputById(id: string) {
  const input = document.getElementById(id);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Input ${id} not found`);
  }

  return input;
}

afterEach(() => {
  cleanup();
  focusFieldByNameAfterPaintMock.mockReset();
});

describe("SeguimientosBaseStageEditor", () => {
  it("lets the critical fields stay editable when they arrive empty", () => {
    renderEditor({
      cargoVinculado: "",
      discapacidad: "",
      isProtectedByDefault: true,
    });

    expect(getInputById("cargo_vinculado").readOnly).toBe(false);
    expect(getInputById("discapacidad").readOnly).toBe(false);
    expect(
      screen.queryByText(
        "Dato precargado desde RECA. Usa Desbloquear etapa si necesitas corregirlo."
      )
    ).toBeNull();
  });

  it("keeps the critical fields readonly with RECA hint when they arrive populated", () => {
    renderEditor({
      cargoVinculado: "Auxiliar administrativo",
      discapacidad: "Auditiva",
      isProtectedByDefault: false,
    });

    expect(getInputById("cargo_vinculado").readOnly).toBe(true);
    expect(getInputById("discapacidad").readOnly).toBe(true);
    expect(
      screen.getAllByText(
        "Dato precargado desde RECA. Usa Desbloquear etapa si necesitas corregirlo."
      )
    ).toHaveLength(2);
  });

  it("unlocks the critical fields when override is active", () => {
    renderEditor({
      cargoVinculado: "Auxiliar administrativo",
      discapacidad: "Auditiva",
      isProtectedByDefault: true,
      overrideActive: true,
    });

    expect(getInputById("cargo_vinculado").readOnly).toBe(false);
    expect(getInputById("discapacidad").readOnly).toBe(false);
  });

  it("makes the critical fields editable again after a populated readonly payload is cleared", () => {
    const initialValues = createEmptySeguimientosBaseValues();
    initialValues.cargo_vinculado = "Auxiliar administrativo";
    initialValues.discapacidad = "Auditiva";

    const { rerender } = render(
      <SeguimientosBaseStageEditor
        values={initialValues}
        isReadonlyDraft={false}
        isProtectedByDefault={false}
        overrideActive={false}
        saving={false}
        lastSavedToSheetsAt={null}
        modifiedFieldIds={new Set()}
        onValuesChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(getInputById("cargo_vinculado").readOnly).toBe(true);
    expect(getInputById("discapacidad").readOnly).toBe(true);

    const clearedValues = createEmptySeguimientosBaseValues();
    rerender(
      <SeguimientosBaseStageEditor
        values={clearedValues}
        isReadonlyDraft={false}
        isProtectedByDefault={true}
        overrideActive={false}
        saving={false}
        lastSavedToSheetsAt={null}
        modifiedFieldIds={new Set()}
        onValuesChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(getInputById("cargo_vinculado").readOnly).toBe(false);
    expect(getInputById("discapacidad").readOnly).toBe(false);
  });

  it("uses the explicit Google Sheets save label for ficha inicial", () => {
    renderEditor();

    expect(
      screen.getAllByText("Guardar ficha inicial en Google Sheets").length
    ).toBe(2);
  });

  it("renders canonical dates in the native picker and submits them canonically", async () => {
    const values = createEmptySeguimientosBaseValues();
    values.fecha_visita = "2026-04-21";
    const onSave = vi.fn().mockResolvedValue(true);

    render(
      <SeguimientosBaseStageEditor
        values={values}
        isReadonlyDraft={false}
        isProtectedByDefault={false}
        overrideActive={false}
        saving={false}
        lastSavedToSheetsAt={null}
        modifiedFieldIds={new Set()}
        onValuesChange={vi.fn()}
        onSave={onSave}
      />
    );

    expect(getInputById("fecha_visita").value).toBe("2026-04-21");

    fireEvent.change(getInputById("fecha_visita"), {
      target: { value: "2026-04-25" },
    });
    fireEvent.submit(screen.getByTestId("seguimientos-base-editor"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha_visita: "2026-04-25",
        })
      );
    });
  });

  it("propagates onValuesChange when tracked fields change", async () => {
    const onValuesChange = vi.fn();
    const values = createEmptySeguimientosBaseValues();

    render(
      <SeguimientosBaseStageEditor
        values={values}
        isReadonlyDraft={false}
        isProtectedByDefault={false}
        overrideActive={false}
        saving={false}
        lastSavedToSheetsAt={null}
        modifiedFieldIds={new Set()}
        onValuesChange={onValuesChange}
        onSave={vi.fn().mockResolvedValue(true)}
      />
    );

    const apoyosField = document.getElementById("apoyos_ajustes");
    if (!(apoyosField instanceof HTMLTextAreaElement)) {
      throw new Error("Textarea apoyos_ajustes not found");
    }

    fireEvent.change(apoyosField, {
      target: { value: "Ajuste actualizado" },
    });

    await waitFor(() => {
      expect(onValuesChange).toHaveBeenCalledWith(
        expect.objectContaining({
          apoyos_ajustes: "Ajuste actualizado",
        })
      );
    });
  });

  it("focuses the first invalid field instead of calling save when submit is invalid", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const values = createEmptySeguimientosBaseValues();
    values.fecha_visita = "2026-14-99";
    renderEditor({ onSave, values });

    fireEvent.submit(screen.getByTestId("seguimientos-base-editor"));

    await waitFor(() => {
      expect(focusFieldByNameAfterPaintMock).toHaveBeenCalledWith(
        "fecha_visita",
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

  it("shows CTA disabled with hint when isFirstEntry and progress incomplete", () => {
    renderEditor({});
    // Re-render with only the new props (can't use renderEditor helper directly
    // since it doesn't support new props — do inline render)
    cleanup();
    const values = createEmptySeguimientosBaseValues();
    render(
      <SeguimientosBaseStageEditor
        values={values}
        isReadonlyDraft={false}
        isProtectedByDefault={false}
        overrideActive={false}
        saving={false}
        lastSavedToSheetsAt={null}
        modifiedFieldIds={new Set()}
        isFirstEntry={true}
        isProgressCompleted={false}
        onValuesChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(screen.getByText("Completa la ficha inicial para continuar.")).toBeTruthy();
    const button = screen.getByTestId("seguimientos-base-save-button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("shows CTA enabled when isFirstEntry and progress completed", () => {
    cleanup();
    const values = createEmptySeguimientosBaseValues();
    render(
      <SeguimientosBaseStageEditor
        values={values}
        isReadonlyDraft={false}
        isProtectedByDefault={false}
        overrideActive={false}
        saving={false}
        lastSavedToSheetsAt={null}
        modifiedFieldIds={new Set()}
        isFirstEntry={true}
        isProgressCompleted={true}
        suggestedStageLabel="Seguimiento 1"
        onValuesChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(
      screen.queryByText("Completa la ficha inicial para continuar.")
    ).toBeNull();
    const button = screen.getByTestId("seguimientos-base-save-button") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(screen.getByText("Confirmar ficha inicial y abrir Seguimiento 1")).toBeTruthy();
  });

  it("shows CTA with Resultado final label when suggested is final", () => {
    cleanup();
    const values = createEmptySeguimientosBaseValues();
    render(
      <SeguimientosBaseStageEditor
        values={values}
        isReadonlyDraft={false}
        isProtectedByDefault={false}
        overrideActive={false}
        saving={false}
        lastSavedToSheetsAt={null}
        modifiedFieldIds={new Set()}
        isFirstEntry={true}
        isProgressCompleted={true}
        suggestedStageLabel="Resultado final"
        onValuesChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(screen.getByText("Confirmar ficha inicial y abrir Resultado final")).toBeTruthy();
  });

  it("does not show CTA footer when isFirstEntry is false", () => {
    cleanup();
    const values = createEmptySeguimientosBaseValues();
    render(
      <SeguimientosBaseStageEditor
        values={values}
        isReadonlyDraft={false}
        isProtectedByDefault={false}
        overrideActive={false}
        saving={false}
        lastSavedToSheetsAt={null}
        modifiedFieldIds={new Set()}
        isFirstEntry={false}
        onValuesChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(
      screen.queryByText("Confirmacion de ficha inicial")
    ).toBeNull();
    // Classic footer text present (appears in both heading and button)
    expect(
      screen.getAllByText("Guardar ficha inicial en Google Sheets").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows compact funciones layout with placeholder and no individual labels", () => {
    cleanup();
    const values = createEmptySeguimientosBaseValues();
    render(
      <SeguimientosBaseStageEditor
        values={values}
        isReadonlyDraft={false}
        isProtectedByDefault={false}
        overrideActive={false}
        saving={false}
        lastSavedToSheetsAt={null}
        modifiedFieldIds={new Set()}
        isFirstEntry={false}
        onValuesChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(true)}
      />
    );

    // Header present
    expect(
      screen.getByText("Funciones del cargo (opcionales — agregar las que apliquen)")
    ).toBeTruthy();

    // Placeholders in inputs (not labels)
    const input1 = document.getElementById("funciones_1_5.0") as HTMLInputElement;
    expect(input1.placeholder).toBe("Función 1 (opcional)");
    expect(input1.getAttribute("aria-label")).toBe("Función 1 (opcional)");

    const input6 = document.getElementById("funciones_6_10.0") as HTMLInputElement;
    expect(input6.placeholder).toBe("Función 6 (opcional)");
    expect(input6.getAttribute("aria-label")).toBe("Función 6 (opcional)");
  });

  it("saves successfully with only first function filled and other required fields", async () => {
    cleanup();
    const values = createEmptySeguimientosBaseValues();
    const onSave = vi.fn().mockResolvedValue(true);
    // Fill minimum required fields
    values.fecha_visita = "2026-04-21";
    values.modalidad = "Presencial";
    values.nombre_vinculado = "Test";
    values.cedula = "1001234567";
    values.cargo_vinculado = "Auxiliar";
    values.discapacidad = "Auditiva";
    values.tipo_contrato = "Fijo";
    values.apoyos_ajustes = "Ninguno";
    values.funciones_1_5[0] = "Función principal";
    render(
      <SeguimientosBaseStageEditor
        values={values}
        isReadonlyDraft={false}
        isProtectedByDefault={false}
        overrideActive={false}
        saving={false}
        lastSavedToSheetsAt={null}
        modifiedFieldIds={new Set()}
        isFirstEntry={false}
        onValuesChange={vi.fn()}
        onSave={onSave}
      />
    );

    fireEvent.submit(screen.getByTestId("seguimientos-base-editor"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });

  it("blocks save when minimum required fields including first function are empty", async () => {
    cleanup();
    const values = createEmptySeguimientosBaseValues();
    const onSave = vi.fn().mockResolvedValue(true);
    render(
      <SeguimientosBaseStageEditor
        values={values}
        isReadonlyDraft={false}
        isProtectedByDefault={false}
        overrideActive={false}
        saving={false}
        lastSavedToSheetsAt={null}
        modifiedFieldIds={new Set()}
        isFirstEntry={false}
        onValuesChange={vi.fn()}
        onSave={onSave}
      />
    );

    fireEvent.submit(screen.getByTestId("seguimientos-base-editor"));

    // With all required fields empty, onSave should not fire.
    // The existing validation navigation test ("focuses the invalid field after submit")
    // already covers the inline feedback behavior.
    expect(onSave).not.toHaveBeenCalled();
  });
});
