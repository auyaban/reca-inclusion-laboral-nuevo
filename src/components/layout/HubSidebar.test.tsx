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

  it("marks Empresas as active for nested empresas routes", () => {
    pathnameMock.mockReturnValue("/hub/empresas");

    render(
      <HubSidebar
        collapsed={false}
        mobileOpen={false}
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
        onCloseMobile={vi.fn()}
        onNavigate={vi.fn()}
        onToggleCollapsed={onToggleCollapsed}
      />
    );

    expect(screen.queryByRole("link", { name: /RECA/i })).toBeNull();

    fireEvent.click(screen.getByTestId("hub-sidebar-toggle"));

    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
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
