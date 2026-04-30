// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HubShell, { HUB_SIDEBAR_STORAGE_KEY } from "@/components/layout/HubShell";
import HubSidebar from "@/components/layout/HubSidebar";

const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/components/layout/HubAnalyticsListener", () => ({
  default: () => null,
}));

vi.mock("@/components/layout/HubTabListener", () => ({
  default: () => null,
}));

vi.mock("@/components/layout/HubSignOutButton", () => ({
  default: () => <button type="button">Salir</button>,
}));

describe("HubSidebar", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    pathnameMock.mockReturnValue("/hub");
  });

  it("renders the hub areas and keeps ODS disabled", () => {
    render(
      <HubSidebar
        collapsed={false}
        mobileOpen={false}
        showEmpresas
        showOds={false}
        onCloseMobile={vi.fn()}
        onNavigate={vi.fn()}
        onToggleCollapsed={vi.fn()}
      />
    );

    expect(screen.getByTestId("hub-sidebar")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Formatos/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Empresas/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /ODS/i }).getAttribute("aria-disabled")).toBe(
      "true"
    );
    expect(screen.getByRole("button", { name: /ODS/i }).getAttribute("title")).toBe(
      "Próximamente"
    );
  });

  it("hides Empresas when the user does not have the admin role", () => {
    render(
      <HubSidebar
        collapsed={false}
        mobileOpen={false}
        showEmpresas={false}
        showOds={false}
        onCloseMobile={vi.fn()}
        onNavigate={vi.fn()}
        onToggleCollapsed={vi.fn()}
      />
    );

    expect(screen.getByRole("link", { name: /Formatos/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Empresas/i })).toBeNull();
    expect(screen.getByRole("button", { name: /ODS/i }).getAttribute("aria-disabled")).toBe(
      "true"
    );
  });

  it("exposes ODS as an enabled link when the user has ods_operador role", () => {
    render(
      <HubSidebar
        collapsed={false}
        mobileOpen={false}
        showEmpresas={false}
        showOds
        onCloseMobile={vi.fn()}
        onNavigate={vi.fn()}
        onToggleCollapsed={vi.fn()}
      />
    );

    const odsLink = screen.getByRole("link", { name: /ODS/i });
    expect(odsLink).toBeTruthy();
    expect(odsLink.getAttribute("href")).toBe("/hub/ods");
    expect(screen.queryByRole("button", { name: /ODS/i })).toBeNull();
    expect(screen.queryByText(/disponible en una expansión futura/i)).toBeNull();
  });

  it("marks ODS as active for nested ods routes when enabled", () => {
    pathnameMock.mockReturnValue("/hub/ods");

    render(
      <HubSidebar
        collapsed={false}
        mobileOpen={false}
        showEmpresas
        showOds
        onCloseMobile={vi.fn()}
        onNavigate={vi.fn()}
        onToggleCollapsed={vi.fn()}
      />
    );

    expect(screen.getByRole("link", { name: /ODS/i }).getAttribute("aria-current")).toBe(
      "page"
    );
  });

  it("marks Empresas as active for nested empresas routes", () => {
    pathnameMock.mockReturnValue("/hub/empresas");

    render(
      <HubSidebar
        collapsed={false}
        mobileOpen={false}
        showEmpresas
        showOds={false}
        onCloseMobile={vi.fn()}
        onNavigate={vi.fn()}
        onToggleCollapsed={vi.fn()}
      />
    );

    expect(screen.getByRole("link", { name: /Empresas/i }).getAttribute("aria-current")).toBe(
      "page"
    );
    expect(screen.getByRole("link", { name: /Formatos/i }).getAttribute("aria-current")).toBeNull();
  });

  it("marks Formatos as active for the draft cleanup route", () => {
    pathnameMock.mockReturnValue("/hub/admin/borradores");

    render(
      <HubSidebar
        collapsed={false}
        mobileOpen={false}
        showEmpresas
        showOds={false}
        onCloseMobile={vi.fn()}
        onNavigate={vi.fn()}
        onToggleCollapsed={vi.fn()}
      />
    );

    expect(screen.getByRole("link", { name: /Formatos/i }).getAttribute("aria-current")).toBe(
      "page"
    );
  });

  it("puts the desktop sidebar toggle in the top-left sidebar slot", () => {
    const onToggleCollapsed = vi.fn();

    render(
      <HubSidebar
        collapsed
        mobileOpen={false}
        showEmpresas
        showOds={false}
        onCloseMobile={vi.fn()}
        onNavigate={vi.fn()}
        onToggleCollapsed={onToggleCollapsed}
      />
    );

    expect(screen.queryByRole("link", { name: /RECA/i })).toBeNull();

    fireEvent.click(screen.getByTestId("hub-sidebar-toggle"));

    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
  });
  it("does not expose Empresas in the shell sidebar without admin role", () => {
    render(
      <HubShell
        initialUser={{
          email: "sara@reca.test",
          displayName: "Sara Zambrano",
          usuarioLogin: "sarazambrano",
          profesionalId: 7,
          roles: [],
        }}
        adminEntry={null}
        draftsControls={<button type="button">Borradores (0)</button>}
      >
        <p>Contenido formatos</p>
      </HubShell>
    );

    expect(screen.queryByRole("link", { name: /Empresas/i })).toBeNull();
  });

  it("exposes Empresas in the shell sidebar for admin users", () => {
    render(
      <HubShell
        initialUser={{
          email: "aaron@reca.test",
          displayName: "Aaron Vercel",
          usuarioLogin: "aaron_vercel",
          profesionalId: 1,
          roles: ["inclusion_empresas_admin"],
        }}
        adminEntry={null}
        draftsControls={<button type="button">Borradores (0)</button>}
      >
        <p>Contenido formatos</p>
      </HubShell>
    );

    expect(screen.getByRole("link", { name: /Empresas/i })).toBeTruthy();
  });

  it("exposes ODS in the shell sidebar for ods_operador users", () => {
    render(
      <HubShell
        initialUser={{
          email: "aaron@reca.test",
          displayName: "Aaron Vercel",
          usuarioLogin: "aaron_vercel",
          profesionalId: 30,
          roles: ["ods_operador"],
        }}
        adminEntry={null}
        draftsControls={<button type="button">Borradores (0)</button>}
      >
        <p>Contenido formatos</p>
      </HubShell>
    );

    const odsLink = screen.getByRole("link", { name: /ODS/i });
    expect(odsLink).toBeTruthy();
    expect(odsLink.getAttribute("href")).toBe("/hub/ods");
  });
});

describe("HubShell", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    pathnameMock.mockReturnValue("/hub");
  });

  it("persists the collapsed sidebar preference", async () => {
    render(
      <HubShell
        initialUser={{
          email: "sara@reca.test",
          displayName: "Sara Zambrano",
          usuarioLogin: "sarazambrano",
          profesionalId: 7,
          roles: [],
        }}
        adminEntry={null}
        draftsControls={<button type="button">Borradores (0)</button>}
      >
        <p>Contenido formatos</p>
      </HubShell>
    );

    fireEvent.click(screen.getByTestId("hub-sidebar-toggle"));

    await waitFor(() => {
      expect(window.localStorage.getItem(HUB_SIDEBAR_STORAGE_KEY)).toBe("true");
      expect(screen.getByTestId("hub-sidebar").getAttribute("data-collapsed")).toBe(
        "true"
      );
    });
  });

  it("restores the collapsed sidebar preference from localStorage", async () => {
    window.localStorage.setItem(HUB_SIDEBAR_STORAGE_KEY, "true");

    render(
      <HubShell
        initialUser={{
          email: "sara@reca.test",
          displayName: "Sara Zambrano",
          usuarioLogin: "sarazambrano",
          profesionalId: 7,
          roles: [],
        }}
        adminEntry={null}
        draftsControls={<button type="button">Borradores (0)</button>}
      >
        <p>Contenido formatos</p>
      </HubShell>
    );

    await waitFor(() => {
      expect(screen.getByTestId("hub-sidebar").getAttribute("data-collapsed")).toBe(
        "true"
      );
    });
  });
});
