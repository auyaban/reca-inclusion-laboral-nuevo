// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useOdsStore } from "@/hooks/useOdsStore";
import { Seccion4 } from "./Seccion4";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  useOdsStore.getState().reset();
});

function seedBlankRow(cedula = "") {
  useOdsStore.getState().setSeccion4Rows([
    {
      cedula_usuario: cedula,
      nombre_usuario: "",
      discapacidad_usuario: "",
      genero_usuario: "",
      fecha_ingreso: "",
      tipo_contrato: "",
      cargo_servicio: "",
      usuario_reca_exists: null,
    },
  ]);
}

async function renderAndLookup(item: {
  cedula_usuario: string;
  nombre_usuario: string;
  discapacidad_usuario: string | null;
  genero_usuario: string | null;
} | null) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ found: Boolean(item), item }),
  }));
  vi.stubGlobal(
    "fetch",
    fetchMock
  );
  seedBlankRow();

  render(<Seccion4 />);

  fireEvent.change(screen.getByPlaceholderText("Solo digitos"), { target: { value: "123456" } });
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());

  return screen.getAllByRole("combobox") as HTMLSelectElement[];
}

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

describe("Seccion4 catalog readonly state", () => {
  it("permite corregir discapacidad vacia de BD y mantiene genero canonico readonly", async () => {
    const [discapacidad, genero] = await renderAndLookup({
      cedula_usuario: "123456",
      nombre_usuario: "Rafael Reina",
      discapacidad_usuario: null,
      genero_usuario: "Otro",
    });

    await waitFor(() => expect(screen.getByText("Usuario encontrado: Rafael Reina")).toBeTruthy());
    expect(discapacidad.disabled).toBe(false);
    expect(discapacidad.value).toBe("");
    expect(discapacidad.title).toContain("Valor no canónico");
    expect(genero.disabled).toBe(true);
    expect(genero.value).toBe("Otro");
  });

  it("bloquea discapacidad y genero cuando ambos valores de BD son canonicos", async () => {
    const [discapacidad, genero] = await renderAndLookup({
      cedula_usuario: "123456",
      nombre_usuario: "Ana Ruiz",
      discapacidad_usuario: "Auditiva",
      genero_usuario: "Mujer",
    });

    await waitFor(() => expect(screen.getByText("Usuario encontrado: Ana Ruiz")).toBeTruthy());
    expect(discapacidad.disabled).toBe(true);
    expect(discapacidad.value).toBe("Auditiva");
    expect(genero.disabled).toBe(true);
    expect(genero.value).toBe("Mujer");
  });

  it("permite corregir genero no canonico de BD y muestra warning visible", async () => {
    const [, genero] = await renderAndLookup({
      cedula_usuario: "123456",
      nombre_usuario: "Ana Ruiz",
      discapacidad_usuario: "Visual",
      genero_usuario: "MUJER",
    });

    await waitFor(() => expect(screen.getByText("Usuario encontrado: Ana Ruiz")).toBeTruthy());
    expect(genero.disabled).toBe(false);
    expect(genero.value).toBe("");
    expect(screen.getByText(/Valor no canónico en usuarios_reca/i)).toBeTruthy();
  });

  it("mantiene discapacidad y genero editables cuando la cedula no existe", async () => {
    const [discapacidad, genero] = await renderAndLookup(null);

    expect(discapacidad.disabled).toBe(false);
    expect(genero.disabled).toBe(false);
  });

  it("limpia la metadata original al cambiar la cedula", async () => {
    await renderAndLookup({
      cedula_usuario: "123456",
      nombre_usuario: "Ana Ruiz",
      discapacidad_usuario: "Auditiva",
      genero_usuario: "Mujer",
    });

    await waitFor(() => expect(useOdsStore.getState().seccion4.rows[0].usuario_reca_original).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText("Solo digitos"), { target: { value: "999" } });

    const row = useOdsStore.getState().seccion4.rows[0];
    expect(row.usuario_reca_exists).toBeNull();
    expect(row.usuario_reca_original).toBeNull();
  });
});
