import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  empresaFromMock,
  empresaSelectMock,
  empresaEqMock,
  empresaIsMock,
  empresaLimitMock,
  empresaMaybeSingleMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  empresaFromMock: vi.fn(),
  empresaSelectMock: vi.fn(),
  empresaEqMock: vi.fn(),
  empresaIsMock: vi.fn(),
  empresaLimitMock: vi.fn(),
  empresaMaybeSingleMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: createClientMock,
}));

import {
  EMPRESA_SEARCH_FIELDS,
  EMPRESA_SELECT_FIELDS,
  getEmpresaById,
  parseEmpresaSnapshot,
} from "@/lib/empresa";

describe("empresa field selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    empresaLimitMock.mockReturnValue({
      maybeSingle: empresaMaybeSingleMock,
    });
    empresaIsMock.mockReturnValue({
      limit: empresaLimitMock,
    });
    empresaEqMock.mockReturnValue({
      is: empresaIsMock,
    });
    empresaSelectMock.mockReturnValue({
      eq: empresaEqMock,
    });
    empresaFromMock.mockReturnValue({
      select: empresaSelectMock,
    });
    empresaMaybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });
    createClientMock.mockReturnValue({
      from: empresaFromMock,
    });
  });

  it("includes zona_empresa in the lightweight search query", () => {
    expect(EMPRESA_SEARCH_FIELDS).toContain("zona_empresa");
    expect(EMPRESA_SEARCH_FIELDS).toContain("sede_empresa");
  });

  it("preserves zona_empresa when parsing full snapshots", () => {
    const snapshot = parseEmpresaSnapshot({
      id: "empresa-1",
      nombre_empresa: "ACME SAS",
      nit_empresa: "900123456",
      sede_empresa: "Sede Norte",
      zona_empresa: "Zona Centro",
    });

    expect(EMPRESA_SELECT_FIELDS).toContain("zona_empresa");
    expect(snapshot?.zona_empresa).toBe("Zona Centro");
    expect(snapshot?.sede_empresa).toBe("Sede Norte");
  });

  it("excludes soft-deleted empresas when loading a selected empresa", async () => {
    await expect(getEmpresaById("empresa-1")).resolves.toBeNull();

    expect(empresaFromMock).toHaveBeenCalledWith("empresas");
    expect(empresaEqMock).toHaveBeenCalledWith("id", "empresa-1");
    expect(empresaIsMock).toHaveBeenCalledWith("deleted_at", null);
    expect(empresaLimitMock).toHaveBeenCalledWith(1);
  });
});
