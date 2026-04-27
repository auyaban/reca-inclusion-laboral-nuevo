// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useForm } from "react-hook-form";
import { ContratacionVinculadosSection } from "@/components/forms/contratacion/ContratacionVinculadosSection";
import {
  createEmptyContratacionVinculadoRow,
  getDefaultContratacionValues,
} from "@/lib/contratacion";
import type { ContratacionValues } from "@/lib/validations/contratacion";

const EMPRESA = {
  id: "empresa-1",
  nombre_empresa: "ACME SAS",
  nit_empresa: "900123456",
  direccion_empresa: "Calle 1 # 2-3",
  ciudad_empresa: "Bogota",
  sede_empresa: "Principal",
  zona_empresa: null,
  correo_1: "contacto@acme.com",
  contacto_empresa: "Laura Gomez",
  telefono_empresa: "3000000000",
  cargo: "Gerente",
  profesional_asignado: "Marta Ruiz",
  correo_profesional: "marta@reca.com",
  asesor: "Carlos Ruiz",
  correo_asesor: "carlos@reca.com",
  caja_compensacion: "Compensar",
};

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
    } = useForm<ContratacionValues>({
      defaultValues: {
        ...getDefaultContratacionValues(EMPRESA),
        failed_visit_applied_at: "2026-04-24T12:00:00.000Z",
        vinculados: [createEmptyContratacionVinculadoRow()],
      },
    });

    return (
      <ContratacionVinculadosSection
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

describe("ContratacionVinculadosSection failed visit rows", () => {
  it("agrega nuevas filas con campos compatibles en No aplica", async () => {
    renderSection();

    fireEvent.click(screen.getByTestId("vinculados-add-button-bottom"));

    await waitFor(() => {
      expect(
        getField<HTMLSelectElement>(
          "vinculados.1.prestaciones_cesantias_nivel_apoyo"
        ).value
      ).toBe("No aplica.");
    });
    expect(
      getField<HTMLTextAreaElement>("vinculados.1.prestaciones_cesantias_nota")
        .value
    ).toBe("No aplica");
    expect(
      getField<HTMLInputElement>("vinculados.1.nombre_oferente").value
    ).toBe("");
  });

  it("autopuebla campos compatibles cuando una fila vacia se activa", async () => {
    renderSection();

    fireEvent.change(getField<HTMLInputElement>("vinculados.0.nombre_oferente"), {
      target: { value: "Persona nueva" },
    });

    await waitFor(() => {
      expect(
        getField<HTMLSelectElement>(
          "vinculados.0.prestaciones_cesantias_nivel_apoyo"
        ).value
      ).toBe("No aplica.");
    });
    expect(
      getField<HTMLInputElement>("vinculados.0.nombre_oferente").value
    ).toBe("Persona nueva");
  });
});
