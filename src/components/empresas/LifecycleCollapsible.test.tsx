// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LifecycleCollapsible from "@/components/empresas/LifecycleCollapsible";

describe("LifecycleCollapsible", () => {
  afterEach(() => {
    cleanup();
  });

  it("starts open when requested and exposes a valid controlled panel", () => {
    render(
      <LifecycleCollapsible count={2} defaultOpen title="Etapas de empresa">
        <p>Contenido visible</p>
      </LifecycleCollapsible>
    );

    const button = screen.getByRole("button", { name: /etapas de empresa/i });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.className).toContain("focus-visible:ring-reca");

    const panelId = button.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId as string);
    expect(panel).toBeTruthy();
    expect(panel?.hidden).toBe(false);
    expect(screen.getByText("Contenido visible")).toBeTruthy();
  });

  it("toggles visibility without breaking the aria-controls target", () => {
    render(
      <LifecycleCollapsible count={0} title="Personas sin perfil">
        <p>Contenido colapsable</p>
      </LifecycleCollapsible>
    );

    const button = screen.getByRole("button", { name: /personas sin perfil/i });
    const panelId = button.getAttribute("aria-controls");
    const panel = document.getElementById(panelId as string);

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(panel).toBeTruthy();
    expect(panel?.hidden).toBe(true);

    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(panel?.hidden).toBe(false);

    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(panel?.hidden).toBe(true);
  });
});
