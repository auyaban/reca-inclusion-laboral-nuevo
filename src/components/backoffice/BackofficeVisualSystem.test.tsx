// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import Link from "next/link";
import { afterEach, describe, expect, it } from "vitest";
import {
  BackofficeBadge,
  BackofficeFeedback,
  BackofficeFormSkeleton,
  BackofficePageHeader,
  BackofficeSectionCard,
  BackofficeTableSkeleton,
} from "@/components/backoffice";

describe("backoffice visual system", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a RECA page header with readable title, description and action", () => {
    render(
      <BackofficePageHeader
        title="Empresas"
        description="Backoffice de inclusión laboral."
        action={
          <Link href="/hub/empresas/admin/empresas/nueva">
            Nueva empresa
          </Link>
        }
      />
    );

    const header = screen.getByTestId("backoffice-page-header");
    expect(header.className).toContain("from-reca-800");
    expect(header.className).toContain("to-teal-600");
    expect(screen.getByRole("heading", { name: "Empresas" }).className).toContain(
      "text-white"
    );
    expect(screen.getByText("Backoffice de inclusión laboral.").className).toContain(
      "text-teal-50"
    );
    expect(screen.getByRole("link", { name: "Nueva empresa" })).toBeTruthy();
  });

  it("renders section cards and feedback with high-contrast text", () => {
    render(
      <>
        <BackofficeSectionCard
          title="Actividad reciente"
          description="Cambios importantes del registro."
        >
          <p>Contenido</p>
        </BackofficeSectionCard>
        <BackofficeFeedback variant="error" title="No se pudo guardar">
          Revisa los campos obligatorios.
        </BackofficeFeedback>
        <BackofficeFeedback variant="success">Cambios guardados.</BackofficeFeedback>
      </>
    );

    expect(screen.getByRole("heading", { name: "Actividad reciente" }).className).toContain(
      "text-gray-900"
    );
    expect(screen.getByText("Cambios importantes del registro.").className).toContain(
      "text-gray-700"
    );
    expect(screen.getByText("No se pudo guardar").className).toContain("text-red-900");
    expect(screen.getByText("Cambios guardados.").className).toContain(
      "text-emerald-800"
    );
  });

  it("uses readable badges for operational states", () => {
    render(
      <>
        <BackofficeBadge tone="success">Activa</BackofficeBadge>
        <BackofficeBadge tone="warning">Contraseña temporal</BackofficeBadge>
        <BackofficeBadge tone="neutral">Sin acceso</BackofficeBadge>
      </>
    );

    expect(screen.getByText("Activa").className).toContain("text-emerald-800");
    expect(screen.getByText("Contraseña temporal").className).toContain(
      "text-amber-900"
    );
    expect(screen.getByText("Sin acceso").className).toContain("text-slate-800");
  });

  it("renders reusable loading skeletons with friendly status messages", () => {
    render(
      <>
        <BackofficeTableSkeleton title="Cargando empresas..." />
        <BackofficeFormSkeleton title="Abriendo registro..." />
      </>
    );

    expect(screen.getByText("Cargando empresas...")).toBeTruthy();
    expect(screen.getByText("Abriendo registro...")).toBeTruthy();
    expect(screen.getByTestId("backoffice-table-skeleton").className).toContain(
      "animate-pulse"
    );
    expect(screen.getByTestId("backoffice-form-skeleton").className).toContain(
      "animate-pulse"
    );
  });
});
