// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentRole } from "@/hooks/useCurrentRole";

describe("useCurrentRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the current user roles from /api/auth/me", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        email: "sara@reca.test",
        displayName: "Sara Zambrano",
        usuarioLogin: "sarazambrano",
        profesionalId: 7,
        roles: ["inclusion_empresas_admin"],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCurrentRole());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", {
      credentials: "same-origin",
    });
    expect(result.current.displayName).toBe("Sara Zambrano");
    expect(result.current.roles).toEqual(["inclusion_empresas_admin"]);
    expect(result.current.hasRole("inclusion_empresas_admin")).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("uses initial data without fetching the current profile again", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useCurrentRole({
        initialData: {
          email: "aaron@reca.test",
          displayName: "Aaron Vercel",
          usuarioLogin: "aaron_vercel",
          profesionalId: 1,
          roles: ["inclusion_empresas_admin"],
        },
      })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.displayName).toBe("Aaron Vercel");
    expect(result.current.usuarioLogin).toBe("aaron_vercel");
    expect(result.current.roles).toEqual(["inclusion_empresas_admin"]);
    expect(result.current.hasRole("inclusion_empresas_admin")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the initial-data mode stable when parents recreate the object", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = renderHook(
      ({ displayName }) =>
        useCurrentRole({
          initialData: {
            email: "aaron@reca.test",
            displayName,
            usuarioLogin: "aaron_vercel",
            profesionalId: 1,
            roles: ["inclusion_empresas_admin"],
          },
        }),
      {
        initialProps: {
          displayName: "Aaron Vercel",
        },
      }
    );

    rerender({
      displayName: "Aaron Vercel",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("exposes an error state when the profile request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: "No autenticado.",
        }),
      })
    );

    const { result } = renderHook(() => useCurrentRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.roles).toEqual([]);
    expect(result.current.error).toBe("No autenticado.");
    expect(result.current.hasRole("inclusion_empresas_admin")).toBe(false);
  });
});
