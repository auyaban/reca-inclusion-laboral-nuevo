// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEmpresaSearch } from "./useEmpresaSearch";

const {
  createClientMock,
  fromMock,
  selectMock,
  isMock,
  ilikeMock,
  orderMock,
  limitMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  isMock: vi.fn(),
  ilikeMock: vi.fn(),
  orderMock: vi.fn(),
  limitMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: createClientMock,
}));

describe("useEmpresaSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    orderMock.mockReturnValue({
      limit: limitMock,
    });
    ilikeMock.mockReturnValue({
      order: orderMock,
    });
    isMock.mockReturnValue({
      ilike: ilikeMock,
    });
    selectMock.mockReturnValue({
      is: isMock,
    });
    fromMock.mockReturnValue({
      select: selectMock,
    });
    limitMock.mockResolvedValue({
      data: [],
      error: null,
    });
    createClientMock.mockReturnValue({
      from: fromMock,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("searches only active empresas for the autocomplete", async () => {
    renderHook(() => useEmpresaSearch("Empresa"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(limitMock).toHaveBeenCalledWith(20);
    expect(fromMock).toHaveBeenCalledWith("empresas");
    expect(isMock).toHaveBeenCalledWith("deleted_at", null);
    expect(ilikeMock).toHaveBeenCalledWith("nombre_empresa", "%Empresa%");
  });
});
