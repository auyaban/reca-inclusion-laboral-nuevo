// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAsesoresCatalogMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useAsesoresCatalog", () => ({
  useAsesoresCatalog: useAsesoresCatalogMock,
}));

import { AsesorAgenciaCombobox } from "@/components/forms/shared/AsesorAgenciaCombobox";
import { ProfesionalCombobox } from "@/components/forms/shared/ProfesionalCombobox";

describe("Autocomplete combobox guards", () => {
  beforeEach(() => {
    useAsesoresCatalogMock.mockReturnValue({
      asesores: [{ nombre: "Asesora Uno" }],
      error: null,
    });
  });

  it("applies the browser autofill guard to the profesional combobox input", () => {
    render(
      <ProfesionalCombobox
        value=""
        onChange={vi.fn()}
        onCargoChange={vi.fn()}
        profesionales={[
          {
            nombre_profesional: "Profesional RECA",
            cargo_profesional: "Profesional de apoyo",
          },
        ]}
      />
    );

    const input = screen.getByPlaceholderText("Buscar profesional RECA...");
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(input.getAttribute("autocorrect")).toBe("off");
    expect(input.getAttribute("autocapitalize")).toBe("none");
    expect(input.getAttribute("spellcheck")).toBe("false");
  });

  it("applies the browser autofill guard to the asesor combobox input", () => {
    render(<AsesorAgenciaCombobox value="" onChange={vi.fn()} />);

    const input = screen.getByPlaceholderText("Nombre del asesor agencia...");
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(input.getAttribute("autocorrect")).toBe("off");
    expect(input.getAttribute("autocapitalize")).toBe("none");
    expect(input.getAttribute("spellcheck")).toBe("false");
  });
});
