// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useForm } from "react-hook-form";
import { FixedAsistentesSection } from "@/components/forms/shared/FixedAsistentesSection";

type TestValues = {
  asistentes: Array<{
    nombre: string;
    cargo: string;
  }>;
};

const profesionales = [
  {
    nombre_profesional: "Laura RECA",
    cargo_profesional: "Profesional RECA",
  },
  {
    nombre_profesional: "Marta Ruiz",
    cargo_profesional: "Psicologa",
  },
];

function renderSection(options?: {
  asistentes?: TestValues["asistentes"];
  profesionalAsignado?: string | null;
  profesionalesCatalogo?: typeof profesionales;
  readOnly?: boolean;
}) {
  function TestHarness() {
    const {
      control,
      getValues,
      register,
      setValue,
      formState: { errors },
    } = useForm<TestValues>({
      defaultValues: {
        asistentes:
          options?.asistentes ??
          Array.from({ length: 4 }, () => ({ nombre: "", cargo: "" })),
      },
    });

    return (
      <FixedAsistentesSection
        control={control}
        register={register}
        getValues={getValues}
        setValue={setValue}
        errors={errors}
        rowsCount={4}
        initialAsistentes={options?.asistentes}
        profesionalAsignado={options?.profesionalAsignado ?? "Laura RECA"}
        profesionales={options?.profesionalesCatalogo ?? profesionales}
        readOnly={options?.readOnly ?? false}
        summaryText="Registra las personas que participaron en la visita."
      />
    );
  }

  return render(<TestHarness />);
}

describe("FixedAsistentesSection", () => {
  it("renders a fixed two-column layout without add or remove actions", async () => {
    const { container } = renderSection();

    await waitFor(() => {
      expect((document.getElementById("asistentes.0.nombre") as HTMLInputElement).value).toBe(
        "Laura RECA"
      );
    });

    expect(screen.getByText("Asistente")).toBeTruthy();
    expect(screen.getByText("Cargo")).toBeTruthy();
    expect(container.querySelectorAll('input[id^="asistentes."][id$=".nombre"]')).toHaveLength(4);
    expect(screen.queryByTestId("asistentes-add-button")).toBeNull();
    expect(container.querySelectorAll("button[aria-label='Mostrar profesionales']")).toHaveLength(1);
  });

  it("seeds the first row from the assigned professional and fills its cargo", async () => {
    renderSection();

    await waitFor(() => {
      expect((document.getElementById("asistentes.0.nombre") as HTMLInputElement).value).toBe(
        "Laura RECA"
      );
      expect((document.getElementById("asistentes.0.cargo") as HTMLInputElement).value).toBe(
        "Profesional RECA"
      );
    });
  });

  it("seeds the first row without marking the form dirty", async () => {
    function TestHarness() {
      const {
        control,
        getValues,
        register,
        setValue,
        formState: { errors, isDirty },
      } = useForm<TestValues>({
        defaultValues: {
          asistentes: Array.from({ length: 4 }, () => ({ nombre: "", cargo: "" })),
        },
      });

      return (
        <>
          <output data-testid="dirty">{String(isDirty)}</output>
          <FixedAsistentesSection
            control={control}
            register={register}
            getValues={getValues}
            setValue={setValue}
            errors={errors}
            rowsCount={4}
            profesionalAsignado="Laura RECA"
            profesionales={profesionales}
          />
        </>
      );
    }

    render(<TestHarness />);

    await waitFor(() => {
      expect((document.getElementById("asistentes.0.nombre") as HTMLInputElement).value).toBe(
        "Laura RECA"
      );
      expect((document.getElementById("asistentes.0.cargo") as HTMLInputElement).value).toBe(
        "Profesional RECA"
      );
    });
    expect(screen.getByTestId("dirty").textContent).toBe("false");
  });

  it("does not overwrite the first row after the user edits it manually", async () => {
    function RerenderHarness({
      profesionalAsignado,
    }: {
      profesionalAsignado: string | null;
    }) {
      const {
        control,
        getValues,
        register,
        setValue,
        formState: { errors },
      } = useForm<TestValues>({
        defaultValues: {
          asistentes: Array.from({ length: 4 }, () => ({ nombre: "", cargo: "" })),
        },
      });

      return (
        <FixedAsistentesSection
          control={control}
          register={register}
          getValues={getValues}
          setValue={setValue}
          errors={errors}
          rowsCount={4}
          profesionalAsignado={profesionalAsignado}
          profesionales={profesionales}
        />
      );
    }

    const { rerender } = render(<RerenderHarness profesionalAsignado="Laura RECA" />);

    const firstNameInput = document.getElementById("asistentes.0.nombre");
    if (!(firstNameInput instanceof HTMLInputElement)) {
      throw new Error("first-row name input not found");
    }

    fireEvent.change(firstNameInput, {
      target: { value: "Manual" },
    });

    rerender(<RerenderHarness profesionalAsignado="Marta Ruiz" />);

    await waitFor(() => {
      expect((document.getElementById("asistentes.0.nombre") as HTMLInputElement).value).toBe(
        "Manual"
      );
    });
  });

  it("autocompletes cargo when the user selects another professional in the first row", async () => {
    renderSection();

    const firstNameInput = document.getElementById("asistentes.0.nombre");
    if (!(firstNameInput instanceof HTMLInputElement)) {
      throw new Error("first-row name input not found");
    }

    fireEvent.change(firstNameInput, {
      target: { value: "Marta" },
    });

    fireEvent.mouseDown(screen.getByText("Marta Ruiz"));

    await waitFor(() => {
      expect((document.getElementById("asistentes.0.nombre") as HTMLInputElement).value).toBe(
        "Marta Ruiz"
      );
      expect((document.getElementById("asistentes.0.cargo") as HTMLInputElement).value).toBe(
        "Psicologa"
      );
    });
  });
});
