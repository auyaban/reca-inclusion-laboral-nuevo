// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormField } from "@/components/ui/FormField";

afterEach(() => {
  cleanup();
});

describe("FormField", () => {
  it.each([
    ["undefined label", undefined],
    ["empty label", ""],
    ["whitespace-only label", " "],
  ])("does not render an empty label for %s", (_caseName, label) => {
    const { container } = render(
      <FormField label={label} htmlFor="test-input">
        <input id="test-input" aria-label="Campo sin label visible" />
      </FormField>
    );

    expect(container.querySelector("label")).toBeNull();
    expect(container.querySelector("#test-input")).toBeTruthy();
  });

  it("renders a label when text is present", () => {
    const { container } = render(
      <FormField label="Nombre" htmlFor="nombre" required>
        <input id="nombre" />
      </FormField>
    );

    const label = container.querySelector("label");
    expect(label).not.toBeNull();
    expect(label?.getAttribute("for")).toBe("nombre");
    expect(label?.textContent).toContain("Nombre");
  });
});
