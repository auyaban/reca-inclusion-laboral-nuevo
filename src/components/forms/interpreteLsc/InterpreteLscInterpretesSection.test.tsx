// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { InterpreteLscInterpretesSection } from "@/components/forms/interpreteLsc/InterpreteLscInterpretesSection";
import { getDefaultInterpreteLscValues } from "@/lib/interpreteLsc";
import {
  interpreteLscSchema,
  type InterpreteLscValues,
} from "@/lib/validations/interpreteLsc";

function renderSection() {
  function TestHarness() {
    const {
      control,
      register,
      setValue,
      formState: { errors },
    } = useForm<InterpreteLscValues>({
      defaultValues: getDefaultInterpreteLscValues(),
      mode: "onBlur",
      resolver: zodResolver(interpreteLscSchema),
    });

    return (
      <InterpreteLscInterpretesSection
        control={control}
        register={register}
        setValue={setValue}
        errors={errors}
        interpretesCatalog={[]}
        onCreateInterprete={async (nombre) => ({
          id: "interp-created",
          nombre,
        })}
      />
    );
  }

  return render(<TestHarness />);
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
});
