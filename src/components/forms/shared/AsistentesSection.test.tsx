// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { ASESOR_AGENCIA_CARGO } from "@/lib/asistentes";
import { AsistentesSection } from "@/components/forms/shared/AsistentesSection";

type TestValues = {
  nota?: string;
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
  summaryText?: string;
  minMeaningfulAttendees?: number;
  isAgencyAdvisorRowRequired?: boolean;
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
        summaryText={options.summaryText}
        minMeaningfulAttendees={options.minMeaningfulAttendees}
        isAgencyAdvisorRowRequired={options.isAgencyAdvisorRowRequired}
        intermediateCargoPlaceholder={options.intermediateCargoPlaceholder}
      />
    );
  }

  return renderToStaticMarkup(<TestHarness />);
}

function renderInteractiveSection(options: {
  mode: "reca_plus_agency_advisor" | "reca_plus_generic_attendees";
  defaultValues?: TestValues;
  onAutoSeedFirstRow?: (values: TestValues["asistentes"][number]) => void;
  onFirstRowManualEdit?: () => void;
}) {
  function TestHarness() {
    const {
      control,
      register,
      setValue,
      formState: { errors },
    } = useForm<TestValues>({
      defaultValues:
        options.defaultValues ??
        {
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
        onAutoSeedFirstRow={options.onAutoSeedFirstRow}
        onFirstRowManualEdit={options.onFirstRowManualEdit}
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

  it("renders a custom attendee summary when provided", () => {
    const html = renderSection({
      mode: "reca_plus_generic_attendees",
      summaryText: "Minimo 1 persona · Maximo 10",
      minMeaningfulAttendees: 1,
    });

    expect(html).toContain("Minimo 1 persona · Maximo 10");
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

  it("notifies when the first row is auto-seeded from the RECA professional", () => {
    const onAutoSeedFirstRow = vi.fn();

    renderInteractiveSection({
      mode: "reca_plus_generic_attendees",
      defaultValues: {
        asistentes: [
          { nombre: "", cargo: "" },
          { nombre: "", cargo: "" },
        ],
      },
      onAutoSeedFirstRow,
    });

    expect(onAutoSeedFirstRow).toHaveBeenCalledWith({
      nombre: "Profesional RECA",
      cargo: "Profesional de apoyo",
    });
  });

  it("does not retrigger auto-seeding when an unrelated field changes", () => {
    const onAutoSeedFirstRow = vi.fn();

    function TestHarness() {
      const {
        control,
        register,
        setValue,
        formState: { errors },
      } = useForm<TestValues>({
        defaultValues: {
          nota: "",
          asistentes: [
            { nombre: "", cargo: "" },
            { nombre: "", cargo: "" },
          ],
        },
      });

      return (
        <form>
          <input aria-label="Nota" {...register("nota")} />
          <AsistentesSection
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            profesionales={profesionales}
            mode="reca_plus_generic_attendees"
            profesionalAsignado="Profesional RECA"
            onAutoSeedFirstRow={onAutoSeedFirstRow}
          />
        </form>
      );
    }

    render(<TestHarness />);

    expect(onAutoSeedFirstRow).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Nota"), {
      target: { value: "Cambio ajeno" },
    });

    expect(onAutoSeedFirstRow).toHaveBeenCalledTimes(1);
  });

  it("makes the trailing agency advisor row visually optional when requested", () => {
    const html = renderSection({
      mode: "reca_plus_agency_advisor",
      isAgencyAdvisorRowRequired: false,
    });

    expect(html.match(/text-red-500/g)?.length ?? 0).toBe(1);
  });
});
