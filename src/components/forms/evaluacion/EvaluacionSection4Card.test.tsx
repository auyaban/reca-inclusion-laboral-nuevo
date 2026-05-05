// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useForm, useWatch } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";
import { EvaluacionSection4Card } from "@/components/forms/evaluacion/EvaluacionSection4Card";
import {
  createEmptyEvaluacionValues,
  deriveEvaluacionSection4Description,
} from "@/lib/evaluacion";
import type { EvaluacionAccessibilitySummary } from "@/lib/evaluacion";
import type { EvaluacionValues } from "@/lib/validations/evaluacion";

const bajoSummary: EvaluacionAccessibilitySummary = {
  counts: {
    si: 40,
    no: 57,
    parcial: 3,
  },
  percentages: {
    si: 40,
    no: 57,
    parcial: 3,
  },
  suggestion: "Bajo",
};

function Section4Harness() {
  const defaultValues = createEmptyEvaluacionValues(null);
  defaultValues.section_4.nivel_accesibilidad = "Bajo";
  defaultValues.section_4.descripcion =
    deriveEvaluacionSection4Description("Bajo");

  const {
    control,
    register,
    formState: { errors },
  } = useForm<EvaluacionValues>({
    defaultValues,
  });
  const values =
    useWatch({
      control,
      name: "section_4",
    }) ?? defaultValues.section_4;

  return (
    <EvaluacionSection4Card
      values={values}
      summary={bajoSummary}
      register={register}
      errors={errors}
    />
  );
}

describe("EvaluacionSection4Card", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the natural-language explanation for the suggested level", () => {
    render(<Section4Harness />);

    expect(
      screen.getByText(
        "Se sugiere Bajo porque 40.0% de los criterios evaluados quedaron como Si; el rango 1% - 50% corresponde a Bajo."
      )
    ).toBeTruthy();
  });

  it("asks for justification only when the professional changes the suggested level", () => {
    render(<Section4Harness />);

    expect(
      screen.queryByTestId("section_4.justificacion_nivel_accesibilidad")
    ).toBeNull();

    fireEvent.change(screen.getByTestId("section_4.nivel_accesibilidad"), {
      target: { value: "Medio" },
    });

    expect(
      screen.getByTestId("section_4.justificacion_nivel_accesibilidad")
    ).toBeTruthy();

    fireEvent.change(screen.getByTestId("section_4.nivel_accesibilidad"), {
      target: { value: "Bajo" },
    });

    expect(
      screen.queryByTestId("section_4.justificacion_nivel_accesibilidad")
    ).toBeNull();
  });
});
