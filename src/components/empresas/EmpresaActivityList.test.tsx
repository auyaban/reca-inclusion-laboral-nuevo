// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EmpresaActivityList from "@/components/empresas/EmpresaActivityList";

describe("EmpresaActivityList", () => {
  it("renders recent company events", () => {
    render(
      <EmpresaActivityList
        events={[
          {
            id: "event-1",
            tipo: "cambio_estado",
            actor_nombre: "Sara Zambrano",
            resumen: "Estado: Activa -> Cerrada",
            created_at: "2026-04-28T15:00:00.000Z",
          },
        ]}
      />
    );

    expect(screen.getByText("Actividad reciente")).toBeTruthy();
    expect(screen.getByText("Estado: Activa -> Cerrada")).toBeTruthy();
    expect(screen.getByText(/Sara Zambrano/i)).toBeTruthy();
  });
});
