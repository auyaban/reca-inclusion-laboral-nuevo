// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
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
    expect(screen.getByLabelText(/Profesional asignado/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Crear empresa/i })).toBeTruthy();
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
