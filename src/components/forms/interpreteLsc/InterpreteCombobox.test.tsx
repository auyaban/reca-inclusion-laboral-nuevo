// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InterpreteCombobox } from "@/components/forms/interpreteLsc/InterpreteCombobox";

afterEach(() => {
  cleanup();
});

describe("InterpreteCombobox", () => {
  it("shows an explicit empty-state message and creation CTA when there is no catalog match", () => {
    render(
      <InterpreteCombobox
        value=""
        onChange={vi.fn()}
        interpretes={[{ id: "1", nombre: "Laura Perez" }]}
        onCreate={vi.fn()}
      />
    );

    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Nombre Nuevo" } });

    expect(
      screen.getByText(
        "No hay coincidencias en el catalogo. Puedes dejar el nombre escrito o crearlo ahora."
      )
    ).toBeTruthy();
    expect(screen.getByText('Crear "Nombre Nuevo"')).toBeTruthy();
  });

  it("normalizes free-text names on blur before persisting them", () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();

    render(
      <InterpreteCombobox
        value=""
        onChange={onChange}
        onBlur={onBlur}
        interpretes={[]}
      />
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  Maria   Lopez  " } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenLastCalledWith("Maria Lopez");
    expect(onBlur).toHaveBeenCalledWith("Maria Lopez");
  });
});
