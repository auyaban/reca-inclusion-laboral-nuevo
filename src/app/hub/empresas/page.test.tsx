// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmpresasPage from "@/app/hub/empresas/page";
import { hasEmpresasAdminRole } from "@/lib/empresas/access";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));

vi.mock("@/lib/empresas/access", () => ({
  hasEmpresasAdminRole: vi.fn(),
}));

vi.mock("@/components/empresas/EmpresasModuleHome", () => ({
  default: ({ isAdmin }: { isAdmin: boolean }) => (
    <section data-testid="empresas-module">{String(isAdmin)}</section>
  ),
}));

describe("EmpresasPage", () => {
  it("redirects authenticated non-admin users back to the hub", async () => {
    vi.mocked(hasEmpresasAdminRole).mockResolvedValue(false);

    await expect(EmpresasPage()).rejects.toThrow("NEXT_REDIRECT:/hub");
    expect(redirect).toHaveBeenCalledWith("/hub");
  });

  it("renders the module for inclusion empresas admins", async () => {
    vi.mocked(hasEmpresasAdminRole).mockResolvedValue(true);

    render(await EmpresasPage());

    expect(screen.getByTestId("empresas-module").textContent).toBe("true");
  });
});
