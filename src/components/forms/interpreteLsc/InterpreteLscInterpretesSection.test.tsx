// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { InterpreteLscInterpretesSection } from "@/components/forms/interpreteLsc/InterpreteLscInterpretesSection";
import { getDefaultInterpreteLscValues } from "@/lib/interpreteLsc";
import {
  interpreteLscSchema,
  type InterpreteLscValues,
} from "@/lib/validations/interpreteLsc";

function renderSection() {
  const setValueSpy = vi.fn();

  function TestHarness() {
    const {
      control,
      getValues,
      register,
      setValue,
      formState: { errors },
    } = useForm<InterpreteLscValues>({
      defaultValues: getDefaultInterpreteLscValues(),
      mode: "onBlur",
      resolver: zodResolver(interpreteLscSchema),
    });
    const setValueWithSpy = useCallback<typeof setValue>(
      (name, value, options) => {
        setValueSpy(name, value, options);
        setValue(name, value, options);
      },
      [setValue]
    );

    return (
      <InterpreteLscInterpretesSection
        control={control}
        getValues={getValues}
        register={register}
        setValue={setValueWithSpy}
        errors={errors}
        interpretesCatalog={[]}
        onCreateInterprete={async (nombre) => ({
          id: "interp-created",
          nombre,
        })}
      />
    );
  }

  const view = render(<TestHarness />);

  return {
    ...view,
    rerenderSection() {
      view.rerender(<TestHarness />);
    },
    setValueSpy,
  };
}

describe("InterpreteLscInterpretesSection", () => {
  it("recalculates total_tiempo without getting stuck in a render loop", async () => {
    const { container } = renderSection();
    const horaInicialInput = container.querySelector(
      'input[name="interpretes.0.hora_inicial"]'
    ) as HTMLInputElement;
    const horaFinalInput = container.querySelector(
      'input[name="interpretes.0.hora_final"]'
    ) as HTMLInputElement;
    const totalTiempoInput = container.querySelector(
      'input[name="interpretes.0.total_tiempo"]'
    ) as HTMLInputElement;

    fireEvent.change(horaInicialInput, { target: { value: "9" } });
    fireEvent.blur(horaInicialInput, { target: { value: "9" } });
    fireEvent.change(horaFinalInput, { target: { value: "11:30" } });
    fireEvent.blur(horaFinalInput, { target: { value: "11:30" } });

    await waitFor(() => {
      expect(totalTiempoInput.value).toBe("2:30");
    });
  });

  it("shows a validation error when the interpreted duration exceeds 16 hours", async () => {
    const { container } = renderSection();
    const horaInicialInput = container.querySelector(
      'input[name="interpretes.0.hora_inicial"]'
    ) as HTMLInputElement;
    const horaFinalInput = container.querySelector(
      'input[name="interpretes.0.hora_final"]'
    ) as HTMLInputElement;
    const totalTiempoInput = container.querySelector(
      'input[name="interpretes.0.total_tiempo"]'
    ) as HTMLInputElement;

    fireEvent.change(horaInicialInput, { target: { value: "08:00" } });
    fireEvent.blur(horaInicialInput, { target: { value: "08:00" } });
    fireEvent.change(horaFinalInput, { target: { value: "01:00" } });
    fireEvent.blur(horaFinalInput, { target: { value: "01:00" } });

    await waitFor(() => {
      expect(
        screen.getByText("Revisa las horas: la duracion no puede superar 16 horas.")
      ).not.toBeNull();
    });

    expect(totalTiempoInput.value).toBe("");
  });

  it("does not rewrite derived values again when rerendered without logical changes", async () => {
    const { container, rerenderSection, setValueSpy } = renderSection();
    const horaInicialInput = container.querySelector(
      'input[name="interpretes.0.hora_inicial"]'
    ) as HTMLInputElement;
    const horaFinalInput = container.querySelector(
      'input[name="interpretes.0.hora_final"]'
    ) as HTMLInputElement;

    fireEvent.change(horaInicialInput, { target: { value: "9" } });
    fireEvent.blur(horaInicialInput, { target: { value: "9" } });
    fireEvent.change(horaFinalInput, { target: { value: "11:30" } });
    fireEvent.blur(horaFinalInput, { target: { value: "11:30" } });

    await waitFor(() => {
      const derivedWrites = setValueSpy.mock.calls.filter(([fieldName]) => {
        const name = String(fieldName);
        return name.includes("total_tiempo") || name === "sumatoria_horas";
      });

      expect(derivedWrites.length).toBeGreaterThan(0);
    });

    const derivedWritesBeforeRerender = setValueSpy.mock.calls.filter(
      ([fieldName]) => {
        const name = String(fieldName);
        return name.includes("total_tiempo") || name === "sumatoria_horas";
      }
    ).length;

    rerenderSection();

    await waitFor(() => {
      const derivedWritesAfterRerender = setValueSpy.mock.calls.filter(
        ([fieldName]) => {
          const name = String(fieldName);
          return name.includes("total_tiempo") || name === "sumatoria_horas";
        }
      ).length;

      expect(derivedWritesAfterRerender).toBe(derivedWritesBeforeRerender);
    });
  });
});
