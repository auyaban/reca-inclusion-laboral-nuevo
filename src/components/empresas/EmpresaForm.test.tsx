// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  });

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
