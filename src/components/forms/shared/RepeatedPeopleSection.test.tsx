import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
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

function renderSection(options?: {
  defaultValues?: TestValues;
  errors?: Record<string, unknown>;
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
        config={TEST_CONFIG}
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

describe("RepeatedPeopleSection", () => {
  it("renderiza el fallback del titulo cuando la card aun no tiene nombre", () => {
    const html = renderSection();

    expect(html).toContain("Oferentes");
    expect(html).toContain("Completa solo las cards que realmente vayas a usar.");
    expect(html).toContain("Oferente 1");
    expect(html).toContain("Agregar oferente");
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
});
