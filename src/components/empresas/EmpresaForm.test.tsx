// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EmpresaForm from "@/components/empresas/EmpresaForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const catalogos = {
  profesionales: [{ id: 7, nombre: "Sara Zambrano", correo: "sara@reca.test" }],
  asesores: [{ nombre: "Carlos Ruiz", email: "carlos@test.com" }],
  zonasCompensar: ["Chapinero", "Soacha"],
};

describe("EmpresaForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function fillRequiredEmpresaFields() {
    fireEvent.change(screen.getByLabelText("Nombre de la empresa"), {
      target: { value: "ACME SAS" },
    });
    fireEvent.change(screen.getByLabelText("NIT"), {
      target: { value: "900 123 456" },
    });
    fireEvent.change(screen.getByLabelText("Dirección"), {
      target: { value: "Calle 80" },
    });
    fireEvent.change(screen.getByLabelText("Ciudad"), {
      target: { value: "Bogotá" },
    });
    fireEvent.change(screen.getByLabelText("Sede empresa"), {
      target: { value: "Principal" },
    });
    fireEvent.change(screen.getByLabelText("Zona Compensar"), {
      target: { value: "Chapinero" },
    });
    fireEvent.change(screen.getByLabelText("Nombre responsable de visita"), {
      target: { value: "Sandra Pachon" },
    });
    fireEvent.change(screen.getByLabelText("Cargo responsable de visita"), {
      target: { value: "Gerente" },
    });
    fireEvent.change(screen.getByLabelText("Teléfono responsable de visita"), {
      target: { value: "300 123 4567" },
    });
    fireEvent.change(screen.getByLabelText("Correo responsable de visita"), {
      target: { value: "sandra@reca.co" },
    });
    fireEvent.change(screen.getByLabelText("Asesor"), {
      target: { value: "Carlos Ruiz" },
    });
    fireEvent.change(screen.getByLabelText("Profesional asignado"), {
      target: { value: "7" },
    });
  }

  it("renders grouped create fields and submits to the create endpoint", () => {
    render(<EmpresaForm mode="create" catalogos={catalogos} />);

    expect(screen.getByRole("heading", { name: /Empresa/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Compensar/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /RECA/i })).toBeTruthy();
    expect(screen.getByLabelText(/Nombre de la empresa/i)).toBeTruthy();
    expect(screen.getByLabelText(/Zona Compensar/i)).toBeTruthy();
    expect(screen.getByLabelText(/Sede empresa/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Responsable de visita/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Contactos/i })).toBeTruthy();
    expect(screen.getByLabelText(/Profesional asignado/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Crear empresa/i })).toBeTruthy();
  });

  it("replicates responsable de visita as the readonly first contact", () => {
    render(<EmpresaForm mode="create" catalogos={catalogos} />);

    fireEvent.change(screen.getByLabelText("Nombre responsable de visita"), {
      target: { value: "Sandra Pachon" },
    });

    expect(screen.getAllByDisplayValue("Sandra Pachon").length).toBeGreaterThan(1);
    expect(screen.getByLabelText("Nombre primer contacto").hasAttribute("readonly")).toBe(
      true
    );
  });

  it("adds editable additional contacts", () => {
    render(<EmpresaForm mode="create" catalogos={catalogos} />);

    fireEvent.click(screen.getByRole("button", { name: /Agregar contacto adicional/i }));

    expect(screen.getByLabelText("Nombre contacto adicional 1")).toBeTruthy();
    expect(screen.getByLabelText("Cargo contacto adicional 1")).toBeTruthy();
    expect(screen.getByLabelText("Teléfono contacto adicional 1")).toBeTruthy();
    expect(screen.getByLabelText("Correo contacto adicional 1")).toBeTruthy();
  });

  it("removes an additional contact created by mistake", () => {
    render(<EmpresaForm mode="create" catalogos={catalogos} />);

    fireEvent.click(screen.getByRole("button", { name: /Agregar contacto adicional/i }));
    fireEvent.change(screen.getByLabelText("Nombre contacto adicional 1"), {
      target: { value: "Laura Perez" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Eliminar contacto adicional 1/i })
    );

    expect(screen.queryByLabelText("Nombre contacto adicional 1")).toBeNull();
  });

  it("shows validation feedback instead of failing silently on empty create", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<EmpresaForm mode="create" catalogos={catalogos} />);

    fireEvent.click(screen.getByRole("button", { name: /Crear empresa/i }));

    expect(
      await screen.findByText("Revisa los campos obligatorios antes de guardar.")
    ).toBeTruthy();
    expect(screen.getByRole("alert").className).toContain("rounded-xl");
    expect(screen.getByRole("alert").className).toContain("text-red-800");
    expect(await screen.findByText("El NIT es obligatorio.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows server field errors returned by the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "Payload inválido.",
          fieldErrors: {
            nit_empresa: ["El NIT es obligatorio."],
          },
        }),
      })
    );
    render(<EmpresaForm mode="create" catalogos={catalogos} />);

    fillRequiredEmpresaFields();
    fireEvent.click(screen.getByRole("button", { name: /Crear empresa/i }));

    expect(await screen.findByText("Payload inválido.")).toBeTruthy();
    expect(await screen.findByText("El NIT es obligatorio.")).toBeTruthy();
  });

  it("disables browser autocomplete on critical inputs", () => {
    render(<EmpresaForm mode="create" catalogos={catalogos} />);

    expect(screen.getByLabelText("NIT").getAttribute("autocomplete")).toBe("off");
    expect(
      screen.getByLabelText("Teléfono responsable de visita").getAttribute("autocomplete")
    ).toBe("off");
    expect(screen.getByLabelText("Asesor").getAttribute("autocomplete")).toBe("off");
  });

  it("shows placeholder examples for key company fields", () => {
    render(<EmpresaForm mode="create" catalogos={catalogos} />);

    expect(screen.getByPlaceholderText("Ej. Industrias Andinas S. A. S.")).toBeTruthy();
    expect(screen.getByPlaceholderText("Ej. 900123456-7")).toBeTruthy();
    expect(screen.getByPlaceholderText("Ej. Bogotá")).toBeTruthy();
    expect(screen.getByPlaceholderText("Ej. Sandra Pachón")).toBeTruthy();
    expect(screen.getByPlaceholderText("Ej. 3001234567")).toBeTruthy();
    expect(screen.getByPlaceholderText("Escribe o selecciona un asesor")).toBeTruthy();
    expect(screen.getByPlaceholderText("Ej. Cliente solicita seguimiento en mayo.")).toBeTruthy();
  });

  it("shows saving feedback while the create request is in progress", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ id: "empresa-1" }),
                }),
              50
            )
          )
      )
    );
    render(<EmpresaForm mode="create" catalogos={catalogos} />);

    fillRequiredEmpresaFields();
    fireEvent.click(screen.getByRole("button", { name: /Crear empresa/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Guardando/i })).toBeTruthy();
    });
  });

  it("autofills asesor email when selecting an existing asesor", () => {
    render(<EmpresaForm mode="create" catalogos={catalogos} />);

    fireEvent.change(screen.getByLabelText("Asesor"), {
      target: { value: "Carlos Ruiz" },
    });

    expect((screen.getByLabelText("Correo asesor") as HTMLInputElement).value).toBe(
      "carlos@test.com"
    );
  });

  it("renders delete controls in edit mode", () => {
    render(
      <EmpresaForm
        mode="edit"
        catalogos={catalogos}
        empresa={{
          id: "empresa-1",
          nombre_empresa: "ACME SAS",
          nit_empresa: "900123",
          direccion_empresa: null,
          ciudad_empresa: "Bogota",
          sede_empresa: "Principal",
          zona_empresa: null,
          correo_1: null,
          contacto_empresa: null,
          telefono_empresa: null,
          cargo: null,
          responsable_visita: null,
          profesional_asignado_id: 7,
          profesional_asignado: "Sara Zambrano",
          correo_profesional: "sara@reca.test",
          asesor: null,
          correo_asesor: null,
          caja_compensacion: "Compensar",
          estado: "Activa",
          observaciones: null,
          comentarios_empresas: null,
          gestion: "RECA",
          created_at: null,
          updated_at: null,
          deleted_at: null,
        }}
      />
    );

    expect(screen.getByRole("button", { name: /Guardar cambios/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Eliminar/i })).toBeTruthy();
  });
});
