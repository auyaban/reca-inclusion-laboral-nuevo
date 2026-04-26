// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LongFormSectionNav,
  type LongFormSectionNavItem,
} from "@/components/forms/shared/LongFormSectionNav";

const groupedItems: LongFormSectionNavItem[] = [
  {
    id: "company",
    label: "Empresa",
    shortLabel: "Empresa",
    status: "completed",
  },
  {
    type: "group",
    id: "section_2_group",
    label: "Sección 2",
    shortLabel: "2",
    children: [
      {
        id: "section_2_1",
        label: "2.1 Condiciones de movilidad",
        shortLabel: "2.1",
        status: "active",
      },
      {
        id: "section_2_2",
        label: "2.2 Condiciones de accesibilidad general",
        shortLabel: "2.2",
        status: "idle",
      },
    ],
  },
  {
    id: "section_3",
    label: "3. Condiciones organizacionales",
    shortLabel: "3",
    status: "idle",
  },
];

describe("LongFormSectionNav", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps flat items working without group behavior", () => {
    const onSelect = vi.fn();

    render(
      <LongFormSectionNav
        items={[
          { id: "company", label: "Empresa", shortLabel: "Empresa", status: "active" },
          { id: "section_3", label: "3. Condiciones", shortLabel: "3", status: "idle" },
        ]}
        activeSectionId="company"
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByTestId("long-form-nav-desktop-item-section_3"));

    expect(onSelect).toHaveBeenCalledWith("section_3");
  });

  it("renders grouped items collapsed by default when the active section is outside the group", () => {
    const onSelect = vi.fn();

    render(
      <LongFormSectionNav
        items={groupedItems}
        activeSectionId="section_3"
        onSelect={onSelect}
      />
    );

    const desktopGroupToggle = screen.getByTestId(
      "long-form-nav-desktop-group-section_2_group"
    );

    expect(desktopGroupToggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.queryByTestId("long-form-nav-desktop-group-children-section_2_group")
    ).toBeNull();

    fireEvent.click(desktopGroupToggle);

    expect(onSelect).not.toHaveBeenCalled();
    expect(desktopGroupToggle.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByTestId("long-form-nav-desktop-group-children-section_2_group")
    ).not.toBeNull();
  });

  it("auto-expands the group when the active section belongs to a child", () => {
    const onSelect = vi.fn();

    render(
      <LongFormSectionNav
        items={groupedItems}
        activeSectionId="section_2_2"
        onSelect={onSelect}
      />
    );

    expect(
      screen
        .getByTestId("long-form-nav-desktop-group-section_2_group")
        .getAttribute("aria-expanded")
    ).toBe("true");

    fireEvent.click(
      screen.getByTestId("long-form-nav-desktop-child-section_2_1")
    );

    expect(onSelect).toHaveBeenCalledWith("section_2_1");
  });

  it("can keep the active group collapsed initially while allowing manual expansion", () => {
    const onSelect = vi.fn();

    render(
      <LongFormSectionNav
        items={groupedItems}
        activeSectionId="section_2_2"
        onSelect={onSelect}
        autoExpandActiveGroups={false}
      />
    );

    const desktopGroupToggle = screen.getByTestId(
      "long-form-nav-desktop-group-section_2_group"
    );

    expect(desktopGroupToggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.queryByTestId("long-form-nav-desktop-group-children-section_2_group")
    ).toBeNull();

    fireEvent.click(desktopGroupToggle);

    expect(desktopGroupToggle.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByTestId("long-form-nav-desktop-group-children-section_2_group")
    ).not.toBeNull();
  });

  it("shows a second mobile row with child buttons when the group is expanded", () => {
    const onSelect = vi.fn();

    render(
      <LongFormSectionNav
        items={groupedItems}
        activeSectionId="company"
        onSelect={onSelect}
      />
    );

    fireEvent.click(
      screen.getByTestId("long-form-nav-mobile-group-section_2_group")
    );

    expect(
      screen.getByTestId("long-form-nav-mobile-group-children-section_2_group")
    ).not.toBeNull();

    fireEvent.click(screen.getByTestId("long-form-nav-mobile-child-section_2_2"));

    expect(onSelect).toHaveBeenCalledWith("section_2_2");
  });
});
