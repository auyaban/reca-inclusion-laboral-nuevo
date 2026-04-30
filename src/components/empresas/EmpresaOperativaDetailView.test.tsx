// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EmpresaOperativaDetailView from "@/components/empresas/EmpresaOperativaDetailView";

const empresa = {
  id: "empresa-1",
  nombreEmpresa: "Empresa Propia",
  nitEmpresa: "9001",
  direccionEmpresa: "Calle 1",
  ciudadEmpresa: "Bogotá",
  sedeEmpresa: "Principal",
  zonaEmpresa: "Norte",
  gestion: "RECA",
  cajaCompensacion: "Compensar",
  asesor: "Asesor Uno",
  correoAsesor: "asesor@test.com",
  estado: "Activa",
  observaciones: "Seguimiento mensual",
  comentariosEmpresas: null,
  responsable: {
    nombre: "Ana Perez",
    cargo: "Gerente",
    telefono: "300",
    correo: "ana@empresa.test",
  },
  contactos: [
    {
      nombre: "Ana Perez",
      cargo: "Gerente",
      telefono: "300",
      correo: "ana@empresa.test",
    },
  ],
  profesionalAsignadoId: 7,
  profesionalAsignado: "Sara Zambrano",
  correoProfesional: "sara@recacolombia.org",
  assignmentStatus: "tuya" as const,
  ultimoFormatoAt: "2026-04-29T12:00:00.000Z",
  ultimoFormatoNombre: "Presentación",
  createdAt: "2026-04-28T10:00:00.000Z",
  updatedAt: "2026-04-29T10:00:00.000Z",
};

describe("EmpresaOperativaDetailView", () => {
  it("renders read-only sections, notes and ownership actions without edit controls", () => {
    render(
      <EmpresaOperativaDetailView
        empresa={empresa}
        notes={[
          {
            id: "nota-1",
            tipo: "nota",
            actorNombre: "Sara Zambrano",
            createdAt: "2026-04-29T13:00:00.000Z",
            resumen: "Nota: Cliente solicita seguimiento.",
            detalle: "Cliente solicita seguimiento.",
          },
        ]}
        recentEvents={[]}
      />
    );

    expect(screen.getByText("Datos principales")).toBeTruthy();
    expect(screen.getByText("Notas")).toBeTruthy();
    expect(screen.getByText("Cliente solicita seguimiento.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Liberar empresa/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Guardar empresa/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Editar/i })).toBeNull();
  });
});
