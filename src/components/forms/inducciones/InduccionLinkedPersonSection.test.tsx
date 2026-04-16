// @vitest-environment jsdom

import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { InduccionLinkedPersonSection } from "@/components/forms/inducciones/InduccionLinkedPersonSection";
import type { InduccionLinkedPerson } from "@/lib/inducciones";
import type { UsuarioRecaRecord } from "@/lib/usuariosReca";

type TestValues = {
  vinculado: InduccionLinkedPerson;
};

const EMPTY_LINKED_PERSON: InduccionLinkedPerson = {
  numero: "1",
  nombre_oferente: "",
  cedula: "",
  telefono_oferente: "",
  cargo_oferente: "",
};

const SNAPSHOT: UsuarioRecaRecord = {
  cedula_usuario: "1000061994",
  nombre_usuario: "Ana Perez",
  genero_usuario: null,
  discapacidad_usuario: null,
  discapacidad_detalle: null,
  certificado_discapacidad: null,
  certificado_porcentaje: null,
  telefono_oferente: "3001112233",
  fecha_nacimiento: null,
  cargo_oferente: "Analista",
  contacto_emergencia: null,
  parentesco: null,
  telefono_emergencia: null,
  correo_oferente: null,
  lgtbiq: null,
  grupo_etnico: null,
  grupo_etnico_cual: null,
  lugar_firma_contrato: null,
  fecha_firma_contrato: null,
  tipo_contrato: null,
  fecha_fin: null,
  resultado_certificado: null,
  pendiente_otros_oferentes: null,
  cuenta_pension: null,
  tipo_pension: null,
  empresa_nit: null,
  empresa_nombre: null,
};

function renderSection(options?: {
  defaultValues?: Partial<InduccionLinkedPerson>;
  loadedSnapshot?: UsuarioRecaRecord | null;
}) {
  function TestHarness() {
    const {
      register,
      setValue,
      getValues,
      formState: { errors },
    } = useForm<TestValues>({
      defaultValues: {
        vinculado: {
          ...EMPTY_LINKED_PERSON,
          ...(options?.defaultValues ?? {}),
        },
      },
    });

    return (
      <InduccionLinkedPersonSection
        fieldNamePrefix={"vinculado"}
        linkedPerson={getValues("vinculado")}
        register={register}
        setValue={setValue}
        errors={errors}
        loadedSnapshot={options?.loadedSnapshot ?? null}
        onLoadedSnapshotChange={() => {}}
      />
    );
  }

  return renderToStaticMarkup(<TestHarness />);
}

describe("InduccionLinkedPersonSection", () => {
  it("renders the lookup flow when the linked person is empty", () => {
    const html = renderSection();

    expect(html).toContain("Consulta usuarios RECA por cedula");
    expect(html).toContain("Cargar datos");
    expect(html).toContain('data-testid="vinculado.numero"');
    expect(html).not.toContain("Estas modificando datos cargados desde usuarios RECA");
  });

  it("renders the replace warning when a snapshot is loaded", () => {
    const html = renderSection({
      defaultValues: {
        cedula: "1000061994",
        nombre_oferente: "Ana Perez",
      },
      loadedSnapshot: SNAPSHOT,
    });

    expect(html).toContain("Estas modificando datos cargados desde usuarios RECA");
    expect(html).toContain("Reemplazar datos");
  });

  it("marks modified mapped fields with highlighted state", () => {
    const html = renderSection({
      defaultValues: {
        cedula: "1000061994",
        nombre_oferente: "Ana Perez",
        telefono_oferente: "3001112233",
        cargo_oferente: "Coordinadora",
      },
      loadedSnapshot: SNAPSHOT,
    });

    expect(html).toContain('data-testid="vinculado.cargo_oferente"');
    expect(html).toContain('data-highlighted="true"');
  });

  it("keeps numero fixed and readonly in the shared UI", () => {
    const html = renderSection({
      defaultValues: {
        numero: "1",
      },
    });

    expect(html).toContain('data-testid="vinculado.numero"');
    expect(html).toContain('value="1"');
    expect(html).toContain('readOnly=""');
  });

  it("clears the loaded snapshot when the linked person becomes empty", async () => {
    function InteractiveHarness() {
      const [loadedSnapshot, setLoadedSnapshot] = useState<UsuarioRecaRecord | null>(
        SNAPSHOT
      );
      const [linkedPerson, setLinkedPerson] = useState<InduccionLinkedPerson>({
        numero: "1",
        cedula: "1000061994",
        nombre_oferente: "Ana Perez",
        telefono_oferente: "3001112233",
        cargo_oferente: "Analista",
      });
      const {
        register,
        setValue,
        formState: { errors },
      } = useForm<TestValues>({
        defaultValues: {
          vinculado: linkedPerson,
        },
      });

      return (
        <div>
          <button
            type="button"
            onClick={() => {
              setLinkedPerson(EMPTY_LINKED_PERSON);
              setValue("vinculado", EMPTY_LINKED_PERSON, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            }}
          >
            Limpiar vinculado
          </button>
          <div data-testid="snapshot-state">
            {loadedSnapshot ? "loaded" : "empty"}
          </div>
          <InduccionLinkedPersonSection
            fieldNamePrefix={"vinculado"}
            linkedPerson={linkedPerson}
            register={register}
            setValue={setValue}
            errors={errors}
            loadedSnapshot={loadedSnapshot}
            onLoadedSnapshotChange={setLoadedSnapshot}
          />
        </div>
      );
    }

    render(<InteractiveHarness />);

    expect(screen.getByTestId("snapshot-state").textContent).toBe("loaded");
    fireEvent.click(screen.getByRole("button", { name: "Limpiar vinculado" }));

    await waitFor(() => {
      expect(screen.getByTestId("snapshot-state").textContent).toBe("empty");
    });
  });
});
