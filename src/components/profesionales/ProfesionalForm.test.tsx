// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfesionalForm from "@/components/profesionales/ProfesionalForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("ProfesionalForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows fixed RECA email domain, readonly usuario login and closed programa list", () => {
    render(<ProfesionalForm mode="create" />);

    expect(screen.getByText("@recacolombia.org")).toBeTruthy();
    expect(screen.getByLabelText("Usuario login").hasAttribute("readonly")).toBe(true);
    expect((screen.getByLabelText("Programa") as HTMLSelectElement).value).toBe(
      "Inclusión Laboral"
    );
    expect(screen.getByRole("option", { name: "Inclusión Laboral" })).toBeTruthy();
    expect(screen.getByLabelText("Nombre profesional").getAttribute("autocomplete")).toBe(
      "off"
    );
    expect(screen.getByLabelText("Correo").getAttribute("autocomplete")).toBe("off");
  });
});
