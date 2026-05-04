// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useOdsStore } from "@/hooks/useOdsStore";
import { Seccion4 } from "./Seccion4";

afterEach(() => {
  cleanup();
  useOdsStore.getState().reset();
});

describe("Seccion4 manual staging", () => {
  it("mantiene el boton Crear Usuario en staging para filas validas", () => {
    const store = useOdsStore.getState();
    store.setSeccion4Rows([
      {
        cedula_usuario: "123456",
        nombre_usuario: "Ana Ruiz",
        discapacidad_usuario: "Auditiva",
        genero_usuario: "Mujer",
        fecha_ingreso: "",
        tipo_contrato: "Laboral",
        cargo_servicio: "Auxiliar",
        usuario_reca_exists: false,
      },
    ]);

    render(<Seccion4 />);

    fireEvent.click(screen.getByText("Crear Usuario en staging"));
    fireEvent.click(screen.getByText("Confirmar"));

    expect(useOdsStore.getState().usuarios_nuevos).toEqual([
      {
        cedula_usuario: "123456",
        nombre_usuario: "Ana Ruiz",
        discapacidad_usuario: "Auditiva",
        genero_usuario: "Mujer",
        tipo_contrato: "Laboral",
        cargo_servicio: "Auxiliar",
      },
    ]);
  });
});
