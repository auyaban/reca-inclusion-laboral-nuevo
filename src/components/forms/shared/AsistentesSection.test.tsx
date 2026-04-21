// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { ASESOR_AGENCIA_CARGO } from "@/lib/asistentes";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";

type TestValues = {
  asistentes: Array<{
    nombre: string;
    cargo: string;
  }>;
};

const profesionales = [
  {
    nombre_profesional: "Profesional RECA",
    cargo_profesional: "Profesional de apoyo",
  },
];

function renderSection(options: {
  mode: "reca_plus_agency_advisor" | "reca_plus_generic_attendees";
  helperText?: string;
  intermediateCargoPlaceholder?: string;
}) {
  function TestHarness() {
    const {
      control,
      register,
      setValue,
      formState: { errors },
    } = useForm<TestValues>({
      defaultValues: {
        asistentes: [
          { nombre: "Profesional RECA", cargo: "Profesional de apoyo" },
          { nombre: "", cargo: "" },
        ],
      },
    });

    return (
      <AsistentesSection
        control={control}
        register={register}
        setValue={setValue}
        errors={errors}
        profesionales={profesionales}
        mode={options.mode}
        profesionalAsignado="Profesional RECA"
        helperText={options.helperText}
        intermediateCargoPlaceholder={options.intermediateCargoPlaceholder}
      />
    );
  }

  return renderToStaticMarkup(<TestHarness />);
}

function renderInteractiveSection(options: {
  mode: "reca_plus_agency_advisor" | "reca_plus_generic_attendees";
}) {
  function TestHarness() {
    const {
      control,
      register,
      setValue,
      formState: { errors },
    } = useForm<TestValues>({
      defaultValues: {
        asistentes: [
          { nombre: "Profesional RECA", cargo: "Profesional de apoyo" },
          { nombre: "", cargo: "" },
        ],
      },
    });

    return (
      <AsistentesSection
        control={control}
        register={register}
        setValue={setValue}
        errors={errors}
        profesionales={profesionales}
        mode={options.mode}
        profesionalAsignado="Profesional RECA"
      />
    );
  }

  return render(<TestHarness />);
}

describe("AsistentesSection", () => {
  it("renders the agency-advisor mode affordances", () => {
    const html = renderSection({
      mode: "reca_plus_agency_advisor",
      helperText: "Completa nombre y cargo para cada fila usada.",
    });

    expect(html).toContain("Profesional RECA");
    expect(html).toContain("Asesor Agencia");
    expect(html).toContain(ASESOR_AGENCIA_CARGO);
    expect(html).toContain("Completa nombre y cargo para cada fila usada.");
  });

  it("renders the generic-attendees mode without the agency-advisor row", () => {
    const html = renderSection({
      mode: "reca_plus_generic_attendees",
      intermediateCargoPlaceholder: "Cargo",
    });

    expect(html).toContain("Profesional RECA");
    expect(html).not.toContain("Asesor Agencia");
    expect(html).toContain("placeholder=\"Cargo\"");
  });

  it("renders the add button after the attendees rows", () => {
    const html = renderSection({
      mode: "reca_plus_generic_attendees",
    });

    expect(html).toContain('data-testid="asistentes-add-button"');
    expect(html.indexOf("Profesional RECA")).toBeLessThan(
      html.indexOf('data-testid="asistentes-add-button"')
    );
  });

  it("keeps the add action working from the bottom control", () => {
    const { container } = renderInteractiveSection({
      mode: "reca_plus_generic_attendees",
    });

    expect(
      container.querySelectorAll('input[id^="asistentes."][id$=".nombre"]')
    ).toHaveLength(2);

    fireEvent.click(screen.getByTestId("asistentes-add-button"));

    expect(
      container.querySelectorAll('input[id^="asistentes."][id$=".nombre"]')
    ).toHaveLength(3);
  });

  it("disables browser autocomplete on manual attendee inputs", () => {
    const { container } = renderInteractiveSection({
      mode: "reca_plus_generic_attendees",
    });

    expect(
      container
        .querySelector<HTMLInputElement>('input[id="asistentes.1.nombre"]')
        ?.getAttribute("autocomplete")
    ).toBe("off");
    expect(
      container
        .querySelector<HTMLInputElement>('input[id="asistentes.1.cargo"]')
        ?.getAttribute("autocomplete")
    ).toBe("off");
  });
});
