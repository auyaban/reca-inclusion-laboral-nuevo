// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useForm } from "react-hook-form";
import { SeleccionOferentesSection } from "@/components/forms/seleccion/SeleccionOferentesSection";
import {
  createEmptySeleccionOferenteRow,
  getDefaultSeleccionValues,
} from "@/lib/seleccion";
import type { SeleccionValues } from "@/lib/validations/seleccion";
import { SELECCION_TEST_EMPRESA } from "@/lib/testing/seleccionFixtures";

afterEach(() => {
  cleanup();
});

function getField<TElement extends HTMLElement>(testId: string) {
  const element = screen.getByTestId(testId);
  return element as TElement;
}

function renderSection() {
  function TestHarness() {
    const {
      control,
      register,
      setValue,
      formState: { errors },
    } = useForm<SeleccionValues>({
      defaultValues: {
        ...getDefaultSeleccionValues(SELECCION_TEST_EMPRESA),
        failed_visit_applied_at: "2026-04-24T12:00:00.000Z",
        oferentes: [createEmptySeleccionOferenteRow()],
      },
    });

    return (
      <SeleccionOferentesSection
        control={control}
        register={register}
        setValue={setValue}
        errors={errors}
        failedVisitApplied
      />
    );
  }

  return render(<TestHarness />);
}

describe("SeleccionOferentesSection failed visit rows", () => {
  it("agrega nuevas filas con campos compatibles en No aplica", async () => {
    renderSection();

    fireEvent.click(screen.getByTestId("oferentes-add-button-bottom"));

    await waitFor(() => {
      expect(
        getField<HTMLSelectElement>("oferentes.1.discapacidad").value
      ).toBe("No aplica");
    });
    expect(
      getField<HTMLSelectElement>("oferentes.1.medicamentos_nivel_apoyo").value
    ).toBe("No aplica.");
    expect(
      getField<HTMLInputElement>("oferentes.1.nombre_oferente").value
    ).toBe("");
  });

  it("autopuebla campos compatibles cuando una fila vacia se activa", async () => {
    renderSection();

    fireEvent.change(getField<HTMLInputElement>("oferentes.0.nombre_oferente"), {
      target: { value: "Persona nueva" },
    });

    await waitFor(() => {
      expect(
        getField<HTMLSelectElement>("oferentes.0.discapacidad").value
      ).toBe("No aplica");
    });
    expect(
      getField<HTMLInputElement>("oferentes.0.nombre_oferente").value
    ).toBe("Persona nueva");
  });
});
