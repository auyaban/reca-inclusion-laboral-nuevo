// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";

vi.mock("@/components/forms/shared/UsuarioRecaLookupField", () => ({
  UsuarioRecaLookupField: () => <div data-testid="usuario-reca-lookup-stub" />,
}));

import { ContratacionVinculadosSection } from "@/components/forms/contratacion/ContratacionVinculadosSection";
import { SeleccionOferentesSection } from "@/components/forms/seleccion/SeleccionOferentesSection";
import { getDefaultContratacionValues } from "@/lib/contratacion";
import { getDefaultSeleccionValues } from "@/lib/seleccion";
import type { ContratacionValues } from "@/lib/validations/contratacion";
import type { SeleccionValues } from "@/lib/validations/seleccion";

function SeleccionHarness() {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useForm<SeleccionValues>({
    defaultValues: getDefaultSeleccionValues(),
  });

  return (
    <SeleccionOferentesSection
      control={control}
      register={register}
      setValue={setValue}
      errors={errors}
    />
  );
}

function ContratacionHarness() {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useForm<ContratacionValues>({
    defaultValues: getDefaultContratacionValues(),
  });

  return (
    <ContratacionVinculadosSection
      control={control}
      register={register}
      setValue={setValue}
      errors={errors}
    />
  );
}

describe("Person-form autofill guards", () => {
  it("disables browser autocomplete on the targeted selection inputs", () => {
    render(<SeleccionHarness />);

    expect(
      screen.getByTestId("oferentes.0.nombre_oferente").getAttribute("autocomplete")
    ).toBe("off");
    expect(
      screen.getByTestId("oferentes.0.telefono_emergencia").getAttribute(
        "autocomplete"
      )
    ).toBe("off");
    expect(
      screen.getByTestId("oferentes.0.fecha_nacimiento").getAttribute(
        "autocomplete"
      )
    ).toBe("off");
  });

  it("disables browser autocomplete on the targeted contratacion inputs", () => {
    render(<ContratacionHarness />);

    expect(
      screen.getByTestId("vinculados.0.nombre_oferente").getAttribute(
        "autocomplete"
      )
    ).toBe("off");
    expect(
      screen.getByTestId("vinculados.0.correo_oferente").getAttribute(
        "autocomplete"
      )
    ).toBe("off");
    expect(
      screen.getByTestId("vinculados.0.telefono_emergencia").getAttribute(
        "autocomplete"
      )
    ).toBe("off");
  });
});
