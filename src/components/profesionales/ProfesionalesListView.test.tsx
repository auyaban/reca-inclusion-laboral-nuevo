// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ProfesionalesListView from "@/components/profesionales/ProfesionalesListView";

const emptyResult = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 50,
  totalPages: 0,
};

describe("ProfesionalesListView", () => {
  afterEach(() => {
    cleanup();
  });

  it("links the new professional action to the create page", () => {
    render(
      <ProfesionalesListView
        result={emptyResult}
        params={{ q: "", estado: "activos" }}
      />
    );

    expect(
      screen.getByRole("link", { name: /Nuevo profesional/i }).getAttribute("href")
    ).toBe("/hub/empresas/admin/profesionales/nuevo");
  });
});
