// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEmpresaSearch } from "./useEmpresaSearch";

describe("useEmpresaSearch", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ items: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("fetches empresa matches through the server search endpoint", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        items: [
          {
            id: "empresa-1",
            nombre_empresa: "Empresa Uno SAS",
            nit_empresa: "900123456-1",
          },
        ],
      }),
    });
    const { result } = renderHook(() => useEmpresaSearch("Empresa Uno"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      await Promise.resolve();
    });

    expect(result.current.results).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/empresas/search?q=Empresa%20Uno",
      { method: "GET" }
    );
    expect(result.current.results[0]?.nit_empresa).toBe("900123456-1");
    expect(result.current.error).toBeNull();
  });

  it("does not fetch until the normalized query has at least two characters", async () => {
    const { result } = renderHook(() => useEmpresaSearch(" E "));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
    expect(result.current.showNoResults).toBe(false);
  });

  it("sets showNoResults only after an empty response resolves", async () => {
    const { result } = renderHook(() => useEmpresaSearch("ZZ"));

    expect(result.current.showNoResults).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      await Promise.resolve();
    });

    expect(result.current.showNoResults).toBe(true);
  });

  it("surfaces fetch failures without crashing consumers", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: vi.fn(),
    });
    const { result } = renderHook(() => useEmpresaSearch("Empresa"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      await Promise.resolve();
    });

    expect(result.current.error).toBe(
      "Error al buscar empresas. Intenta de nuevo."
    );
    expect(result.current.results).toEqual([]);
    expect(result.current.showNoResults).toBe(false);
  });
});
