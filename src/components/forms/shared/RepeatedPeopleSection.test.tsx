// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { RepeatedPeopleSection } from "@/components/forms/shared/RepeatedPeopleSection";
import type { RepeatedPeopleConfig } from "@/lib/repeatedPeople";

type TestRow = {
  nombre_oferente: string;
  cargo_oferente: string;
};

type TestValues = {
  oferentes: TestRow[];
};

const TEST_CONFIG: RepeatedPeopleConfig<TestRow> = {
  itemLabelSingular: "Oferente",
  itemLabelPlural: "Oferentes",
  primaryNameField: "nombre_oferente",
  meaningfulFieldIds: ["nombre_oferente", "cargo_oferente"],
  createEmptyRow: () => ({
    nombre_oferente: "",
    cargo_oferente: "",
  }),
};

const CUSTOM_CARD_CONFIG: RepeatedPeopleConfig<TestRow> = {
  ...TEST_CONFIG,
  getCardTitle: (_row, index) => `Oferente ${index + 1}`,
  getCardSubtitle: (row) => {
    const normalizedName = row.nombre_oferente.trim();
    const normalizedCargo = row.cargo_oferente.trim();
    if (normalizedName && normalizedCargo) {
      return `${normalizedName} - ${normalizedCargo}`;
    }

    return normalizedName || normalizedCargo || null;
  },
};

function renderSection(options?: {
  defaultValues?: TestValues;
  errors?: Record<string, unknown>;
  config?: RepeatedPeopleConfig<TestRow>;
}) {
  function TestHarness() {
    const { control } = useForm<TestValues>({
      defaultValues: options?.defaultValues ?? {
        oferentes: [{ nombre_oferente: "", cargo_oferente: "" }],
      },
    });

    return (
        <RepeatedPeopleSection
          control={control}
          errors={(options?.errors ?? {}) as never}
          name={"oferentes"}
          config={options?.config ?? TEST_CONFIG}
          helperText="Completa solo las cards que realmente vayas a usar."
          renderRow={({ index, row }) => (
            <div>
            Fila {index + 1}: {(row.cargo_oferente as string) || "Sin cargo"}
          </div>
        )}
      />
    );
  }

  return renderToStaticMarkup(<TestHarness />);
}

function renderInteractiveSection(options?: {
  defaultValues?: TestValues;
  config?: RepeatedPeopleConfig<TestRow>;
  createRowForAppend?: (index: number) => TestRow;
}) {
  function TestHarness() {
    const { control } = useForm<TestValues>({
      defaultValues: options?.defaultValues ?? {
        oferentes: [{ nombre_oferente: "", cargo_oferente: "" }],
      },
    });

    return (
      <RepeatedPeopleSection
        control={control}
        errors={{}}
        name={"oferentes"}
        config={options?.config ?? TEST_CONFIG}
        createRowForAppend={options?.createRowForAppend}
        renderRow={({ index, row }) => (
          <div>
            Fila {index + 1}: {(row.cargo_oferente as string) || "Sin cargo"}
          </div>
        )}
      />
    );
  }

  return render(<TestHarness />);
}

describe("RepeatedPeopleSection", () => {
  it("renderiza el fallback del titulo cuando la card aun no tiene nombre", () => {
    const html = renderSection();

    expect(html).toContain("Oferentes");
    expect(html).toContain("Completa solo las cards que realmente vayas a usar.");
    expect(html).toContain("Oferente 1");
    expect(html).toContain("Agregar oferente");
    expect(html).toContain('data-testid="oferentes-add-button-bottom"');
  });

  it("usa el nombre primario de la fila como titulo cuando existe", () => {
    const html = renderSection({
      defaultValues: {
        oferentes: [
          {
            nombre_oferente: "Ana Perez",
            cargo_oferente: "Analista",
          },
        ],
      },
    });

    expect(html).toContain("Ana Perez");
    expect(html).not.toContain("Oferente 1");
  });

  it("renderiza subtitulo secundario cuando el config expone resumen custom", () => {
    const html = renderSection({
      config: CUSTOM_CARD_CONFIG,
      defaultValues: {
        oferentes: [
          {
            nombre_oferente: "Ana Perez",
            cargo_oferente: "1000061994",
          },
        ],
      },
    });

    expect(html).toContain("Oferente 1");
    expect(html).toContain("Ana Perez - 1000061994");
  });

  it("renderiza el error raiz una sola vez aunque existan errores por fila", () => {
    const rowErrors = [
      {
        nombre_oferente: {
          message: "Requerido",
        },
      },
    ] as unknown[];

    const html = renderSection({
      errors: {
        oferentes: Object.assign(rowErrors, {
          root: {
            message: "Agrega al menos un oferente.",
          },
        }),
      },
    });

    expect(html.split("Agrega al menos un oferente.")).toHaveLength(2);
  });

  it("marca la card correcta cuando existe un error anidado en esa fila", () => {
    const rowErrors = [] as unknown[];
    rowErrors[1] = {
      nombre_oferente: {
        message: "Requerido",
      },
    };

    const html = renderSection({
      defaultValues: {
        oferentes: [
          {
            nombre_oferente: "Ana Perez",
            cargo_oferente: "Analista",
          },
          {
            nombre_oferente: "",
            cargo_oferente: "Auxiliar",
          },
        ],
      },
      errors: {
        oferentes: rowErrors,
      },
    });

    expect(html).toContain('data-row-index="0"');
    expect(html).toContain('data-row-index="1"');
    expect(html.split('data-row-status="error"')).toHaveLength(2);
  });

  it("mantiene botones arriba y abajo con el mismo comportamiento de agregado", () => {
    const { container } = renderInteractiveSection();

    expect(screen.getByTestId("oferentes-add-button")).toBeTruthy();
    expect(screen.getByTestId("oferentes-add-button-bottom")).toBeTruthy();
    expect(container.querySelectorAll('[data-testid$=".card"]')).toHaveLength(1);

    fireEvent.click(screen.getByTestId("oferentes-add-button-bottom"));
    expect(container.querySelectorAll('[data-testid$=".card"]')).toHaveLength(2);

    fireEvent.click(screen.getByTestId("oferentes-add-button"));
    expect(container.querySelectorAll('[data-testid$=".card"]')).toHaveLength(3);
  });

  it("permite personalizar la fila agregada desde el caller", () => {
    const { container } = renderInteractiveSection({
      createRowForAppend: (index) => ({
        nombre_oferente: "",
        cargo_oferente: `Preset ${index + 1}`,
      }),
    });

    fireEvent.click(
      container.querySelector(
        '[data-testid="oferentes-add-button-bottom"]'
      ) as HTMLButtonElement
    );

    expect(screen.getByText("Fila 2: Preset 2")).toBeTruthy();
  });
});
